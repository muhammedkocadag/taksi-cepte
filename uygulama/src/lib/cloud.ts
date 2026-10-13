import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  query,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

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
