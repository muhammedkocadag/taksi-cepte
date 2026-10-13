import { tatilAdaylari, trZaman } from './birlestir.mjs';
import { TAKIMLAR, ankaraKulubu, sade } from './mekanlar.mjs';

// Etkinlik kaynakları. Her biri "aday" listesi döner (biçim: birlestir.mjs).
// Kurallar: sadece robots.txt'in izin verdiği, giriş/bot koruması olmayan açık sayfalar; gecede bir kez, istekler arası bekleme;
// sadece olgu bilgisi (ad, tarih, saat, mekân) alınır, görsel ve açıklama alınmaz.
// Bilet siteleri (Biletix, Bubilet, Passo) bot erişimini engelliyor (401 / Cloudflare); onlardan veri ÇEKİLMEZ.
// Ayrıştırıcılar (…Coz) ağdan bağımsız, test/kaynaklar.test.mjs kaydedilmiş sayfalarla dener.

const UA = 'TaksiCepte-etkinlik/1.0 (gecede bir kez)';
const BEKLE_MS = 1200;

const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

async function getir(url, { kodlama = 'utf-8', json = false } = {}) {
  await uyu(BEKLE_MS);
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  if (json) return r.json();
  return new TextDecoder(kodlama).decode(await r.arrayBuffer());
}

const temizle = (s) =>
  String(s ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

// Büyük harfli adları okunur yap: "GENÇLERBİRLİĞİ" → "Gençlerbirliği", "GALATASARAY A.Ş." → "Galatasaray".
// Kısaltmalar büyük kalır ("KCT 1461 Trabzon"), Ankara kulüpleri bilinen kısa adlarıyla yazılır.
const KISA_AD = [
  [/keciorengucu/, 'Keçiörengücü'],
  [/ankaragucu/, 'Ankaragücü'],
  [/genclerbirligi/, 'Gençlerbirliği'],
];
const KISALTMA = new Set(['FK', 'SK', 'KCT', 'GMG', 'BBSK', 'DSİ', 'ODTÜ', 'MEB', 'ATO', 'CSO', 'TRT', 'AŞTİ']);

export function takimAdi(s) {
  const kisa = KISA_AD.find(([re]) => re.test(sade(s)));
  if (kisa) return kisa[1];
  return temizle(s)
    .replace(/\s+-\s+ANKARA$/i, '')
    .replace(/\s+(FUTBOL KULÜBÜ A\.Ş\.|FUTBOL KULÜBÜ|FUTBOL A\.Ş\.|SPOR KULÜBÜ|A\.Ş\.|FK)$/i, '')
    .split(' ')
    .map((w) => (KISALTMA.has(w.toLocaleUpperCase('tr')) ? w.toLocaleUpperCase('tr') : w.toLocaleLowerCase('tr').replace(/^(\p{L})/u, (c) => c.toLocaleUpperCase('tr'))))
    .join(' ');
}

// "17.10.2026", "16:00" → ms
const tffZaman = (tarih, saat) => {
  const [g, a, y] = tarih.split('.');
  return trZaman(`${y}-${a}-${g}`, saat);
};

// ---------- TFF (futbol) ----------
// Haftalık fikstür sayfası (Süper Lig pageID=198, 1. Lig 142; &hafta=N): tarih, saat, ev, deplasman, maç kimliği.
export function tffHaftaCoz(html) {
  const re =
    /lblTarih">([^<]*)<\/span>\s*<span[^>]*lblSaat">([^<]*)<\/span>[\s\S]*?haftaninMaclariEv">[\s\S]*?<span[^>]*>([^<]*)<\/span>[\s\S]*?macId=(\d+)[\s\S]*?haftaninMaclariDeplasman">[\s\S]*?<span[^>]*>([^<]*)<\/span>/g;
  return [...html.matchAll(re)].map((m) => ({ tarih: temizle(m[1]), saat: temizle(m[2]), ev: temizle(m[3]), macId: m[4], dep: temizle(m[5]) }));
}

// Sayfanın gösterdiği (güncel) hafta numarası.
export function tffGuncelHafta(html) {
  const m = html.match(/aspNetDisabled[^>]*><span class="wrap"><span class="innerWrap">\s*(\d+)\.\s*Hafta/i);
  return m ? Number(m[1]) : null;
}

// Tarihsiz sezon fikstürü (2. Lig pageID=976): oynanmamış (skoru boş) maçlar.
export function tffFiksturCoz(html) {
  const re =
    /<td class="altCizgi"[^>]*><a href="[^"]*kulupId=\d+">([^<]*)<\/a><\/td>\s*<td[^>]*><a href="[^"]*macId=(\d+)">([^<]*)<\/a><\/td>\s*<td[^>]*><a href="[^"]*kulupId=\d+">([^<]*)<\/a>/g;
  return [...html.matchAll(re)]
    .filter((m) => !/\d/.test(m[3]))
    .map((m) => ({ ev: temizle(m[1]), macId: m[2], dep: temizle(m[4]) }));
}

