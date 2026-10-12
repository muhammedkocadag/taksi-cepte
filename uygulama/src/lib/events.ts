import { addDays, startOfDay } from './period';

// Etkinlik verisi. Aşama 1'de örnek liste; Aşama 2'de her gece Firebase'de birleştirilen
// gerçek liste gelecek (API-Football, API-Basketball, SerpApi Google Events, resmi tatiller).

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

export const DEMAND_LABEL: Record<Demand, string> = { cokYuksek: 'Çok yüksek', yuksek: 'Yüksek', orta: 'Orta' };

// Örnek veriler bugüne göre kurulur ki ekran her gün dolu görünsün.
export function sampleEvents(now = Date.now()): CityEvent[] {
  const t0 = startOfDay(now);
  const ev = (id: string, cat: string, title: string, venue: string, d: number, start: string, end: string, demand: Demand) => ({
    id,
    cat,
    title,
    venue,
    day: addDays(t0, d),
    start,
    end,
    demand,
  });
  return [
    ev('ornek-1', 'Konser', 'Rock Gecesi Konseri', 'Jolly Joker, Kavaklıdere', 0, '21:00', '00:30', 'cokYuksek'),
    ev('ornek-2', 'Basketbol', 'Basketbol Süper Ligi Maçı', 'Ankara Arena', 0, '19:00', '21:00', 'yuksek'),
    ev('ornek-3', 'Futbol', 'Süper Lig Maçı', 'Eryaman Stadyumu', 2, '20:00', '22:00', 'cokYuksek'),
    ev('ornek-4', 'Fuar', 'Kariyer Fuarı', 'ATO Congresium', 4, '10:00', '18:00', 'orta'),
    ev('ornek-5', 'Tören', 'Üniversite Mezuniyet Töreni', 'ODTÜ Kampüsü', 9, '14:00', '17:00', 'yuksek'),
    ev('ornek-6', 'Fuar', 'Ankara Kitap Fuarı', 'ATO Congresium', 16, '10:00', '20:00', 'orta'),
  ];
}

// Şimdilik sadece Ankara.
export const SUPPORTED_CITIES = ['Ankara'];
