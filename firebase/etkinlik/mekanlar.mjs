// Ankara mekânları: beklenen talep kapasiteden hesaplanır. Kapasiteler yaklaşık (kamuya açık bilgiler);
// yayından önce bir hafta gerçek listelerle karşılaştırılırken düzeltilecek.
// `ad` uygulamada görünen ad; `esler` kaynaklardaki farklı yazımlar (küçük harf, Türkçe karaktersiz karşılaştırılır).

export const MEKANLAR = [
  { kod: 'eryaman', ad: 'Eryaman Stadyumu', kapasite: 20560, esler: ['eryaman', 'ankara stadium', 'yeni ankara stadyumu'] },
  { kod: 'aktepe', ad: 'Aktepe Stadyumu, Keçiören', kapasite: 4900, esler: ['aktepe', 'kecioren'] },
  { kod: 'ankara-arena', ad: 'Ankara Arena', kapasite: 10400, esler: ['ankara arena'] },
  { kod: 'ankara-spor-salonu', ad: 'Ankara Spor Salonu', kapasite: 4500, esler: ['ankara spor salonu', 'ataturk spor salonu'] },
  { kod: 'baskent-voleybol', ad: 'Başkent Voleybol Salonu', kapasite: 1500, esler: ['baskent voleybol', 'tvf baskent'] },
  { kod: 'congresium', ad: 'ATO Congresium', kapasite: 6000, esler: ['congresium'] },
  { kod: 'cso-ada', ad: 'CSO Ada Ankara', kapasite: 2000, esler: ['cso ada', 'cumhurbaskanligi senfoni'] },
  { kod: 'jolly-joker', ad: 'Jolly Joker, Kavaklıdere', kapasite: 1500, esler: ['jolly joker'] },
  { kod: 'odtu-kkm', ad: 'ODTÜ Kültür ve Kongre Merkezi', kapasite: 1500, esler: ['odtu kultur', 'metu culture'] },
  { kod: 'mebsura', ad: 'MEB Şura Salonu', kapasite: 1000, esler: ['meb sura', 'sura salonu'] },
  { kod: 'cermodern', ad: 'CerModern', kapasite: 1000, esler: ['cermodern'] },
  { kod: 'genclik-parki', ad: 'Gençlik Parkı', kapasite: 5000, esler: ['genclik parki'] },
  { kod: 'altinpark', ad: 'Altınpark', kapasite: 15000, esler: ['altinpark'] },
  { kod: 'milyon', ad: 'Milyon Performance Hall', kapasite: 2500, esler: ['milyon'] },
  { kod: 'if-ankara', ad: 'IF Performance Hall', kapasite: 1200, esler: ['if performance'] },
  { kod: 'cso-tarihi', ad: 'CSO Tarihi Salon', kapasite: 600, esler: ['cso tarihi'] },
  { kod: 'sheraton', ad: 'Sheraton Ankara Kongre Merkezi', kapasite: 2000, esler: ['sheraton ankara'] },
  { kod: 'neset-ertas', ad: 'Neşet Ertaş Kültür Merkezi', kapasite: 1000, esler: ['neset ertas'] },
];

// Ankara basketbol ve voleybol takımları (TheSportsDB kimlikleri) ve iç saha mekânları.
// Futbol TFF'den gelir (kaynaklar.mjs), orada iç saha takımı adından anlaşılır.
export const TAKIMLAR = [
  { id: '136326', ad: 'Türk Telekom', tur: 'Basketbol', mekan: 'ankara-arena' },
  { id: '147796', ad: 'Ankara DSİ', tur: 'Basketbol', mekan: 'ankara-spor-salonu' },
  { id: '136621', ad: 'Halkbank', tur: 'Voleybol', mekan: 'baskent-voleybol' },
];

// TFF'de iç saha takımı Ankara kulübü mü (Gençlerbirliği, Ankaragücü, Keçiörengücü, Ankara Demirspor...).
export const ankaraKulubu = (ad) => /ankara|genclerbirligi/.test(sade(ad));

// Taraftarı kalabalık deplasman takımları: maçın talebini bir kademe artırır.
export const BUYUK_TAKIMLAR = ['galatasaray', 'fenerbahce', 'besiktas', 'trabzonspor', 'fenerbahce beko', 'anadolu efes'];

export function sade(s) {
  return String(s ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function mekanBul(ad) {
  const s = sade(ad);
  if (!s) return null;
  return MEKANLAR.find((m) => m.esler.some((e) => s.includes(e))) ?? null;
}
