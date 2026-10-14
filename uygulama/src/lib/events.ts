import anlik from './etkinlik-anlik.json';
import { startOfDay } from './period';

// Etkinlik verisi. Gece görevi (firebase/etkinlik/, GitHub Actions) gerçek Ankara etkinliklerini toplayıp
// Firestore `events`'e yazar; uygulama oradan okur (src/store/events.tsx, telefonda önbellek).
// `etkinlik-anlik.json` yedektir: Expo Go'da (Firestore yok) ve buluttan hiç okunamamışsa gösterilir
// (yenilemek için firebase/ içinde `npm run etkinlik -- --uygulama`).

export type Demand = 'cokYuksek' | 'yuksek' | 'orta';

export type CityEvent = {
  id: string;
  cat: string; // Konser, Futbol, Fuar...
  title: string;
  venue: string;
  day: number; // başladığı günün 00:00'ı
  start: string; // "21:00"
  end: string;
  demand: Demand; // mekân kapasitesinden hesaplanan beklenen talep
};

// Firestore `events` belgesi (firebase/etkinlik/birlestir.mjs çıktısı).
export type EventDoc = { id: string; cat: string; title: string; venue: string; start: number; end: number; demand: Demand };

export const DEMAND_LABEL: Record<Demand, string> = { cokYuksek: 'Çok yüksek', yuksek: 'Yüksek', orta: 'Orta' };

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function fromDoc(d: EventDoc): CityEvent {
  return { id: d.id, cat: d.cat, title: d.title, venue: d.venue, day: startOfDay(d.start), start: hhmm(d.start), end: hhmm(d.end), demand: d.demand };
}

// Bitmemiş etkinlikler (devam eden de görünür).
export const toCityEvents = (docs: EventDoc[], now = Date.now()): CityEvent[] =>
  docs.filter((e) => e.end > now).map(fromDoc);

// Uygulamanın içindeki yedek liste ve alındığı an.
export const SNAPSHOT: EventDoc[] = anlik.etkinlikler as EventDoc[];
export const SNAPSHOT_AT: number = anlik.alindi;

// Şimdilik sadece Ankara.
export const SUPPORTED_CITIES = ['Ankara'];
