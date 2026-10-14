// Mağaza ekran görüntüsü görsellerini üretir: lacivert-siyah zemin, üstte başlık (vurgu taksi sarısı),
// ortada telefon çerçevesinde uygulama görüntüsü. Girdi: magaza/ekran-ham/*.png (iPhone ekran görüntüleri).
// Çıktı: magaza/gorseller/ios/ (1290×2796, App Store 6,9") ve magaza/gorseller/android/ (1080×2160, Play 2:1).
//
// Çalıştırma (resvg kurulu bir klasör gerekli):
//   node magaza/araclar/gorsel.cjs <@resvg/resvg-js'in kurulu olduğu node_modules klasörü>
const fs = require('fs');
const path = require('path');

const { Resvg } = require(path.join(process.argv[2], '@resvg', 'resvg-js'));
const { PNG } = require(path.join(process.argv[2], 'pngjs'));

// Durum çubuğunu temizler (mağazalardaki alışkanlık): gerçek saat ve pil yerine "9:41" ve dolu pil.
// Ölçüler iPhone 11 görüntüsüne göre (725 genişlik); bölgeler iki uçtan okunan zemin rengiyle, renk geçişli
// kapatılır. Yazı rengi zeminin parlaklığına göre (koyu temada beyaz, açıkta siyah).
const temizCache = new Map();
function temizEkran(dosya) {
  if (temizCache.has(dosya)) return temizCache.get(dosya);
  const buf = fs.readFileSync(path.join(HAM, dosya));
  const p = PNG.sync.read(buf);
  const k = p.width / 725;
  const renk = (x, y) => {
    const i = (Math.round(y * k) * p.width + Math.round(x * k)) * 4;
    return `rgb(${p.data[i]},${p.data[i + 1]},${p.data[i + 2]})`;
  };
  const parlak = (x, y) => {
    const i = (Math.round(y * k) * p.width + Math.round(x * k)) * 4;
    return 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2];
  };
  const yazi = parlak(45, 43) < 128 ? '#FFFFFF' : '#111111';
  const bolge = (id, x1, x2) => `
    <linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${renk(x1 - 4, 43)}"/><stop offset="1" stop-color="${renk(x2 + 4, 43)}"/></linearGradient>
    <rect x="${x1}" y="24" width="${x2 - x1}" height="38" fill="url(#${id})"/>`;
  const svgEk = `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}" height="${p.height}" viewBox="0 0 725 ${p.height / k}">
    <image href="data:image/png;base64,${buf.toString('base64')}" width="725" height="${p.height / k}"/>
    <defs></defs>
    ${bolge('s', 48, 140)}
    ${bolge('p', 644, 698)}
    <text x="58" y="53" font-family="Segoe UI" font-weight="600" font-size="27" fill="${yazi}">9:41</text>
    <rect x="648" y="33" width="42" height="20" rx="6" fill="${yazi}"/>
    <rect x="692" y="39" width="3" height="8" rx="1.5" fill="${yazi}" opacity="0.6"/>
  </svg>`;
  const png = new Resvg(svgEk, { font: { loadSystemFonts: true }, fitTo: { mode: 'width', value: p.width } }).render().asPng();
  const b64 = png.toString('base64');
  temizCache.set(dosya, b64);
  return b64;
}

const KOK = path.join(__dirname, '..');
const HAM = path.join(KOK, 'ekran-ham');

// Başlık satırları; [metin, vurgu mu]. Sıra mağazadaki sıra: ilk 3 arama sonuçlarında görünür.
const SAYFALAR = [
  { ad: '1-kayit', ekran: ['1-kayit.png'], baslik: [[['Yolculuk bitti,', 0]], [['tek dokunuşla', 1], [' kaydet', 0]]] },
  { ad: '2-ana-sayfa', ekran: ['2-ana-sayfa.png'], baslik: [[['Nakit, POS, Uygulama:', 0]], [['tüm kazancın ', 0], ['tek yerde', 1]]] },
  { ad: '3-analiz', ekran: ['3-analiz.png'], baslik: [[['Ne zaman, ', 0], ['ne kadar', 1]], [['kazandığını gör', 0]]] },
  { ad: '4-arac', ekran: ['4-arac.png'], baslik: [[['Muayene, sigorta, bakım:', 0]], [['hiçbirini ', 0], ['unutma', 1]]] },
  { ad: '5-etkinlik', ekran: ['5-etkinlik.png'], baslik: [[['Maç, konser, fuar:', 0]], [['çıkışta ', 0], ['orada ol', 1]]] },
  { ad: '6-tema', ekran: ['2-ana-sayfa.png', '6-ana-sayfa-acik.png'], baslik: [[['Gece de ', 0], ['gündüz', 1], [' de', 0]], [['rahat okunur', 0]]] },
];

