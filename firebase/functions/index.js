// Taksi Cepte sunucu fonksiyonları (Firebase Cloud Functions, Blaze plan). Yayın: firebase/ içinde
// `npx firebase deploy --only functions --project taksi-cepte-9c4ac`. Test: `npm run test:functions` (emülatör).
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

// Hesap silme (Apple ve Google Play zorunlu kılıyor; KVKK ve /hesap-silme sayfasında söz verildi).
// Uygulama "Authorization: Bearer <Firebase kimlik belgesi>" ile POST eder (src/store/account.ts → deleteCloudAccount).
// Sunucu belgeyi doğrular ve SADECE o kişinin verisini siler: users/{uid} ve altındaki vardiya, kayıt ve araç,
// accounts/{uid} (panel kaydı) ve Firebase hesabının kendisi. Neden sunucuda: Firebase, hesabı uygulamadan silmek
// için son birkaç dakikada giriş yapılmış olmasını ister; şoförden yeniden SMS kodu istemeyelim.
export const hesabiSil = onRequest({ region: 'europe-west3', maxInstances: 3, timeoutSeconds: 60 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('POST');
    return;
  }
  const m = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
  if (!m) {
    res.status(401).send('kimlik yok');
    return;
  }
  let uid;
  try {
    uid = (await getAuth().verifyIdToken(m[1])).uid;
  } catch {
    res.status(401).send('kimlik geçersiz');
    return;
  }

  const db = getFirestore();
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.doc(`accounts/${uid}`).delete();
  try {
    await getAuth().deleteUser(uid);
  } catch (e) {
    if (e?.code !== 'auth/user-not-found') throw e;
  }
  res.status(204).send();
});