// Maç ayrıntısı: stadyum ve "17.10.2026 - 16:00".
export function tffMacCoz(html) {
  const stad = html.match(/lnkStad"[^>]*>([^<]*)</);
  const zaman = html.match(/lblTarih">\s*(\d\d\.\d\d\.\d{4})\s*-\s*(\d\d:\d\d)/);
  return { stad: stad ? temizle(stad[1]) : null, tarih: zaman?.[1] ?? null, saat: zaman?.[2] ?? null };
}

const TFF = 'https://www.tff.org/Default.aspx';
const tffSayfa = (q) => getir(`${TFF}?${q}`, { kodlama: 'windows-1254' });

async function tffMacAdayi(macId, ev, dep, tarih, saat) {
  const d = tffMacCoz(await tffSayfa(`pageID=29&macId=${macId}`));
  tarih = d.tarih ?? tarih;
  saat = d.saat ?? saat;
  if (!tarih || !/^\d\d:\d\d$/.test(saat ?? '')) return null; // saati açıklanmamış maç gösterilmez
  return {
    kaynak: 'tff',
    tur: 'Futbol',
    baslik: `${takimAdi(ev)} - ${takimAdi(dep)}`,
    mekanAdi: d.stad ? takimAdi(d.stad) : null,
    ankara: true, // iç saha takımı Ankara kulübü
    baslangic: tffZaman(tarih, saat),
    rakip: dep,
  };
}

export async function tff({ ileriHafta = 3, ikinciLigMac = 2 } = {}) {
  const out = [];
  // Haftalık ligler: güncel hafta + sonraki haftalar.
  for (const pageID of [198, 142]) {
    const ilk = await tffSayfa(`pageID=${pageID}`);
    const hafta = tffGuncelHafta(ilk);
    const sayfalar = [ilk];
    if (hafta) for (let h = hafta + 1; h <= hafta + ileriHafta; h++) sayfalar.push(await tffSayfa(`pageID=${pageID}&hafta=${h}`));
    for (const html of sayfalar)
      for (const m of tffHaftaCoz(html).filter((m) => ankaraKulubu(m.ev))) {
        const a = await tffMacAdayi(m.macId, m.ev, m.dep, m.tarih, m.saat);
        if (a) out.push(a);
      }
  }
  // 2. Lig: tarihsiz liste; her Ankara kulübünün sıradaki birkaç iç saha maçının ayrıntısına bakılır.
  const sayac = {};
  for (const m of tffFiksturCoz(await tffSayfa('pageID=976')).filter((m) => ankaraKulubu(m.ev))) {
    sayac[m.ev] = (sayac[m.ev] ?? 0) + 1;
    if (sayac[m.ev] > ikinciLigMac) continue;
    const a = await tffMacAdayi(m.macId, m.ev, m.dep, null, null);
    if (a) out.push(a);
  }
  return out;
}

// ---------- TheSportsDB (basketbol, voleybol; ücretsiz anahtar takım başına sadece sıradaki maçı verir) ----------
export async function tsdb() {
  const out = [];
  for (const t of TAKIMLAR) {
    const j = await getir(`https://www.thesportsdb.com/api/v1/json/123/eventsnext.php?id=${t.id}`, { json: true });
    for (const e of j?.events ?? []) {
      if (e.idHomeTeam !== t.id || !e.strTimestamp) continue; // sadece iç saha
      out.push({
        kaynak: 'tsdb',
        tur: t.tur,
        baslik: `${e.strHomeTeam} - ${e.strAwayTeam}`,
        mekanAdi: e.strVenue,
        mekan: e.strVenue ? undefined : t.mekan,
        baslangic: Date.parse(e.strTimestamp.endsWith('Z') ? e.strTimestamp : `${e.strTimestamp}Z`), // UTC
        rakip: e.strAwayTeam,
      });
    }
  }
  return out;
}

// ---------- Ankara Büyükşehir Belediyesi etkinlikleri ----------
const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

// "12 Ağustos 2023 20:30" → ms
export function trTarihCoz(s) {
  const m = temizle(s).toLocaleLowerCase('tr').match(/^(\d{1,2})\s+(\p{L}+)\s+(\d{4})\s+(\d{1,2}):(\d{2})/u);
  if (!m) return null;
  const ay = AYLAR.indexOf(m[2]);
  if (ay < 0) return null;
  const p = (n) => String(n).padStart(2, '0');
  return trZaman(`${m[3]}-${p(ay + 1)}-${p(m[1])}`, `${p(m[4])}:${m[5]}`);
}

export function belediyeCoz(html) {
  const re =
    /<a href="(\/etkinlik\/[^"]+)"[\s\S]*?class="category">([^<]*)<[\s\S]*?<strong>([^<]*)<\/strong>[\s\S]*?fa-calendar"><\/i>\s*<span>([^<]*)<\/span>[\s\S]*?fa-location-dot"><\/i>\s*<span>([^<]*)<\/span>/g;
  return [...html.matchAll(re)].map((m) => ({
    kaynak: 'belediye',
    tur: temizle(m[2]) || 'Etkinlik',
    baslik: takimAdi(m[3]),
    mekanAdi: takimAdi(m[5]).replace(/\s*\/\s*Ankara$/i, ''),
    ankara: true,
    baslangic: trTarihCoz(m[4]),
  }));
}

