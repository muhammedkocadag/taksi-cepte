// Firestore kurallarının testleri (yerel emülatör). Çalıştırma: firebase/ içinde `npm test`.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env;
const now = Date.now();

const shift = (o = {}) => ({ start: now, end: null, km: null, updated_at: now, deleted: false, ...o });
const entry = (o = {}) => ({ shift_id: 's1', at: now, category: 'Nakit', amount: 750, updated_at: now, deleted: false, ...o });
const vehicle = (o = {}) => ({
  plate: '06 ABC 123', model: 'Fiat Egea', year: 2022, fuel: 'Benzin/LPG', odo: 148500, odo_at: now,
  svc_last: null, svc_int: 10000, muayene: null, sigorta: null, updated_at: now, deleted: false, ...o,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-taksi-cepte',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const ali = () => env.authenticatedContext('ali').firestore();
const veli = () => env.authenticatedContext('veli').firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('kendi verisi', () => {
  it('şoför kendi vardiyasını, kaydını ve aracını yazar ve okur', async () => {
    const db = ali();
    await assertSucceeds(setDoc(doc(db, 'users/ali/shifts/s1'), shift()));
    await assertSucceeds(setDoc(doc(db, 'users/ali/entries/e1'), entry()));
    await assertSucceeds(setDoc(doc(db, 'users/ali/vehicle/me'), vehicle()));
    await assertSucceeds(setDoc(doc(db, 'users/ali'), { name: 'Ali', il: 'Ankara', settings: { theme: 'dark' }, updated_at: now }));
    await assertSucceeds(getDoc(doc(db, 'users/ali/entries/e1')));
  });

  it('vardiyayı bitirir (end + km) ve kaydı yumuşak siler', async () => {
    const db = ali();
    await setDoc(doc(db, 'users/ali/shifts/s1'), shift());
    await assertSucceeds(updateDoc(doc(db, 'users/ali/shifts/s1'), { end: now + 3600e3, km: 245, updated_at: now + 1 }));
    await setDoc(doc(db, 'users/ali/entries/e1'), entry());
    await assertSucceeds(updateDoc(doc(db, 'users/ali/entries/e1'), { deleted: true, updated_at: now + 2 }));
  });

  it('hesabı silerken belgelerini gerçekten siler', async () => {
    const db = ali();
    await setDoc(doc(db, 'users/ali/entries/e1'), entry());
    await assertSucceeds(deleteDoc(doc(db, 'users/ali/entries/e1')));
  });
});

describe('başkasının verisi', () => {
  it('başka şoförün kayıtlarını okuyamaz ve yazamaz', async () => {
    await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'users/ali/entries/e1'), entry()));
    await assertFails(getDoc(doc(veli(), 'users/ali/entries/e1')));
    await assertFails(setDoc(doc(veli(), 'users/ali/entries/e2'), entry()));
    await assertFails(deleteDoc(doc(veli(), 'users/ali/entries/e1')));
  });

  it('giriş yapmamış kimse hiçbir şeye erişemez', async () => {
    await assertFails(getDoc(doc(anon(), 'users/ali')));
    await assertFails(setDoc(doc(anon(), 'users/ali/entries/e1'), entry()));
    await assertFails(getDoc(doc(anon(), 'events/x')));
  });
});

describe('biçim denetimi', () => {
  const bad = [
    ['eksi tutar', entry({ amount: -5 })],
    ['sıfır tutar', entry({ amount: 0 })],
    ['çok büyük tutar', entry({ amount: 1000000 })],
    ['küsuratlı tutar', entry({ amount: 12.5 })],
    ['metin tutar', entry({ amount: '750' })],
    ['uydurma kategori', entry({ category: 'Bahşiş' })],
    ['eksik alan', (({ at, ...rest }) => rest)(entry())],
    ['fazladan alan', entry({ not: 'x' })],
    ['eşitleme alanı yok', (({ updated_at, ...rest }) => rest)(entry())],
  ];
  for (const [name, data] of bad)
    it(`kayıt reddedilir: ${name}`, async () => assertFails(setDoc(doc(ali(), 'users/ali/entries/e1'), data)));

  it('vardiyada saçma km reddedilir', async () => assertFails(setDoc(doc(ali(), 'users/ali/shifts/s1'), shift({ km: 99999 }))));
  it('araç sadece "me" belgesine yazılır', async () => assertFails(setDoc(doc(ali(), 'users/ali/vehicle/ikinci'), vehicle())));
  it('profilde bilinmeyen alan reddedilir', async () =>
    assertFails(setDoc(doc(ali(), 'users/ali'), { name: 'Ali', il: 'Ankara', updated_at: now, admin: true })));
});

describe('eşitleme sırası', () => {
  it('eski zaman damgalı güncelleme reddedilir, yenisi ve aynısı kabul edilir', async () => {
    const db = ali();
    await setDoc(doc(db, 'users/ali/entries/e1'), entry({ amount: 999, updated_at: now + 100 }));
    await assertFails(setDoc(doc(db, 'users/ali/entries/e1'), entry({ amount: 111, updated_at: now + 50 })));
    await assertSucceeds(setDoc(doc(db, 'users/ali/entries/e1'), entry({ amount: 999, updated_at: now + 100 })));
    await assertSucceeds(setDoc(doc(db, 'users/ali/entries/e1'), entry({ amount: 500, updated_at: now + 200 })));
  });
  it('vardiya, araç ve profil için de geçerli', async () => {
    const db = ali();
    await setDoc(doc(db, 'users/ali/shifts/s1'), shift({ updated_at: now + 100 }));
    await assertFails(setDoc(doc(db, 'users/ali/shifts/s1'), shift({ updated_at: now })));
    await setDoc(doc(db, 'users/ali/vehicle/me'), vehicle({ updated_at: now + 100 }));
    await assertFails(setDoc(doc(db, 'users/ali/vehicle/me'), vehicle({ updated_at: now })));
    await setDoc(doc(db, 'users/ali'), { name: 'Ali', il: 'Ankara', settings: {}, updated_at: now + 100 });
    await assertFails(setDoc(doc(db, 'users/ali'), { name: 'Eski', il: 'Ankara', settings: {}, updated_at: now }));
  });
});

describe('etkinlikler ve diğer yerler', () => {
  it('giriş yapan şoför etkinlikleri okur ama yazamaz', async () => {
    await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'events/e1'), { title: 'Maç' }));
    await assertSucceeds(getDoc(doc(ali(), 'events/e1')));
    await assertFails(setDoc(doc(ali(), 'events/e2'), { title: 'Sahte' }));
  });

  it('tanımsız koleksiyonlar kapalı', async () => {
    await assertFails(setDoc(doc(ali(), 'baska/x'), { a: 1 }));
    await assertFails(getDoc(doc(ali(), 'baska/x')));
  });
});
