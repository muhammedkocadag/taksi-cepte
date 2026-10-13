// Firestore kurallarının testleri (yerel emülatör). Çalıştırma: firebase/ içinde `npm test`.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

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
// Şoför telefonla girer (token'da doğrulanmış numara), yönetici Google hesabıyla (doğrulanmış e-posta).
const aliTel = () => env.authenticatedContext('ali', { phone_number: '+905321234567' }).firestore();
const ADMIN = 'muhammedkocadag2003@gmail.com';
const yonetici = () => env.authenticatedContext('panel', { email: ADMIN, email_verified: true }).firestore();
const account = (o = {}) => ({ phone: '+905321234567', platform: 'ios', os: '18.2', model: 'iPhone 15', app: '1.0.0', created_at: now, last_seen: now, ...o });

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

describe('hesap kaydı ve yönetim paneli', () => {
  it('şoför kendi hesap kaydını doğrulanmış numarasıyla yazar, son girişi günceller', async () => {
    const db = aliTel();
    await assertSucceeds(setDoc(doc(db, 'accounts/ali'), account()));
    await assertSucceeds(updateDoc(doc(db, 'accounts/ali'), { last_seen: now + 1000, app: '1.0.1' }));
    await assertSucceeds(getDoc(doc(db, 'accounts/ali')));
  });

  it('uydurma numara, kayıt tarihini değiştirme, başkasının kaydı ve tanımsız alan reddedilir', async () => {
    await assertFails(setDoc(doc(aliTel(), 'accounts/ali'), account({ phone: '+905009999999' })));
    await assertFails(setDoc(doc(ali(), 'accounts/ali'), account())); // token'da numara yok
    await setDoc(doc(aliTel(), 'accounts/ali'), account());
    await assertFails(updateDoc(doc(aliTel(), 'accounts/ali'), { created_at: now - 1 }));
    await assertFails(setDoc(doc(aliTel(), 'accounts/veli'), account()));
    await assertFails(setDoc(doc(aliTel(), 'accounts/ali'), account({ platform: 'windows' })));
    await assertFails(setDoc(doc(aliTel(), 'accounts/ali'), account({ konum: '39.9,32.8' })));
    await assertFails(getDoc(doc(veli(), 'accounts/ali')));
  });

  it('yönetici hesap kayıtlarını, profilleri ve araçları listeler', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      const f = c.firestore();
      await setDoc(doc(f, 'accounts/ali'), account());
      await setDoc(doc(f, 'users/ali'), { name: 'Ali', il: 'Ankara', settings: {}, updated_at: now });
      await setDoc(doc(f, 'users/ali/vehicle/me'), vehicle());
    });
    const db = yonetici();
    await assertSucceeds(getDocs(collection(db, 'accounts')));
    await assertSucceeds(getDocs(collection(db, 'users')));
    await assertSucceeds(getDocs(collectionGroup(db, 'vehicle')));
  });

  it('yönetici şoförlerin kazanç ve vardiya kayıtlarını OKUYAMAZ, hiçbir şey yazamaz', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'users/ali/entries/e1'), entry());
      await setDoc(doc(c.firestore(), 'users/ali/shifts/s1'), shift());
    });
    const db = yonetici();
    await assertFails(getDoc(doc(db, 'users/ali/entries/e1')));
    await assertFails(getDocs(collectionGroup(db, 'entries')));
    await assertFails(getDoc(doc(db, 'users/ali/shifts/s1')));
    await assertFails(setDoc(doc(db, 'accounts/ali'), account()));
    await assertFails(setDoc(doc(db, 'users/ali'), { name: 'X', il: 'Ankara', settings: {}, updated_at: now }));
  });

  it('başka Google hesabı, doğrulanmamış e-posta ve şoförler paneli okuyamaz', async () => {
    const baska = env.authenticatedContext('x', { email: 'baska@gmail.com', email_verified: true }).firestore();
    const dogrulanmamis = env.authenticatedContext('y', { email: ADMIN, email_verified: false }).firestore();
    for (const db of [baska, dogrulanmamis, aliTel()]) {
      await assertFails(getDocs(collection(db, 'accounts')));
      await assertFails(getDocs(collection(db, 'users')));
      await assertFails(getDocs(collectionGroup(db, 'vehicle')));
    }
  });
});
