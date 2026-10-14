import type { SQLiteDatabase } from 'expo-sqlite';

// Bu telefondan SMS kodu isteme sınırı (kullanıcı istedi): iki istek arası en az 60 sn, 24 saatte en fazla 5.
// Numara değiştirmek, geri dönmek, uygulamayı kapatıp açmak ya da çıkış yapmak sayacı sıfırlamaz (`smsLog`
// ayarı wipeAll'da silinmez, buluta da gitmez). Bot korumasının asıl kısmı sunucuda: SMS bölgesi sadece +90,
// Firebase'in kendi hız sınırları, App Check.
export const SMS_GAP_S = 60;
const DAY_MAX = __DEV__ ? 50 : 5; // geliştirirken (test numarası denemeleri) bol
const DAY_MS = 24 * 3_600_000;

function log(db: SQLiteDatabase, now: number): number[] {
  const r = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'smsLog'");
  try {
    const list = JSON.parse(r?.value ?? '[]');
    return Array.isArray(list) ? list.filter((t): t is number => typeof t === 'number' && t > now - DAY_MS) : [];
  } catch {
    return [];
  }
}

// Şimdi kod istenebilir mi? wait: kaç saniye beklemeli (0 = hemen); dayFull: günlük sınır doldu.
export function smsStatus(db: SQLiteDatabase, now = Date.now()) {
  const list = log(db, now);
  const last = list.length ? Math.max(...list) : 0;
  const wait = Math.max(0, Math.ceil((last + SMS_GAP_S * 1000 - now) / 1000));
  return { wait, dayFull: list.length >= DAY_MAX };
}

export function recordSms(db: SQLiteDatabase, now = Date.now()) {
  const list = [...log(db, now), now];
  db.runSync(
    `INSERT INTO settings (key, value, updated_at) VALUES ('smsLog', ?, 0)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [JSON.stringify(list)],
  );
}
