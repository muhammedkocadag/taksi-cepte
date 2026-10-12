export const fmt = (n: number) => Math.round(n).toLocaleString('tr-TR');

export const tl = (n: number) => '₺' + fmt(n);

export const hm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// "12 Ekim Pazartesi"
export const dayLabel = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${DAYS[d.getDay()]}`;
};

// "12 Ekim 2026"
export const dateLabel = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// "12 Ekim, 14:05" (başka yılsa yıl da yazılır)
export const stampLabel = (t: number) => {
  const d = new Date(t);
  const year = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}, ${hm(t)}`;
};

export const dur =(ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(m / 60)}s ${String(m % 60).padStart(2, '0')}dk`;
};
