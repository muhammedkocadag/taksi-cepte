import type { SQLiteDatabase } from 'expo-sqlite';

// Bulut eşitlemesi (Firebase'den bağımsız "beyin"). Kayıtlar önce telefona yazılır; bu modül
// son eşitlemeden beri değişen satırları buluta gönderir, buluttaki yenileri telefona alır.
// Çakışmada "en son değişen kazanır" (updated_at). Silme yumuşaktır (deleted), böylece silmeler de eşitlenir.
// Bulutla konuşan kısım `Cloud` arayüzü: testte sahte bulut, uygulamada Firebase (src/lib/cloud.ts).
// Firestore kuralları ve alan adları: firebase/firestore.rules (ikisi birlikte değişmeli).

export type Table = 'shifts' | 'entries' | 'vehicle';
export const TABLES: Table[] = ['shifts', 'vehicle', 'entries'];

export type CloudRow = { id: string; updated_at: number; deleted: boolean; [k: string]: unknown };
export type ProfileDoc = { name: string; il: string; settings: Record<string, string>; updated_at: number };

export interface Cloud {
  push(table: Table, rows: CloudRow[]): Promise<void>;
  pull(table: Table, since: number): Promise<CloudRow[]>;
  pushProfile(doc: ProfileDoc): Promise<void>;
  pullProfile(): Promise<ProfileDoc | null>;
}

// Satırların veri sütunları (id, updated_at, deleted dışında).
const COLS: Record<Table, string[]> = {
  shifts: ['start', 'end', 'km'],
  entries: ['shift_id', 'at', 'category', 'amount'],
  vehicle: ['plate', 'model', 'year', 'fuel', 'odo', 'odo_at', 'svc_last', 'svc_int', 'muayene', 'sigorta'],
};

// Sadece bu cihaza ait ayarlar buluta gitmez.
const LOCAL_KEYS = new Set(['signedIn', 'phone', 'syncPushAt', 'syncPullAt']);
const PROFILE_KEYS = new Set(['name', 'il']);

// Başka cihazın saati biraz geride olabilir; çekerken geriye doğru pay bırakılır (tekrar uygulamak zararsız).
export const PULL_OVERLAP_MS = 24 * 3_600_000;

type Row = Record<string, unknown> & { id: string; updated_at: number; deleted: number };

export function localChanges(db: SQLiteDatabase, table: Table, since: number): CloudRow[] {
  const rows = db.getAllSync<Row>(`SELECT * FROM ${table} WHERE updated_at >= ?`, [since]);
  return rows.map((r) => {
    const out: CloudRow = { id: r.id, updated_at: r.updated_at, deleted: r.deleted === 1 };
    for (const c of COLS[table]) out[c] = r[c] ?? null;
    return out;
  });
}

// Gelen satırı ancak telefondakinden daha yeniyse yazar (en son değişen kazanır). Uygulanan satır sayısını döner.
export function applyRemote(db: SQLiteDatabase, table: Table, rows: CloudRow[]): number {
  let applied = 0;
  const cols = ['id', ...COLS[table], 'updated_at', 'deleted'];
  const sql =
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ` +
    `ON CONFLICT(id) DO UPDATE SET ${cols.slice(1).map((c) => `${c} = excluded.${c}`).join(', ')} ` +
    `WHERE excluded.updated_at > ${table}.updated_at`;
  db.withTransactionSync(() => {
    for (const r of rows) {
      const values = cols.map((c) => (c === 'deleted' ? (r.deleted ? 1 : 0) : (r[c] ?? null)));
      const res = db.runSync(sql, values as (string | number | null)[]);
      applied += res.changes;
    }
  });
  return applied;
}

type SettingRow = { key: string; value: string; updated_at: number };

export function profileChanges(db: SQLiteDatabase, since: number): ProfileDoc | null {
  const rows = db.getAllSync<SettingRow>('SELECT key, value, updated_at FROM settings').filter((r) => !LOCAL_KEYS.has(r.key));
  if (!rows.some((r) => r.updated_at >= since)) return null;
  const doc: ProfileDoc = { name: '', il: '', settings: {}, updated_at: 0 };
  for (const r of rows) {
    if (r.key === 'name') doc.name = r.value;
    else if (r.key === 'il') doc.il = r.value;
    else doc.settings[r.key] = r.value;
    doc.updated_at = Math.max(doc.updated_at, r.updated_at);
  }
  return doc;
}

// Bulut profili telefondakinden yeniyse bütün alanları yazar. Değişti mi döner.
export function applyRemoteProfile(db: SQLiteDatabase, doc: ProfileDoc): boolean {
  const local = db.getFirstSync<{ m: number | null }>(
    `SELECT MAX(updated_at) AS m FROM settings WHERE key NOT IN (${[...LOCAL_KEYS].map(() => '?').join(', ')})`,
    [...LOCAL_KEYS],
  );
  if ((local?.m ?? 0) >= doc.updated_at) return false;
  const values: Record<string, string> = { ...doc.settings, name: doc.name, il: doc.il };
  db.withTransactionSync(() => {
    for (const [key, value] of Object.entries(values)) {
      if (LOCAL_KEYS.has(key) || (typeof value !== 'string' && !PROFILE_KEYS.has(key))) continue;
      db.runSync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, String(value), doc.updated_at],
      );
    }
  });
  return true;
}

function getMarker(db: SQLiteDatabase, key: string) {
  const r = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return r ? Number(r.value) || 0 : 0;
}

function setMarker(db: SQLiteDatabase, key: string, value: number) {
  db.runSync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, 0)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)],
  );
}

export type SyncResult = { pushed: number; pulled: number };

// Bir eşitleme turu: önce gönder, sonra çek. `pulled` > 0 ise ekranlar veritabanından yeniden yüklenmeli.
export async function syncOnce(db: SQLiteDatabase, cloud: Cloud, now = Date.now()): Promise<SyncResult> {
  const pushAt = getMarker(db, 'syncPushAt');
  const pullAt = getMarker(db, 'syncPullAt');
  let pushed = 0;
  let pulled = 0;

  for (const t of TABLES) {
    const rows = localChanges(db, t, pushAt);
    if (rows.length) {
      await cloud.push(t, rows);
      pushed += rows.length;
    }
  }
  const prof = profileChanges(db, pushAt);
  if (prof) {
    await cloud.pushProfile(prof);
    pushed++;
  }
  // Gönderme tamam: bu turdan sonra değişenler (updated_at >= now) bir sonraki turda gider.
  setMarker(db, 'syncPushAt', now);

  let newest = pullAt;
  const since = Math.max(0, pullAt - PULL_OVERLAP_MS);
  for (const t of TABLES) {
    const rows = await cloud.pull(t, since);
    pulled += applyRemote(db, t, rows);
    for (const r of rows) newest = Math.max(newest, r.updated_at);
  }
  const remote = await cloud.pullProfile();
  if (remote && applyRemoteProfile(db, remote)) pulled++;
  setMarker(db, 'syncPullAt', newest);

  return { pushed, pulled };
}
