import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, Entry, Shift } from './shift';

// Telefon içindeki veritabanı. Firebase gelince buradaki kayıtlar buluta eşitlenecek;
// bunun için her satırda updated_at ve silinenler için deleted bayrağı tutuluyor.
const SCHEMA_VERSION = 3;

export function migrate(db: SQLiteDatabase) {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;

  if (version < 1) db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY NOT NULL,
      start INTEGER NOT NULL,
      end INTEGER,
      km INTEGER,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY NOT NULL,
      shift_id TEXT NOT NULL,
      at INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS entries_shift ON entries (shift_id);
  `);
  // Bir kullanıcıya bir araç: tek satır.
  if (version < 2) db.execSync(`
    CREATE TABLE IF NOT EXISTS vehicle (
      id TEXT PRIMARY KEY NOT NULL,
      plate TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      year INTEGER,
      fuel TEXT NOT NULL DEFAULT '',
      odo INTEGER NOT NULL,
      odo_at INTEGER NOT NULL,
      svc_last INTEGER,
      svc_int INTEGER NOT NULL DEFAULT 10000,
      muayene INTEGER,
      sigorta INTEGER,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
  `);
  // Profil ve ayarlar: anahtar → değer (ad, il, telefon, tema, hedef...).
  if (version < 3) db.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

// Hesap silme: telefondaki bütün kayıtlar gerçekten silinir (Firebase gelince buluttakiler de).
export function wipeAll(db: SQLiteDatabase) {
  // smsLog (SMS isteme sınırı, src/lib/smsLimit.ts) cihaza aittir: çıkışta ve hesap silmede sıfırlanmaz.
  db.execSync("DELETE FROM entries; DELETE FROM shifts; DELETE FROM vehicle; DELETE FROM settings WHERE key <> 'smsLog';");
}

export function loadSettings(db: SQLiteDatabase): Record<string, string> {
  const rows = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function saveSettings(db: SQLiteDatabase, values: Record<string, string>) {
  const now = Date.now();
  db.withTransactionSync(() => {
    for (const [key, value] of Object.entries(values))
      db.runSync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value, now],
      );
  });
}

export type Vehicle = {
  plate: string;
  model: string;
  year: number | null;
  fuel: string;
  odo: number;
  odoAt: number;
  svcLast: number | null; // son genel bakım km'si
  svcInt: number; // bakım aralığı km
  muayene: number | null; // bitiş tarihleri
  sigorta: number | null;
};

const VEHICLE_ID = 'me';

export function loadVehicle(db: SQLiteDatabase): Vehicle | null {
  const r = db.getFirstSync<{
    plate: string;
    model: string;
    year: number | null;
    fuel: string;
    odo: number;
    odo_at: number;
    svc_last: number | null;
    svc_int: number;
    muayene: number | null;
    sigorta: number | null;
  }>('SELECT * FROM vehicle WHERE id = ? AND deleted = 0', [VEHICLE_ID]);
  if (!r) return null;
  return {
    plate: r.plate,
    model: r.model,
    year: r.year,
    fuel: r.fuel,
    odo: r.odo,
    odoAt: r.odo_at,
    svcLast: r.svc_last,
    svcInt: r.svc_int,
    muayene: r.muayene,
    sigorta: r.sigorta,
  };
}

export function saveVehicle(db: SQLiteDatabase, v: Vehicle) {
  db.runSync(
    `INSERT INTO vehicle (id, plate, model, year, fuel, odo, odo_at, svc_last, svc_int, muayene, sigorta, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET plate = excluded.plate, model = excluded.model, year = excluded.year,
       fuel = excluded.fuel, odo = excluded.odo, odo_at = excluded.odo_at, svc_last = excluded.svc_last,
       svc_int = excluded.svc_int, muayene = excluded.muayene, sigorta = excluded.sigorta,
       updated_at = excluded.updated_at, deleted = 0`,
    [VEHICLE_ID, v.plate, v.model, v.year, v.fuel, v.odo, v.odoAt, v.svcLast, v.svcInt, v.muayene, v.sigorta, Date.now()],
  );
}

type ShiftRow = { id: string; start: number; end: number | null; km: number | null };
type EntryRow = { id: string; shift_id: string; at: number; category: Category; amount: number };

export function loadShifts(db: SQLiteDatabase): Shift[] {
  const shifts = db.getAllSync<ShiftRow>('SELECT id, start, end, km FROM shifts WHERE deleted = 0 ORDER BY start DESC');
  const entries = db.getAllSync<EntryRow>(
    'SELECT id, shift_id, at, category, amount FROM entries WHERE deleted = 0 ORDER BY at',
  );
  const byShift = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = byShift.get(e.shift_id) ?? [];
    list.push({ id: e.id, at: e.at, category: e.category, amount: e.amount });
    byShift.set(e.shift_id, list);
  }
  return shifts.map((s) => ({ ...s, entries: byShift.get(s.id) ?? [] }));
}

export function saveShift(db: SQLiteDatabase, s: Pick<Shift, 'id' | 'start' | 'end' | 'km'>) {
  db.runSync(
    `INSERT INTO shifts (id, start, end, km, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET start = excluded.start, end = excluded.end, km = excluded.km, updated_at = excluded.updated_at`,
    [s.id, s.start, s.end, s.km, Date.now()],
  );
}

export function saveEntry(db: SQLiteDatabase, shiftId: string, e: Entry) {
  db.runSync(
    `INSERT INTO entries (id, shift_id, at, category, amount, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET category = excluded.category, amount = excluded.amount, updated_at = excluded.updated_at`,
    [e.id, shiftId, e.at, e.category, e.amount, Date.now()],
  );
}

export function deleteEntryRow(db: SQLiteDatabase, id: string) {
  db.runSync('UPDATE entries SET deleted = 1, updated_at = ? WHERE id = ?', [Date.now(), id]);
}
