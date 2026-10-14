// Sunucu fonksiyonlarının testi (emülatör: auth + firestore + functions). Çalıştırma: firebase/ içinde
// `npm run test:functions`.
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = 'demo-taksi-cepte';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const FN = `http://127.0.0.1:5001/${PROJECT}/europe-west3/hesabiSil`;

initializeApp({ projectId: PROJECT });
const db = getFirestore();

// Emülatörde kullanıcı açıp kimlik belgesi al (gerçek SMS yok).
async function kullanici() {
  const r = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const j = await r.json();
  return { uid: j.localId, token: j.idToken };
}

async function veriYaz(uid) {
  const now = Date.now();
  await db.doc(`users/${uid}`).set({ name: 'X', il: 'Ankara', settings: {}, updated_at: now });
  await db.doc(`users/${uid}/shifts/s1`).set({ start: now, end: null, km: null, updated_at: now, deleted: false });
  await db.doc(`users/${uid}/entries/e1`).set({ shift_id: 's1', at: now, category: 'Nakit', amount: 500, updated_at: now, deleted: false });
  await db.doc(`users/${uid}/vehicle/me`).set({ plate: '06 T 1234', updated_at: now, deleted: false });
  await db.doc(`accounts/${uid}`).set({ phone: '+905000000000', platform: 'ios', created_at: now, last_seen: now });
}

const sil = (token, method = 'POST') =>
  fetch(FN, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} });

const var_mi = async (path) => (await db.doc(path).get()).exists;

describe('hesabiSil', () => {
  let ali;
  let veli;
  before(async () => {
    ali = await kullanici();
    veli = await kullanici();
    await veriYaz(ali.uid);
    await veriYaz(veli.uid);
  });

  it('kimliksiz, sahte kimlikli ve GET istekleri reddedilir, hiçbir şey silinmez', async () => {
    assert.equal((await sil(null)).status, 401);
    assert.equal((await sil('sahte.belge.123')).status, 401);
    assert.equal((await sil(ali.token, 'GET')).status, 405);
    assert.ok(await var_mi(`users/${ali.uid}/entries/e1`));
  });

  it('sahibinin bütün verisini ve hesabını siler; başkasınınkine dokunmaz', async () => {
    assert.equal((await sil(ali.token)).status, 204);
    for (const p of ['', '/shifts/s1', '/entries/e1', '/vehicle/me']) assert.equal(await var_mi(`users/${ali.uid}${p}`), false, p);
    assert.equal(await var_mi(`accounts/${ali.uid}`), false);
    await assert.rejects(getAuth().getUser(ali.uid), (e) => e.code === 'auth/user-not-found');

    assert.ok(await var_mi(`users/${veli.uid}/entries/e1`));
    assert.ok(await var_mi(`accounts/${veli.uid}`));
    assert.ok(await getAuth().getUser(veli.uid));
  });
});
