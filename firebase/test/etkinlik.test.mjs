// Etkinlik toplayıcısının testleri (ağ yok). Örnek sayfalar test/ornek/ (13.10.2026'da kaydedildi, kırpıldı).
// Çalıştırma: firebase/ içinde `npm run test:etkinlik`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { birlestir, tatilAdaylari, trZaman } from '../etkinlik/birlestir.mjs';
import { belediyeCoz, takimAdi, tffFiksturCoz, tffGuncelHafta, tffHaftaCoz, tffMacCoz, trTarihCoz } from '../etkinlik/kaynaklar.mjs';
import { ankaraKulubu } from '../etkinlik/mekanlar.mjs';
import { yaz } from '../etkinlik/topla.mjs';

const ornek = (f) => readFileSync(new URL(`./ornek/${f}`, import.meta.url), 'utf8');
const SAAT = 3_600_000;
const SIMDI = trZaman('2026-10-13', '10:00');

describe('TFF sayfaları', () => {
  it('Süper Lig haftası: güncel hafta ve Ankara iç saha maçı', () => {
    const html = ornek('tff-superlig.html');
    assert.equal(tffGuncelHafta(html), 8);
    const maclar = tffHaftaCoz(html);
    assert.equal(maclar.length, 9);
    const ank = maclar.filter((m) => ankaraKulubu(m.ev));
    assert.deepEqual(ank.map((m) => [m.tarih, m.saat, m.ev, m.dep]), [['17.10.2026', '16:00', 'GENÇLERBİRLİĞİ', 'GALATASARAY A.Ş.']]);
    assert.match(ank[0].macId, /^\d+$/);
  });

  it('ileriki hafta sayfası (12. hafta) da okunur', () => {
    const html = ornek('tff-superlig-hafta12.html');
    assert.equal(tffGuncelHafta(html), 12);
    const g = tffHaftaCoz(html).find((m) => ankaraKulubu(m.ev));
    assert.deepEqual([g.tarih, g.saat], ['21.11.2026', '13:30']);
  });

  it('1. Lig aynı biçimde', () => {
    const html = ornek('tff-1lig.html');
    assert.equal(tffGuncelHafta(html), 10);
    assert.ok(tffHaftaCoz(html).some((m) => /KEÇİÖRENGÜCÜ/.test(m.ev) && m.tarih === '14.10.2026' && m.saat === '20:00'));
  });

  it('2. Lig sezon listesi: sadece oynanmamış maçlar', () => {
    const maclar = tffFiksturCoz(ornek('tff-2lig.html'));
    assert.ok(maclar.length > 50);
    assert.ok(maclar.some((m) => /ANKARAGÜCÜ/.test(m.ev)));
    // 1. haftadaki "MKE ANKARAGÜCÜ 0 - 1 ANKARA DEMİRSPOR" oynandı, listede olmamalı
    assert.ok(!maclar.some((m) => /ANKARAGÜCÜ/.test(m.ev) && /DEMİRSPOR/.test(m.dep) && m.macId === '318962'));
  });

  it('maç ayrıntısı: stadyum ve saat', () => {
    assert.deepEqual(tffMacCoz(ornek('tff-mac.html')), { stad: 'ERYAMAN STADYUMU', tarih: '17.10.2026', saat: '16:00' });
  });

  it('takım adları kısalır', () => {
    assert.equal(takimAdi('KEÇTAŞ ANKARA KEÇİÖRENGÜCÜ'), 'Keçiörengücü');
    assert.equal(takimAdi('MKE ANKARAGÜCÜ'), 'Ankaragücü');
    assert.equal(takimAdi('GALATASARAY A.Ş.'), 'Galatasaray');
    assert.equal(takimAdi('ALAGÖZ HOLDİNG IĞDIR FUTBOL KULÜBÜ'), 'Alagöz Holding Iğdır');
    assert.equal(takimAdi('KCT 1461 TRABZON'), 'KCT 1461 Trabzon');
  });
});

describe('Ankara Büyükşehir', () => {
  it('etkinlik kartları ve Türkçe tarih', () => {
    const l = belediyeCoz(ornek('belediye.html'));
    assert.equal(l.length, 20);
    assert.equal(l[1].baslik, 'Zafer Senfonisi');
    assert.equal(l[1].baslangic, trZaman('2025-08-29', '20:00'));
    assert.equal(trTarihCoz('08 Mart 2024 20:00'), trZaman('2024-03-08', '20:00'));
    assert.equal(trTarihCoz('saçma'), null);
  });
});

