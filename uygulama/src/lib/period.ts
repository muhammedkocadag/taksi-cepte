import { isIncome, type Category, type Shift } from '@/store/shift';

// Analiz ekranının tarih hesapları. Vardiya, başladığı güne yazılır.

export const HOUR = 3_600_000;
export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
// Takvim günü ekler (yaz saati değişse de doğru gün).
export const addDays = (t: number, n: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
};
export const monday = (t: number) => {
  const d = new Date(startOfDay(t));
  return addDays(d.getTime(), -((d.getDay() + 6) % 7));
};
export const dayDiff = (a: number, b: number) => Math.round((startOfDay(a) - startOfDay(b)) / 86_400_000);

export type Mode = 'gun' | 'hafta' | 'yil';
export type Period = { mode: Mode; off: number; month: number | null };

export type Range = {
  a: number;
  b: number;
  pa: number; // karşılaştırılan önceki dönem
  pb: number;
  ya: number; // aylık görünümde yılın sınırları
  yb: number;
  cmp: string;
  label: string;
  canFwd: boolean;
};

export function rangeOf({ mode, off, month }: Period, now = Date.now()): Range {
  const today = startOfDay(now);
  const n = new Date(now);
  if (mode === 'gun') {
    const a = addDays(today, off);
    const d = new Date(a);
    const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return {
      a,
      b: addDays(a, 1),
      pa: addDays(a, -1),
      pb: a,
      ya: 0,
      yb: 0,
      cmp: off === 0 ? 'Düne göre' : 'Önceki güne göre',
      label: off === 0 ? `Bugün, ${base}` : off === -1 ? `Dün, ${base}` : `${base} ${DAYS[d.getDay()]}`,
      canFwd: off < 0,
    };
  }
  if (mode === 'hafta') {
    const a = addDays(monday(today), off * 7);
    const s = new Date(a);
    const e = new Date(addDays(a, 6));
    const range =
      s.getMonth() === e.getMonth()
        ? `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]}`
        : `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`;
    return {
      a,
      b: addDays(a, 7),
      pa: addDays(a, -7),
      pb: a,
      ya: 0,
      yb: 0,
      cmp: 'Geçen haftaya göre',
      label: (off === 0 ? 'Bu hafta · ' : '') + range,
      canFwd: off < 0,
    };
  }
  const y = n.getFullYear() + off;
  const ya = new Date(y, 0, 1).getTime();
  const yb = new Date(y + 1, 0, 1).getTime();
  if (month !== null) {
    const a = new Date(y, month, 1).getTime();
    return {
      a,
      b: new Date(y, month + 1, 1).getTime(),
      pa: new Date(y, month - 1, 1).getTime(),
      pb: a,
      ya,
      yb,
      cmp: 'Önceki aya göre',
      label: `${MONTHS[month]} ${y}`,
      canFwd: off < 0 || month < n.getMonth(),
    };
  }
  // Bu yıl: geçen yılın aynı tarihine kadarıyla karşılaştır.
  const pb = off === 0 ? addDays(new Date(y - 1, n.getMonth(), n.getDate()).getTime(), 1) : ya;
  return { a: ya, b: yb, pa: new Date(y - 1, 0, 1).getTime(), pb, ya, yb, cmp: 'Geçen yıla göre', label: String(y), canFwd: off < 0 };
}

// ‹ › ile bir dönem ileri/geri.
export function step(p: Period, d: number, now = Date.now()): Period {
  if (p.mode !== 'yil' || p.month === null) return { ...p, off: p.off + d };
  let { off, month } = p;
  month += d;
  if (month < 0) {
    month = 11;
    off--;
  } else if (month > 11) {
    month = 0;
    off++;
  }
  const n = new Date(now);
  if (off > 0 || (off === 0 && month > n.getMonth())) return p;
  return { ...p, off, month };
}

export type Agg = {
  revenue: number;
  expense: number;
  net: number;
  trips: number;
  shifts: number;
  ms: number;
  km: number;
  kmNet: number; // sadece km girilmiş vardiyaların neti
  byCategory: Record<Category, number>;
};

export function aggregate(list: Shift[], now = Date.now()): Agg {
  const a: Agg = {
    revenue: 0,
    expense: 0,
    net: 0,
    trips: 0,
    shifts: list.length,
    ms: 0,
    km: 0,
    kmNet: 0,
    byCategory: { Nakit: 0, POS: 0, Uygulama: 0, Yakıt: 0, Yemek: 0, Diğer: 0 },
  };
  for (const s of list) {
    a.ms += (s.end ?? now) - s.start;
    let rev = 0;
    let exp = 0;
    for (const e of s.entries) {
      a.byCategory[e.category] += e.amount;
      if (isIncome(e.category)) {
        rev += e.amount;
        a.trips++;
      } else exp += e.amount;
    }
    a.revenue += rev;
    a.expense += exp;
    if (s.km) {
      a.km += s.km;
      a.kmNet += rev - exp;
    }
  }
  a.net = a.revenue - a.expense;
  return a;
}

export const inRange = (list: Shift[], a: number, b: number) => list.filter((s) => s.start >= a && s.start < b);

// Çubuk üstü kısa tutar: 850, 1,2 bin, 14 bin
export const compact = (n: number) =>
  n < 1000 ? String(Math.round(n)) : (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.', ',').replace(',0', '') + ' bin';
