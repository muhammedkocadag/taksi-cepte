import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  query,
  setDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import type { DeviceInfo } from '@/lib/deviceInfo';
import type { EventDoc } from '@/lib/events';
import type { Cloud, CloudRow, ProfileDoc, Table } from '@/store/sync';

// Eşitleme beyninin (src/store/sync.ts) Firebase'e bağlanan ince katmanı.
//
// DİKKAT: React Native Firebase kullanır; **Expo Go'da çalışmaz**. Bu dosya sadece development/production
// derlemesinde, Expo Go kontrolünden sonra yüklenmeli (statik import etme; bkz. CLAUDE.md).
//
// Neden böyle:
// - Okumalar doğrudan SUNUCUDAN (getDocsFromServer): Firebase'in önbelleği eksik veri döndürürse
//   eşitleme "her şeyi aldım" sanıp işaretini ilerletirdi.
// - Yazmalara süre sınırı: internet yokken Firebase yazmayı sonsuza kadar bekletir; eşitleme turu askıda kalmasın.
// - Belgeler tek tek yazılır: kurallar eski güncellemeyi reddeder (permission-denied). Bu beklenen bir durumdur
//   ve diğer satırları etkilememeli. Ağ hatası gibi başka bir hata ise turu iptal eder (işaretler ilerlemez).

const TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('cloud-timeout')), TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const isRejectedByRules = (e: unknown) => (e as { code?: string })?.code === 'firestore/permission-denied';

export function firebaseCloud(uid: string): Cloud {
  const db = getFirestore();
  const col = (t: Table) => collection(db, 'users', uid, t);

  return {
    async push(t, rows) {
      const results = await Promise.allSettled(
        rows.map(({ id, ...data }) => withTimeout(setDoc(doc(col(t), id), data))),
      );
      const hard = results.find((r) => r.status === 'rejected' && !isRejectedByRules(r.reason));
      if (hard && hard.status === 'rejected') throw hard.reason;
    },

    async pull(t, since) {
      const snap = await withTimeout(getDocsFromServer(query(col(t), where('updated_at', '>', since))));
      return snap.docs.map((d) => ({ ...(d.data() as Omit<CloudRow, 'id'>), id: d.id }) as CloudRow);
    },

    async pushProfile(p: ProfileDoc) {
      try {
        await withTimeout(setDoc(doc(db, 'users', uid), p));
      } catch (e) {
        if (!isRejectedByRules(e)) throw e;
      }
    },

    async pullProfile() {
      const s = await withTimeout(getDocFromServer(doc(db, 'users', uid)));
      return s.exists() ? (s.data() as ProfileDoc) : null;
    },
  };
}

// Yönetim paneli için hesap kaydı (`accounts/{uid}`): ilk girişte oluşturulur, sonra açılışlarda en çok
// 6 saatte bir son giriş ve cihaz bilgisi güncellenir. Telefon (SMS girişi) ya da e-posta (Apple ile giriş)
// Firebase Auth'taki doğrulanmış değerdir; kurallar başka değeri reddeder.
const SEEN_EVERY_MS = 6 * 3_600_000;

export async function touchAccount(user: { uid: string; phone: string; email: string; provider: string }, info: DeviceInfo, now = Date.now()) {
  const ref = doc(getFirestore(), 'accounts', user.uid);
  const snap = await withTimeout(getDocFromServer(ref));
  const old = snap.exists() ? (snap.data() as { created_at: number; last_seen: number } & DeviceInfo) : null;
  if (old && now - old.last_seen < SEEN_EVERY_MS && old.app === info.app && old.os === info.os) return;
  const id = { phone: user.phone, email: user.email, provider: user.provider };
  await withTimeout(setDoc(ref, { ...id, ...info, created_at: old?.created_at ?? now, last_seen: now }));
}

// Hesap silme, sunucu fonksiyonu yokken (fatura hesabı kapalı: Cloud Functions çalışmaz) uygulamanın kendisinden:
// kurallar sahibine kendi belgelerini silme izni veriyor. Önce alt koleksiyonlar, sonra profil ve panel kaydı.
// Firebase hesabının kendisi authFirebase.deleteUser ile silinir (yakın zamanda giriş yapılmamışsa Firebase reddeder).
export async function deleteMyData(uid: string) {
  const db = getFirestore();
  for (const t of ['entries', 'shifts', 'vehicle'] as Table[]) {
    const snap = await withTimeout(getDocsFromServer(col(db, uid, t)));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
      await withTimeout(batch.commit());
    }
  }
  const batch = writeBatch(db);
  batch.delete(doc(db, 'accounts', uid));
  batch.delete(doc(db, 'users', uid));
  await withTimeout(batch.commit());
}

const col = (db: ReturnType<typeof getFirestore>, uid: string, t: Table) => collection(db, 'users', uid, t);

// Şehrin bitmemiş etkinlikleri (Firestore `events`, gece görevi yazar; kurallar: giriş yapan okur).
// Tek alanlı filtre (end > şimdi) kendiliğinden dizinli; şehir uygulamada süzülür (birleşik dizin gerekmesin).
export async function fetchEvents(city: string, now = Date.now()): Promise<EventDoc[]> {
  const snap = await withTimeout(getDocsFromServer(query(collection(getFirestore(), 'events'), where('end', '>', now))));
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<EventDoc, 'id'> & { city?: string }), id: d.id }))
    .filter((e) => e.city === city)
    .map(({ id, cat, title, venue, start, end, demand }) => ({ id, cat, title, venue, start, end, demand }));
}