describe('birleştirme', () => {
  const mac = (o = {}) => ({
    kaynak: 'tff', tur: 'Futbol', baslik: 'Gençlerbirliği - Galatasaray', mekanAdi: 'Eryaman Stadyumu', ankara: true,
    baslangic: trZaman('2026-10-17', '16:00'), rakip: 'GALATASARAY A.Ş.', ...o,
  });

  it('kimlik tarih + mekân, bitiş türe göre, büyük rakip talebi artırır', () => {
    const [e] = birlestir([mac({ mekanAdi: 'Aktepe Stadyumu' })], SIMDI);
    assert.equal(e.id, '20261017-aktepe');
    assert.equal(e.end - e.start, 2 * SAAT);
    assert.equal(e.demand, 'yuksek'); // 4.900 kişilik "orta" + Galatasaray
  });

  it('geçmiş, 60 günden uzak ve Ankara dışı atılır', () => {
    const l = birlestir(
      [
        mac({ baslangic: trZaman('2026-10-12', '20:00') }),
        mac({ baslangic: trZaman('2027-01-30', '20:00') }),
        { kaynak: 'tsdb', tur: 'Futbol', baslik: 'X - Y', mekanAdi: 'Rams Park', baslangic: SIMDI + 5 * SAAT },
      ],
      SIMDI,
    );
    assert.equal(l.length, 0);
  });

  it('aynı mekân ve yakın saat: öncelikli kaynak kalır; uzak saat ayrı kimlik alır', () => {
    const l = birlestir(
      [
        { kaynak: 'tsdb', tur: 'Futbol', baslik: 'Genclerbirligi vs Galatasaray', mekanAdi: 'Eryaman Stadyumu', baslangic: trZaman('2026-10-17', '16:30') },
        mac(),
        { kaynak: 'belediye', tur: 'Konser', baslik: 'Gece konseri', mekanAdi: 'ERYAMAN STADYUMU', ankara: true, baslangic: trZaman('2026-10-17', '21:00') },
      ],
      SIMDI,
    );
    assert.deepEqual(l.map((e) => [e.id, e.source]), [['20261017-eryaman', 'tff'], ['20261017-eryaman-2', 'belediye']]);
  });

  it('bayram arifesi ve ulusal bayram', () => {
    const t = tatilAdaylari([
      { date: '2026-05-27', localName: 'Kurban Bayramı 1. Gün' },
      { date: '2026-05-28', localName: 'Kurban Bayramı 2. Gün' },
      { date: '2026-10-29', localName: 'Cumhuriyet Bayramı' },
      { date: '2026-05-01', localName: 'İşçi Bayramı' },
    ]);
    assert.deepEqual(t.map((a) => [a.baslik, a.baslangic]), [
      ['Kurban Bayramı arifesi', trZaman('2026-05-26', '10:00')],
      ['Cumhuriyet Bayramı', trZaman('2026-10-29', '09:00')],
    ]);
  });
});

// firebase-admin'in kullandığı kadarını taklit eden sahte Firestore.
function sahteDb(docs) {
  const store = new Map(Object.entries(docs));
  const ops = [];
  return {
    store,
    ops,
    collection: () => ({
      get: async () => ({ docs: [...store].map(([id, d]) => ({ id, data: () => d })) }),
      doc: (id) => id,
    }),
    batch: () => ({
      set: (id, d) => ops.push(['set', id]) && store.set(id, d),
      delete: (id) => ops.push(['delete', id]) && store.delete(id),
      commit: async () => {},
    }),
  };
}

describe('Firestore yazımı', () => {
  const e = (id, source, start, o = {}) => ({ id, city: 'Ankara', cat: 'Futbol', title: id, venue: 'V', start, end: start + 2 * SAAT, demand: 'orta', source, ...o });

  it('değişmeyeni yazmaz; geçmişi ve kaybolan geleceği siler; eksik liste veren ve hatalı kaynağa dokunmaz', async () => {
    const ileri = SIMDI + 48 * SAAT;
    const ayni = e('ayni', 'tff', ileri);
    const db = sahteDb({
      ayni: { ...ayni, updated_at: 1 },
      degisen: { ...e('degisen', 'tff', ileri), updated_at: 1 },
      gecmis: e('gecmis', 'tff', SIMDI - 5 * 24 * SAAT),
      ertelendi: e('ertelendi', 'tff', ileri),
      tsdbEski: e('tsdbEski', 'tsdb', ileri),
      hataliKaynak: e('hataliKaynak', 'belediye', ileri),
    });
    const liste = [ayni, e('degisen', 'tff', ileri, { demand: 'yuksek' }), e('yeni', 'tff', ileri)];
    const rapor = { tff: { aday: 3 }, tsdb: { aday: 0 }, belediye: { hata: '500' } };
    const r = await yaz(db, liste, rapor, SIMDI);
    assert.deepEqual(r, { yazilan: 2, silinen: 2 });
    assert.deepEqual(db.ops.sort(), [['delete', 'ertelendi'], ['delete', 'gecmis'], ['set', 'degisen'], ['set', 'yeni']]);
    assert.equal(db.store.get('ayni').updated_at, 1);
    assert.equal(db.store.get('yeni').updated_at, SIMDI);
  });
});