export async function belediye() {
  return belediyeCoz(await getir('https://www.ankara.bel.tr/etkinlikler'));
}

// ---------- Resmi tatiller (Nager.Date) ----------
export async function tatil(now = Date.now()) {
  const yil = new Date(now).getUTCFullYear();
  const liste = [];
  for (const y of [yil, yil + 1]) liste.push(...(await getir(`https://date.nager.at/api/v3/PublicHolidays/${y}/TR`, { json: true })));
  return tatilAdaylari(liste);
}

// ---------- API-Basketball / API-Volleyball (api-sports.io, APISPORTS_KEY) ----------
// Ücretsiz plan sadece bugün ±1 gün veriyor: gece görevi bugünü ve yarını alır (1 gün önceki bildirim yetişir).
const APISPORTS = [
  { tur: 'Basketbol', url: 'https://v1.basketball.api-sports.io', takimlar: { 1277: 'ankara-arena' } }, // Türk Telekom
  { tur: 'Voleybol', url: 'https://v1.volleyball.api-sports.io', takimlar: { 1281: 'baskent-voleybol', 1287: null } }, // Halkbank, Ziraat Bankkart
];

export function apisportsCoz(j, { tur, takimlar }) {
  return (j?.response ?? [])
    .filter((g) => String(g.teams?.home?.id) in takimlar)
    .map((g) => ({
      kaynak: 'apisports',
      tur,
      baslik: `${g.teams.home.name} - ${g.teams.away.name}`,
      mekan: takimlar[g.teams.home.id] ?? undefined,
      mekanAdi: takimlar[g.teams.home.id] ? undefined : 'Ankara',
      ankara: true,
      baslangic: Date.parse(g.date),
      rakip: g.teams.away.name,
    }));
}

export async function apisports(now = Date.now()) {
  const key = process.env.APISPORTS_KEY;
  if (!key) return [];
  const out = [];
  for (const spor of APISPORTS)
    for (const gun of [0, 1]) {
      const tarih = new Date(now + 3 * 3_600_000 + gun * 86_400_000).toISOString().slice(0, 10);
      await uyu(BEKLE_MS);
      const r = await fetch(`${spor.url}/games?date=${tarih}&timezone=Europe/Istanbul`, {
        headers: { 'x-apisports-key': key },
        signal: AbortSignal.timeout(30_000),
      });
      const j = await r.json();
      if (j.errors && Object.keys(j.errors).length) throw new Error(`${spor.tur}: ${JSON.stringify(j.errors)}`);
      out.push(...apisportsCoz(j, spor));
    }
  return out;
}

// ---------- SerpApi Google Events (SERPAPI_KEY; ücretsiz 250 arama/ay → gecede 5 sorgu) ----------
// Konser, tiyatro, fuar: bilet sitelerinin ilanları Google üzerinden, izinli yoldan gelir.
export const SERP_SORGULAR = [
  { q: 'Ankara konser', hl: 'tr', tur: 'Konser' },
  { q: 'Ankara tiyatro', hl: 'tr', tur: 'Tiyatro' },
  { q: 'Ankara fuar', hl: 'tr', tur: 'Fuar' },
  { q: 'Ankara festival', hl: 'tr', tur: 'Festival' },
  { q: 'Events in Ankara', hl: 'en', tur: null },
];

