import { BUYUK_TAKIMLAR, MEKANLAR, mekanBul, sade } from './mekanlar.mjs';

// Kaynaklardan gelen "adayları" tek listeye çevirir: Ankara dışını ve geçmişi atar, tekrarları ayıklar, talebi hesaplar.
// Ağ kullanmaz (testi: test/birlestir.test.mjs). Kaynaklar: kaynaklar.mjs.
//
// Aday: { kaynak, tur, baslik, mekanAdi?, mekan? (kod), baslangic (ms), bitis? (ms), rakip?, talep?, ankara? }
// Çıktı (Firestore events/{id}): { city, cat, title, venue, start, end, demand, source, updated_at }

const SAAT = 3_600_000;
const GUN = 24 * SAAT;
const TR = 3 * SAAT; // Türkiye UTC+3, yaz saati yok

// Aynı mekânda bu kadar yakın başlayan iki kayıt aynı etkinliktir.
const AYNI_ETKINLIK = 3 * SAAT;
const ILERI_GUN = 60;

// Tekrarda hangi kaynağın bilgisi tutulur (yüksek kazanır).
const ONCELIK = { tff: 3, apisports: 2, tsdb: 2, serpapi: 1, belediye: 1, tatil: 0 };

const SURE = { Futbol: 2 * SAAT, Basketbol: 2 * SAAT, Voleybol: 2 * SAAT, Spor: 2 * SAAT, Konser: 3 * SAAT, Tiyatro: 2.5 * SAAT, Fuar: 6 * SAAT };

// "2026-10-17", "20:00" → Türkiye saatiyle o anın ms değeri.
export function trZaman(tarih, saat = '00:00') {
  const [y, a, g] = tarih.split('-').map(Number);
  const [s, d] = saat.split(':').map(Number);
  return Date.UTC(y, a - 1, g, s, d) - TR;
}

// ms → "20261017" (Türkiye tarihi).
export function trGun(ms) {
  return new Date(ms + TR).toISOString().slice(0, 10).replace(/-/g, '');
}

export function talepHesapla(kapasite, buyukRakip = false) {
  const kademe = ['orta', 'yuksek', 'cokYuksek'];
  let i = kapasite >= 15000 ? 2 : kapasite >= 5000 ? 1 : 0;
  if (buyukRakip) i = Math.min(2, i + 1);
  return kademe[i];
}

function kimlik(a, mekan) {
  const yer = mekan?.kod ?? sade(a.baslik).replace(/ /g, '-').slice(0, 40);
  return `${trGun(a.baslangic)}-${yer}`;
}

export function birlestir(adaylar, now = Date.now()) {
  const sonuc = [];
  for (const a of adaylar) {
    if (!a?.baslangic || !a.baslik) continue;
    const mekan = a.mekan ? MEKANLAR.find((m) => m.kod === a.mekan) : mekanBul(a.mekanAdi);
    if (!mekan && !a.ankara) continue; // Ankara'da olduğu bilinmiyor
    const bitis = a.bitis ?? a.baslangic + (SURE[a.tur] ?? 3 * SAAT);
    if (bitis < now || a.baslangic > now + ILERI_GUN * GUN) continue;
    const rakip = sade(a.rakip);
    sonuc.push({
      id: kimlik(a, mekan),
      city: 'Ankara',
      cat: a.tur,
      title: a.baslik,
      venue: mekan?.ad ?? a.mekanAdi ?? '',
      start: a.baslangic,
      end: bitis,
      demand: a.talep ?? (mekan ? talepHesapla(mekan.kapasite, !!rakip && BUYUK_TAKIMLAR.some((b) => rakip.startsWith(b))) : 'orta'),
      source: a.kaynak,
    });
  }

  // Tekrarları ayıkla: aynı mekân (ya da aynı başlık) ve yakın saat → önceliği yüksek kaynak kalır.
  sonuc.sort((x, y) => (ONCELIK[y.source] ?? 0) - (ONCELIK[x.source] ?? 0));
  const kalan = [];
  for (const e of sonuc) {
    const ayni = kalan.find(
      (k) => (k.venue === e.venue || sade(k.title) === sade(e.title)) && Math.abs(k.start - e.start) < AYNI_ETKINLIK,
    );
    if (ayni) {
      if (ayni.demand === 'orta' && e.demand !== 'orta') ayni.demand = e.demand;
      continue;
    }
    // Aynı gün aynı mekânda ikinci ayrı etkinlik (ör. öğlen ve akşam konseri): kimliği ayır.
    while (kalan.some((k) => k.id === e.id)) e.id += '-2';
    kalan.push(e);
  }
  return kalan.sort((x, y) => x.start - y.start);
}

// Resmi tatillerden taksiciyi ilgilendiren günler (Nager.Date listesinden).
// Bayram: arifesinde otogar/havalimanı yoğunluğu. Ulusal bayramlar: Anıtkabir ve Kızılay. Yılbaşı: gece.
const ULUSAL = ['04-23', '05-19', '08-30', '10-29'];

export function tatilAdaylari(liste) {
  const out = [];
  for (const t of liste ?? []) {
    const ad = t.localName ?? '';
    const ayGun = t.date.slice(5);
    if (/Bayramı 1\. Gün/.test(ad)) {
      const arife = trZaman(t.date) - GUN;
      out.push({
        kaynak: 'tatil',
        tur: 'Bayram',
        baslik: `${ad.replace(/ 1\. Gün$/, '')} arifesi`,
        mekanAdi: 'AŞTİ, Esenboğa ve otogarlar',
        ankara: true,
        baslangic: arife + 10 * SAAT,
        bitis: arife + GUN,
        talep: 'cokYuksek',
      });
    } else if (ayGun === '01-01') {
      const gece = trZaman(t.date) - 4 * SAAT; // 31 Aralık 20:00
      out.push({
        kaynak: 'tatil',
        tur: 'Kutlama',
        baslik: 'Yılbaşı gecesi',
        mekanAdi: 'Kızılay, Tunalı ve 7. Cadde',
        ankara: true,
        baslangic: gece,
        bitis: gece + 7 * SAAT,
        talep: 'cokYuksek',
      });
    } else if (ULUSAL.includes(ayGun)) {
      out.push({
        kaynak: 'tatil',
        tur: 'Resmi tören',
        baslik: ad,
        mekanAdi: 'Anıtkabir ve Kızılay çevresi',
        ankara: true,
        baslangic: trZaman(t.date, '09:00'),
        bitis: trZaman(t.date, '18:00'),
        talep: 'yuksek',
      });
    }
  }
  return out;
}