const BOYUTLAR = [
  { klasor: 'ios', w: 1290, h: 2796 },
  { klasor: 'android', w: 1080, h: 2160 },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(sayfa, { w, h }) {
  const s = w / 1290; // ölçek: iOS boyutuna göre
  const fs1 = Math.round(92 * s);
  const satirAra = Math.round(112 * s);
  const ust = Math.round((h / w > 2.1 ? 250 : 190) * s);

  const baslik = sayfa.baslik
    .map((satir, i) => {
      const parcalar = satir
        .map(([t, v]) => `<tspan fill="${v ? '#FACC15' : '#FFFFFF'}">${esc(t)}</tspan>`)
        .join('');
      return `<text x="${w / 2}" y="${ust + i * satirAra}" text-anchor="middle" font-family="Segoe UI" font-weight="700" font-size="${fs1}" letter-spacing="-1">${parcalar}</text>`;
    })
    .join('\n');

  // Telefon(lar): ekran oranı 725×1568. Tek telefon ortada; temada iki telefon büyük, üst üste binmiş ve
  // basamaklı (soldaki koyu yukarıda, sağdaki açık aşağıda ve önde).
  const iki = sayfa.ekran.length === 2;
  const telUst = ust + satirAra * (sayfa.baslik.length - 1) + Math.round(110 * s);
  const kalan = h - telUst - Math.round(90 * s);
  const oran = 1568 / 725;
  const kaydir = iki ? Math.round(260 * s) : 0; // ikinci telefon ne kadar aşağıda
  const ekW = Math.min(iki ? w * 0.58 : w * 0.78, (kalan - kaydir) / oran);
  const ekH = ekW * oran;
  const cerceve = Math.round(18 * s);
  const r = Math.round(70 * s * (ekW / (w * 0.78)));

  const telefonlar = sayfa.ekran
    .map((dosya, i) => {
      const veri = temizEkran(dosya);
      const kenar = Math.round(50 * s) + cerceve;
      const x = iki ? (i === 0 ? kenar : w - kenar - ekW) : (w - ekW) / 2;
      const y = telUst + cerceve + (i === 1 ? kaydir : 0);
      const id = `k${i}`;
      return `
  <rect x="${x - cerceve}" y="${y - cerceve}" width="${ekW + 2 * cerceve}" height="${ekH + 2 * cerceve}" rx="${r + cerceve}" fill="#0b0b10" stroke="#3a3a46" stroke-width="${Math.max(2, 3 * s)}"/>
  <clipPath id="${id}"><rect x="${x}" y="${y}" width="${ekW}" height="${ekH}" rx="${r}"/></clipPath>
  <image href="data:image/png;base64,${veri}" x="${x}" y="${y}" width="${ekW}" height="${ekH}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="zemin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgb(21,20,72)"/>
      <stop offset="1" stop-color="rgb(9,9,24)"/>
    </linearGradient>
    <radialGradient id="isik" cx="0.85" cy="0.05" r="0.6">
      <stop offset="0" stop-color="#FACC15" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#FACC15" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#zemin)"/>
  <rect width="${w}" height="${h}" fill="url(#isik)"/>
  ${baslik}
  ${telefonlar}
</svg>`;
}

for (const boyut of BOYUTLAR) {
  const dir = path.join(KOK, 'gorseller', boyut.klasor);
  fs.mkdirSync(dir, { recursive: true });
  for (const sayfa of SAYFALAR) {
    if (!sayfa.ekran.every((d) => fs.existsSync(path.join(HAM, d)))) {
      console.log(`atlandı (ekran görüntüsü yok): ${sayfa.ad}`);
      continue;
    }
    const png = new Resvg(svg(sayfa, boyut), { font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } })
      .render()
      .asPng();
    fs.writeFileSync(path.join(dir, `${sayfa.ad}.png`), png);
    console.log(`${boyut.klasor}/${sayfa.ad}.png`);
  }
}

// Google Play: tanıtım görseli (1024×500, solda logo, sağda alt başlık) ve 512×512 ikon (uygulama ikonundan).
{
  const dir = path.join(KOK, 'gorseller', 'android');
  const marka = path.join(KOK, '..', 'uygulama', 'assets');
  const logo = fs.readFileSync(path.join(marka, 'brand', 'logo.svg')).toString('base64');
  const w = 1024;
  const h = 500;
  const tanitim = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="z" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgb(21,20,72)"/>
      <stop offset="1" stop-color="rgb(9,9,24)"/>
    </linearGradient>
    <radialGradient id="i" cx="0.2" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FACC15" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#FACC15" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#z)"/>
  <rect width="${w}" height="${h}" fill="url(#i)"/>
  <image href="data:image/svg+xml;base64,${logo}" x="70" y="40" width="270" height="420" preserveAspectRatio="xMidYMid meet"/>
  <text x="400" y="200" font-family="Segoe UI" font-weight="700" font-size="58" fill="#FFFFFF" letter-spacing="-1">Taksici</text>
  <text x="400" y="270" font-family="Segoe UI" font-weight="700" font-size="58" fill="#FACC15" letter-spacing="-1">gelir-gider defteri</text>
  <text x="402" y="335" font-family="Segoe UI" font-weight="400" font-size="30" fill="#C9C9D6">Tek dokunuşla kaydet, net kârını gör.</text>
</svg>`;
  const ayar = { font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } };
  fs.writeFileSync(path.join(dir, 'tanitim-1024x500.png'), new Resvg(tanitim, ayar).render().asPng());
  console.log('android/tanitim-1024x500.png');

  const ikon = fs.readFileSync(path.join(marka, 'icon.png')).toString('base64');
  const ikonSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><image href="data:image/png;base64,${ikon}" width="512" height="512"/></svg>`;
  fs.writeFileSync(path.join(dir, 'ikon-512.png'), new Resvg(ikonSvg).render().asPng());
  console.log('android/ikon-512.png');
}
