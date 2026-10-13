import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Eşitleme mantığı testi: gerçek SQLite (node:sqlite) + Firestore gibi davranan sahte bulut, iki telefon.
// Çalıştırma: uygulama/ içinde `npm run test:sync` (Node 22.6+; .ts dosyalarını tür bilgisi atılarak çalıştırır).
const U = new URL('../src/store/', import.meta.url).href;
const { migrate, saveShift, saveEntry, deleteEntryRow, loadShifts, saveVehicle, loadVehicle, saveSettings, loadSettings } = await import(U + 'db.ts');
const { syncOnce } = await import(U + 'sync.ts');

// expo-sqlite benzeri ince sarmalayıcı
function phone() {
  const raw = new DatabaseSync(':memory:');
  const db = {
    getFirstSync: (q, p = []) => raw.prepare(q).get(...p),
    getAllSync: (q, p = []) => raw.prepare(q).all(...p),
    runSync: (q, p = []) => { const r = raw.prepare(q).run(...p); return { changes: Number(r.changes) }; },
    execSync: (q) => raw.exec(q),
    withTransactionSync: (f) => { raw.exec('BEGIN'); try { f(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; } },
  };
  migrate(db);
  return db;
}

// Firestore gibi davranan sahte bulut: belge = id → veri (set ile üzerine yazar), updated_at ile sorgu.
function cloud() {
  const store = { shifts: new Map(), entries: new Map(), vehicle: new Map() };
  let profile = null;
  return {
    store,
    get profile() { return profile; },
    async push(t, rows) { for (const r of rows) { const cur = store[t].get(r.id); if (cur && r.updated_at < cur.updated_at) continue; store[t].set(r.id, structuredClone(r)); } },
    async pull(t, since) { return [...store[t].values()].filter((r) => r.updated_at > since).map((r) => structuredClone(r)); },
    async pushProfile(d) { profile = structuredClone(d); },
    async pullProfile() { return profile && structuredClone(profile); },
  };
}

const realNow = Date.now;
let clock = 1_800_000_000_000;
Date.now = () => (clock += 1000); // her çağrıda saat ilerler (kayıtlar sıralı zaman alsın)

test('yeni telefona bütün veriler gelir', async () => {
  const c = cloud(), A = phone(), B = phone();
  saveShift(A, { id: 's1', start: 100, end: 900, km: 245 });
  saveEntry(A, 's1', { id: 'e1', at: 200, category: 'Nakit', amount: 750 });
  saveEntry(A, 's1', { id: 'e2', at: 300, category: 'Yakıt', amount: 500 });
  saveVehicle(A, { plate: '06 ABC 123', model: 'Fiat Egea', year: 2022, fuel: 'LPG', odo: 148500, odoAt: 1, svcLast: null, svcInt: 10000, muayene: null, sigorta: null });
  saveSettings(A, { name: 'Ali', il: 'Ankara', theme: 'dark', signedIn: '1', phone: '5321112233' });

  const ra = await syncOnce(A, c, Date.now());
  assert.equal(ra.pushed, 5); // 1 vardiya + 2 kayıt + araç + profil
  const rb = await syncOnce(B, c, Date.now());
  assert.ok(rb.pulled >= 4);
  assert.deepEqual(loadShifts(B), loadShifts(A));
  assert.equal(loadVehicle(B).plate, '06 ABC 123');
  const sb = loadSettings(B);
  assert.equal(sb.name, 'Ali'); assert.equal(sb.theme, 'dark');
  assert.equal(sb.phone, undefined, 'telefon numarası cihaza özel, buluta gitmez');
  assert.equal(c.profile.settings.signedIn, undefined);
});

test('iki telefonda düzenleme: en son değiştiren kazanır, silme eşitlenir', async () => {
  const c = cloud(), A = phone(), B = phone();
  saveShift(A, { id: 's1', start: 100, end: null, km: null });
  saveEntry(A, 's1', { id: 'e1', at: 200, category: 'Nakit', amount: 750 });
  saveEntry(A, 's1', { id: 'e2', at: 300, category: 'POS', amount: 400 });
  await syncOnce(A, c, Date.now()); await syncOnce(B, c, Date.now());

  saveEntry(A, 's1', { id: 'e1', at: 200, category: 'Nakit', amount: 800 }); // A önce değiştirir
  saveEntry(B, 's1', { id: 'e1', at: 200, category: 'POS', amount: 900 });   // B sonra değiştirir → kazanmalı
  deleteEntryRow(B, 'e2');
  await syncOnce(A, c, Date.now()); await syncOnce(B, c, Date.now()); await syncOnce(A, c, Date.now());

  for (const P of [A, B]) {
    const es = loadShifts(P)[0].entries;
    assert.deepEqual(es.map((e) => [e.id, e.category, e.amount]), [['e1', 'POS', 900]]);
  }
});

test('eski veri yenisinin üzerine yazmaz', async () => {
  const c = cloud(), A = phone(), B = phone();
  saveShift(A, { id: 's1', start: 100, end: null, km: null });
  await syncOnce(A, c, Date.now()); await syncOnce(B, c, Date.now());
  saveShift(B, { id: 's1', start: 100, end: 5000, km: 300 }); // B vardiyayı bitirir (yeni)
  await syncOnce(B, c, Date.now());
  // A eski haliyle (bitmemiş) tekrar gönderilmeye çalışılsa da B'nin yeni hali korunmalı
  await syncOnce(A, c, Date.now());
  assert.equal(loadShifts(A)[0].end, 5000);
  assert.equal(loadShifts(A)[0].km, 300);
});

test('çevrimdışı değişiklikler sonraki turda gider, tekrar gönderim olmaz', async () => {
  const c = cloud(), A = phone();
  saveShift(A, { id: 's1', start: 100, end: null, km: null });
  await syncOnce(A, c, Date.now());
  const again = await syncOnce(A, c, Date.now());
  assert.equal(again.pushed, 0, 'değişiklik yoksa bir şey gönderilmez');
  saveEntry(A, 's1', { id: 'e9', at: 400, category: 'Uygulama', amount: 1200 }); // "çevrimdışı" yapılan kayıt
  const r = await syncOnce(A, c, Date.now());
  assert.equal(r.pushed, 1);
  assert.equal(c.store.entries.get('e9').amount, 1200);
  assert.equal(c.store.entries.get('e9').deleted, false);
});

test('bulut satırları kurallardaki biçimde (deleted bool, id ayrı)', async () => {
  const c = cloud(), A = phone();
  saveShift(A, { id: 's1', start: 100, end: null, km: null });
  saveEntry(A, 's1', { id: 'e1', at: 200, category: 'Yemek', amount: 150 });
  deleteEntryRow(A, 'e1');
  await syncOnce(A, c, Date.now());
  const e = c.store.entries.get('e1');
  assert.deepEqual(Object.keys(e).sort(), ['amount', 'at', 'category', 'deleted', 'id', 'shift_id', 'updated_at']);
  assert.equal(e.deleted, true);
  assert.equal(typeof e.updated_at, 'number');
});

test('geç bağlanan telefon eski haliyle yeniyi ezemez', async () => {
  const c = cloud(), A = phone(), B = phone();
  saveEntry(A, 's1', { id: 'e1', at: 200, category: 'Nakit', amount: 750 });
  await syncOnce(A, c, Date.now()); await syncOnce(B, c, Date.now());
  saveEntry(A, 's1', { id: 'e1', at: 200, category: 'Nakit', amount: 111 }); // A önce (çevrimdışı)
  saveEntry(B, 's1', { id: 'e1', at: 200, category: 'Nakit', amount: 999 }); // B sonra
  await syncOnce(B, c, Date.now()); // B önce gönderir
  await syncOnce(A, c, Date.now()); // A geç bağlanır, eski halini göndermeye çalışır
  await syncOnce(B, c, Date.now());
  const amt = (P) => P.getFirstSync('SELECT amount FROM entries WHERE id = ?', ['e1']).amount;
  assert.equal(c.store.entries.get('e1').amount, 999, 'bulut yeni hali korumalı');
  assert.equal(amt(A), 999); assert.equal(amt(B), 999);
});

test.after(() => { Date.now = realNow; });
