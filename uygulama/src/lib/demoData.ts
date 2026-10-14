import type { SQLiteDatabase } from 'expo-sqlite';

import { saveEntry, saveSettings, saveShift, saveVehicle } from '@/store/db';
import type { Category } from '@/store/shift';

import { addDays, startOfDay } from './period';

// SADECE GELİŞTİRME (Ayarlar'da __DEV__ satırı): mağaza ekran görüntüleri için gerçekçi ama uydurma veri.
// Son 4 haftanın vardiyaları (pazar izin), şu an açık bir vardiya, araç ve hedef. Var olan vardiya ve kayıtlar
// yumuşak silinir (eşitlemeyle buluttan da silinsin diye). Aynı tohumla hep aynı veri çıkar.

const H = 3_600_000;
const M = 60_000;

// Tekrarlanabilir rastgele (mulberry32).
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedDemo(db: SQLiteDatabase, now = Date.now()) {
  const r = rng(20261014);
  const between = (a: number, b: number) => a + r() * (b - a);
  const round10 = (n: number) => Math.round(n / 10) * 10;
  let n = 0;
  const id = (p: string) => `demo-${p}-${(n++).toString(36)}`;

  // Yolculuk tutarı: çoğu kısa, bazen uzun, arada bir Esenboğa.
  const fare = () => {
    const x = r();
    if (x < 0.06) return round10(between(850, 1150));
    if (x < 0.3) return round10(between(320, 620));
    return round10(between(130, 300));
  };
  const payment = (): Category => {
    const x = r();
    return x < 0.45 ? 'Nakit' : x < 0.8 ? 'POS' : 'Uygulama';
  };

  // growth: haftadan haftaya hafif artış (analiz ekranında "geçen haftaya göre" rozeti yeşil çıksın).
  const fillShift = (start: number, end: number, trips: number, sid: string, growth = 1) => {
    const span = end - start;
    for (let i = 0; i < trips; i++) {
      const at = start + Math.round(((i + 0.5) / trips) * span + between(-8, 8) * M);
      saveEntry(db, sid, { id: id('e'), at, category: payment(), amount: round10(fare() * growth) });
    }
    saveEntry(db, sid, { id: id('e'), at: start + span * 0.35, category: 'Yakıt', amount: round10(between(950, 1450)) });
    saveEntry(db, sid, { id: id('e'), at: start + span * 0.55, category: 'Yemek', amount: round10(between(160, 260)) });
    if (r() < 0.25) saveEntry(db, sid, { id: id('e'), at: start + span * 0.8, category: 'Diğer', amount: round10(between(80, 250)) });
  };

  db.withTransactionSync(() => {
    const t = Date.now();
    db.runSync('UPDATE entries SET deleted = 1, updated_at = ? WHERE deleted = 0', [t]);
    db.runSync('UPDATE shifts SET deleted = 1, updated_at = ? WHERE deleted = 0', [t]);

    const today = startOfDay(now);
    for (let d = 28; d >= 1; d--) {
      const day = addDays(today, -d);
      if (new Date(day).getDay() === 0) continue; // pazar izin
      const start = day + 7 * H + Math.round(between(0, 90)) * M;
      const end = start + Math.round(between(9, 11.5) * 60) * M;
      const sid = id('s');
      saveShift(db, { id: sid, start, end, km: Math.round(between(170, 260)) });
      fillShift(start, end, Math.round(between(18, 27)), sid, 0.82 + (28 - d) * 0.009);
    }

    // Açık vardiya: 5 sa 20 dk önce başladı, 11 yolculuk.
    const openStart = now - (5 * H + 20 * M);
    const open = id('s');
    saveShift(db, { id: open, start: openStart, end: null, km: null });
    fillShift(openStart, now - 6 * M, 11, open);

    saveVehicle(db, {
      plate: '06 TC 4821',
      model: 'Fiat Egea',
      year: 2022,
      fuel: 'Benzin/LPG',
      odo: 148_250,
      odoAt: now - 3 * H,
      svcLast: 139_150,
      svcInt: 10_000,
      muayene: addDays(today, 32),
      sigorta: addDays(today, 118),
    });
  });
  // saveSettings kendi işlemini açıyor: iç içe işlem olmasın diye dışarıda.
  saveSettings(db, { name: 'Mehmet', goalOn: '1', goal: '5000' });
}
