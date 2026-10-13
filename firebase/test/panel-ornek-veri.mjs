// Panel denemesi için emülatöre SAHTE kullanıcılar yazar (gerçek veritabanına asla: emülatör adresi zorunlu).
// Önce `npm run panel:emulator`, sonra başka pencerede `npm run panel:ornek`.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8085';
if (!/^(127\.0\.0\.1|localhost):/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('Sadece emülatör');
const db = getFirestore(initializeApp({ projectId: 'demo-taksi-cepte' }));

const H = 3_600_000;
const now = Date.now();
const kisiler = [
  ['Ahmet Yılmaz', 'Ankara', 'ios', 'iPhone 15', '18.2', 'Fiat Egea', 2022, 'Benzin/LPG', 2 * H, 0.2 * H],
  ['Mehmet Demir', 'Ankara', 'android', 'Galaxy A54', '14', 'Toyota Corolla', 2021, 'Hibrit', 5 * H, 3 * H],
  ['Hasan Kaya', 'İstanbul', 'android', 'Redmi Note 12', '13', 'Renault Clio', 2019, 'Dizel', 30 * H, 26 * H],
  ['Mustafa Çelik', 'Ankara', 'ios', 'iPhone 13', '17.6', 'Hyundai i20', 2020, 'Benzin', 3 * 24 * H, 1 * H],
  ['Ali Şahin', 'İzmir', 'android', 'Galaxy S23', '14', 'Fiat Egea', 2023, 'Benzin/LPG', 6 * 24 * H, 5 * 24 * H],
  ['Hüseyin Arslan', 'Ankara', 'ios', 'iPhone 12', '17.2', 'Dacia Sandero', 2018, 'LPG', 12 * 24 * H, 9 * 24 * H],
  ['<b>Deneme</b> Kötü İsim', 'Ankara', 'android', 'Pixel 7', '14', 'Skoda Octavia', 2017, 'Dizel', 20 * 24 * H, 20 * 24 * H],
];
const batch = db.batch();
kisiler.forEach(([name, il, platform, model, os, car, year, fuel, kayit, son], i) => {
  const uid = `ornek${i + 1}`;
  batch.set(db.doc(`accounts/${uid}`), {
    phone: `+90555000${String(1000 + i).slice(1)}0`, platform, os, model, app: '1.0.0', created_at: now - kayit, last_seen: now - son,
  });
  batch.set(db.doc(`users/${uid}`), { name, il, settings: {}, updated_at: now - son });
  batch.set(db.doc(`users/${uid}/vehicle/me`), {
    plate: '06 ABC 123', model: car, year, fuel, odo: 100000 + i * 13000, odo_at: now, svc_last: null, svc_int: 10000,
    muayene: null, sigorta: null, updated_at: now, deleted: false,
  });
  batch.set(db.doc(`users/${uid}/entries/gizli`), { shift_id: 's', at: now, category: 'Nakit', amount: 999, updated_at: now, deleted: false });
});
// Profili olup hesap kaydı olmayan (eski sürüm) kullanıcı da görünmeli.
batch.set(db.doc('users/eski'), { name: 'Eski Sürüm Kullanıcı', il: 'Ankara', settings: {}, updated_at: now });
await batch.commit();
console.log(`${kisiler.length + 1} sahte kullanıcı emülatöre yazıldı.`);