describe('SerpApi Google Events', async () => {
  const { serpCoz, serpTarihCoz } = await import('../etkinlik/kaynaklar.mjs');
  const json = (f) => JSON.parse(ornek(f));

  it('tarih ve saat: yılsız tarih, AM/PM, aralık, saatsiz, yıl dönümü', () => {
    assert.deepEqual(serpTarihCoz({ start_date: 'Nov 8', when: 'Nov 8, 8:00 PM' }, SIMDI), { baslangic: trZaman('2026-11-08', '20:00'), bitis: null });
    assert.deepEqual(serpTarihCoz({ start_date: 'Nov 8', when: 'Sat, Nov 8, 9 – 11:30 PM' }, SIMDI), {
      baslangic: trZaman('2026-11-08', '21:00'), bitis: trZaman('2026-11-08', '23:30'),
    });
    assert.equal(serpTarihCoz({ start_date: 'Oct 16', when: 'Oct 16, 11:00 PM – 4:00 AM' }, SIMDI).bitis, trZaman('2026-10-17', '04:00'));
    assert.deepEqual(serpTarihCoz({ start_date: 'Oct 21', when: 'Oct 21' }, SIMDI), {
      baslangic: trZaman('2026-10-21', '10:00'), bitis: trZaman('2026-10-21', '18:00'), saatsiz: true,
    });
    assert.equal(serpTarihCoz({ start_date: 'Jan 16', when: 'Jan 16, 9:00 PM' }, SIMDI).baslangic, trZaman('2027-01-16', '21:00'));
    assert.equal(serpTarihCoz({ start_date: 'Oct 12', when: 'Oct 12, 8:00 PM' }, SIMDI).baslangic, trZaman('2026-10-12', '20:00')); // dün: geçen yıl değil, birleştirme atar
    assert.equal(serpTarihCoz({ start_date: '?' }, SIMDI), null);
  });

  it('kaydedilmiş yanıtlar: Ankara dışı ve yanlış dildeki ilanlar atılır, mekân ve tür bulunur', () => {
    const k = serpCoz(json('serpapi-konser.json'), { tur: 'Konser' }, SIMDI);
    assert.equal(k.length, 17); // 18 ilandan Japonca başlıklı olan atıldı
    const l = birlestir([...k, ...serpCoz(json('serpapi-en.json'), { tur: null }, SIMDI)], SIMDI);
    const bul = (t) => l.find((e) => e.title.startsWith(t));
    assert.deepEqual([bul('Simge').venue, bul('Simge').cat, bul('Simge').start], ['Jolly Joker, Kavaklıdere', 'Konser', trZaman('2026-11-08', '20:00')]);
    assert.deepEqual([bul('Turk Telekom').cat, bul('Turk Telekom').venue, bul('Turk Telekom').demand], ['Basketbol', 'Ankara Arena', 'yuksek']);
    assert.equal(bul('VEF').cat, 'Fuar');
    assert.ok(!l.some((e) => /[぀-ヿ一-鿿]/.test(e.title)));
  });
});

describe('api-sports', async () => {
  const { apisportsCoz } = await import('../etkinlik/kaynaklar.mjs');
  it('sadece listedeki Ankara takımlarının iç saha maçları', () => {
    const g = (home, away, date) => ({ date, teams: { home: { id: home, name: `T${home}` }, away: { id: away, name: 'Galatasaray' } } });
    const j = { response: [g(1277, 5, '2026-10-14T19:00:00+03:00'), g(5, 1277, '2026-10-14T22:00:00+03:00'), g(1287, 9, '2026-10-14T17:00:00+03:00')] };
    const a = apisportsCoz(j, { tur: 'Voleybol', takimlar: { 1277: 'ankara-arena', 1287: null } });
    assert.deepEqual(a.map((x) => [x.baslik, x.mekan, x.mekanAdi, x.baslangic]), [
      ['T1277 - Galatasaray', 'ankara-arena', undefined, trZaman('2026-10-14', '19:00')],
      ['T1287 - Galatasaray', undefined, 'Ankara', trZaman('2026-10-14', '17:00')],
    ]);
  });
});
