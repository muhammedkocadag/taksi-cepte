// Gece görevi: kaynakları topla → birleştir → (--yaz ile) Firestore `events` koleksiyonuna yaz.
//   node etkinlik/topla.mjs            listeyi ekrana yazar, hiçbir yere kaydetmez
//   node etkinlik/topla.mjs --json     aynı liste, JSON
//   node etkinlik/topla.mjs --yaz      Firestore'a yazar (firebase-admin; GOOGLE_APPLICATION_CREDENTIALS
//                                      ya da emülatör için FIRESTORE_EMULATOR_HOST gerekir)
// Bir kaynak hata verirse diğerleri yine yazılır; o kaynağın eski kayıtlarına dokunulmaz.

import { birlestir } from './birlestir.mjs';
import { KAYNAKLAR } from './kaynaklar.mjs';

const SAAT = 3_600_000;
// Sadece sıradaki maçı veren kaynak: listede olmaması iptal anlamına gelmez, silme yapılmaz.
const EKSIK_LISTE = new Set(['tsdb']);

export async function topla(now = Date.now()) {
  const adaylar = [];
  const rapor = {};
  for (const [ad, f] of Object.entries(KAYNAKLAR)) {
    try {
      const a = await f();
      adaylar.push(...a);
      rapor[ad] = { aday: a.length };
    } catch (e) {
      rapor[ad] = { hata: String(e?.message ?? e) };
    }
  }
  const liste = birlestir(adaylar, now);
  for (const e of liste) if (rapor[e.source]) rapor[e.source].kalan = (rapor[e.source].kalan ?? 0) + 1;
  return { liste, rapor };
}

// Firestore'a yaz: değişmeyeni yeniden yazma (updated_at telefonların eşitlemesini tetikler),
// geçmişi ve başarılı kaynaktan gelip artık listede olmayan gelecek etkinlikleri (ertelenen/iptal) sil.
export async function yaz(db, liste, rapor, now = Date.now()) {
  const col = db.collection('events');
  const mevcut = new Map((await col.get()).docs.map((d) => [d.id, d.data()]));
  const yeni = new Map(liste.map((e) => [e.id, e]));
  const batch = db.batch();
  let yazilan = 0;
  let silinen = 0;

  for (const [id, e] of yeni) {
    const eski = mevcut.get(id);
    const ayni = eski && Object.keys(e).every((k) => eski[k] === e[k]);
    if (!ayni) {
      batch.set(col.doc(id), { ...e, updated_at: now });
      yazilan++;
    }
  }
  for (const [id, d] of mevcut) {
    if (yeni.has(id)) continue;
    const gecmis = d.end < now - 2 * 24 * SAAT;
    const kayboldu = d.start > now && rapor[d.source] && !rapor[d.source].hata && !EKSIK_LISTE.has(d.source);
    if (gecmis || kayboldu) {
      batch.delete(col.doc(id));
      silinen++;
    }
  }
  await batch.commit();
  return { yazilan, silinen };
}

const fmt = (ms) =>
  new Date(ms + 3 * SAAT).toISOString().replace('T', ' ').slice(5, 16).replace(/^(\d\d)-(\d\d)/, '$2.$1');

// Doğrudan çalıştırıldıysa (testten import edildiyse değil).
if (/[\\/]etkinlik[\\/]topla\.mjs$/.test(process.argv[1] ?? '')) {
  const args = new Set(process.argv.slice(2));
  const { liste, rapor } = await topla();
  if (args.has('--json')) console.log(JSON.stringify(liste, null, 2));
  else {
    for (const e of liste)
      console.log(`${fmt(e.start)}–${fmt(e.end).slice(6)}  ${e.cat.padEnd(11)} ${e.demand.padEnd(9)} ${e.title} · ${e.venue}  [${e.source}]`);
    console.log('\nKaynaklar:', JSON.stringify(rapor));
  }
  if (args.has('--yaz')) {
    const { initializeApp, applicationDefault } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const emu = !!process.env.FIRESTORE_EMULATOR_HOST;
    initializeApp(emu ? { projectId: 'demo-taksi-cepte' } : { credential: applicationDefault(), projectId: 'taksi-cepte-9c4ac' });
    console.log('Firestore:', await yaz(getFirestore(), liste, rapor));
  }
  if (Object.values(rapor).every((r) => r.hata)) process.exit(1);
}