const EN_AY = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// "8:00 PM", "9 AM" → "20:00"
function saat12(s, ampm) {
  let [h, m = '00'] = s.split(':');
  h = Number(h) % 12 + (ampm.toUpperCase() === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${m}`;
}

// Google'ın tarih alanı: start_date "Nov 8", when "Nov 8, 8:00 PM" / "Nov 8, 8:00 – 11:00 PM" / "Oct 21" (saatsiz).
// Yıl verilmez: 60 günden eski görünen tarih gelecek yıla aittir ("Jan 16" ekimde → gelecek ocak).
export function serpTarihCoz(date, now = Date.now()) {
  const m = String(date?.start_date ?? '').match(/^([A-Za-z]{3})\w*\s+(\d{1,2})/);
  if (!m) return null;
  const ay = EN_AY.indexOf(m[1].toLowerCase());
  if (ay < 0) return null;
  const bugun = new Date(now + 3 * 3_600_000);
  let yil = bugun.getUTCFullYear();
  const p = (n) => String(n).padStart(2, '0');
  const gun = (y) => `${y}-${p(ay + 1)}-${p(m[2])}`;
  if (trZaman(gun(yil)) < now - 60 * 86_400_000) yil++; // yakın geçmiş bu yılda kalır (birleştirme atar)

  // Baştaki "Sat, Nov 8, " atılır; kalan "9 – 11:30 PM" ya da "10 AM – Oct 23, 6 PM".
  const saatKismi = String(date?.when ?? '').replace(/^.*?\b[A-Za-z]{3}\w*\s+\d{1,2}\b,?\s*/, '');
  const saatler = [...saatKismi.matchAll(/(\d{1,2}(?::\d{2})?)\s*(?:(AM|PM))?/gi)].map((x) => [x[1], x[2]]);
  if (!saatler.length) return { baslangic: trZaman(gun(yil), '10:00'), bitis: trZaman(gun(yil), '18:00'), saatsiz: true };
  // "8:00 – 11:00 PM": ilk saatte AM/PM yoksa sonrakininkini kullan
  const son = saatler.find((x) => x[1])?.[1] ?? 'PM';
  const bas = saat12(saatler[0][0], saatler[0][1] ?? son);
  const baslangic = trZaman(gun(yil), bas);
  let bitis = null;
  if (saatler[1] && !/\b[A-Za-z]{3}\s+\d/.test(String(date.when).split(/[–-]/)[1] ?? '')) {
    bitis = trZaman(gun(yil), saat12(saatler[1][0], saatler[1][1] ?? son));
    if (bitis <= baslangic) bitis += 86_400_000; // gece yarısını geçen
  }
  return { baslangic, bitis };
}

function serpTur(baslik, varsayilan) {
  const s = sade(baslik);
  if (/\b(fuar|fair|expo)/.test(s)) return 'Fuar';
  if (/\bvs\b| - /.test(baslik)) {
    if (/telekom|\bdsi\b/.test(s)) return 'Basketbol';
    if (/halkbank|ziraat/.test(s)) return 'Voleybol';
    if (/spor|\bfc\b|gucu\b|birligi/.test(s)) return 'Futbol';
  }
  if (/festival/.test(s)) return 'Festival';
  return varsayilan ?? 'Etkinlik';
}

export function serpCoz(j, sorgu, now = Date.now()) {
  const out = [];
  for (const e of j?.events_results ?? []) {
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(e.title ?? '')) continue; // yanlış dilde gelen ilanlar
    if (!(e.address ?? []).some((a) => /ankara/i.test(a))) continue;
    const t = serpTarihCoz(e.date, now);
    if (!t) continue;
    out.push({
      kaynak: 'serpapi',
      tur: serpTur(e.title, sorgu.tur),
      baslik: temizle(e.title),
      mekanAdi: temizle(e.venue?.name ?? e.address?.[0] ?? ''),
      ankara: true,
      baslangic: t.baslangic,
      bitis: t.bitis ?? undefined,
    });
  }
  return out;
}

export async function serpapi(now = Date.now()) {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];
  const out = [];
  for (const s of SERP_SORGULAR) {
    const u = new URL('https://serpapi.com/search.json');
    for (const [k, v] of Object.entries({ engine: 'google_events', q: s.q, hl: s.hl, gl: 'tr', api_key: key })) u.searchParams.set(k, v);
    const j = await (await fetch(u, { signal: AbortSignal.timeout(150_000) })).json();
    if (j.error && !/hasn't returned any results/.test(j.error)) throw new Error(`serpapi: ${j.error}`);
    out.push(...serpCoz(j, s, now));
  }
  return out;
}

export const KAYNAKLAR = { tff, tsdb, apisports, serpapi, belediye, tatil };
