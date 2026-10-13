import type { Vehicle } from '@/store/db';

import type { CityEvent } from './events';
import { addDays, monday } from './period';

// Hangi bildirimin ne zaman çıkacağını hesaplar (saf fonksiyon; telefona kurma işi notifications.ts'te).

// url: bildirime dokununca açılacak ekran (NotificationSync yönlendirir).
export type Planned = { id: string; at: number; title: string; body: string; url?: string };

export const OPEN_SHIFT_MS = 14 * 3_600_000;
const MAINT_DAYS_BEFORE = 7;

const at = (day: number, h: number, m = 0) => {
  const d = new Date(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
};
const dayMonth = (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

export function plan(input: {
  now: number;
  shiftStart: number | null; // açık vardiyanın başlangıcı
  vehicle: Vehicle | null;
  events: CityEvent[]; // zili açık etkinlikler
  cityEvents: CityEvent[]; // şehrin bütün etkinlikleri (haftalık özet için)
  city: string;
  notifShift: boolean;
  notifMaint: boolean;
  notifWeekly: boolean;
}): Planned[] {
  const { now, shiftStart, vehicle, events } = input;
  const out: Planned[] = [];

  if (input.notifShift && shiftStart !== null)
    out.push({
      id: 'vardiya-acik',
      at: shiftStart + OPEN_SHIFT_MS,
      title: 'Vardiyan 14 saattir açık',
      body: 'Bitirmeyi unuttuysan ana sayfadan Bitir\'e dokun.',
    });

  if (input.notifMaint && vehicle) {
    const items: [string, string, number | null][] = [
      ['muayene', 'Muayene', vehicle.muayene],
      ['sigorta', 'Trafik sigortası', vehicle.sigorta],
    ];
    for (const [key, name, due] of items) {
      if (due === null) continue;
      out.push({
        id: `${key}-7gun`,
        at: at(addDays(due, -MAINT_DAYS_BEFORE), 10),
        title: `${name} yaklaşıyor`,
        body: `${name} ${dayMonth(due)} tarihinde bitiyor. ${MAINT_DAYS_BEFORE} gün kaldı.`,
      });
      out.push({
        id: `${key}-gun`,
        at: at(due, 9),
        title: `${name} bugün bitiyor`,
        body: 'Yenilediysen Araç ekranında "Bugün yeniledim"e dokun.',
      });
    }
  }

  for (const e of events) {
    const [h, m] = e.start.split(':').map(Number);
    const startAt = at(e.day, h, m);
    out.push({
      id: `etkinlik-${e.id}-once`,
      at: at(addDays(e.day, -1), 18),
      title: `Yarın: ${e.title}`,
      body: `${e.venue} · ${e.start} – ${e.end}`,
    });
    // Etkinlik günü: başlamadan 2 saat önce, ama sabah 8'den erken değil.
    out.push({
      id: `etkinlik-${e.id}-gun`,
      at: Math.max(startAt - 2 * 3_600_000, at(e.day, 8)),
      title: `Bugün: ${e.title}`,
      body: `${e.start}'de ${e.venue}. Bitiş ${e.end}; çıkışta orada ol.`,
    });
  }

  // Haftalık özet (Uber'in "Bu hafta neler var"ı gibi): pazartesi 10:00, bu ve sonraki hafta.
  if (input.notifWeekly)
    for (const w of [0, 1, 2]) {
      const start = addDays(monday(now), 7 * w);
      const digest = weeklyDigest(input.cityEvents, start, input.city);
      if (digest) out.push({ id: `haftalik-${start}`, at: at(start, WEEKLY_HOUR), url: '/etkinlik', ...digest });
    }

  // Geçmişte kalanlar kurulmaz; aynı anda en fazla 60 (iOS sınırı 64).
  return out
    .filter((p) => p.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, 60);
}

const WEEKLY_HOUR = 10;

// O hafta (pazartesi 10:00'dan pazar sonuna) etkinlik varsa özet bildirimi; yoksa null (bildirim çıkmaz).
// İçerik bilerek verilmez (kullanıcı istedi): ad ve sayı yok, uygulamaya girip bakması için merak uyandırır.
export function weeklyDigest(events: CityEvent[], weekStart: number, city: string): { title: string; body: string } | null {
  const from = at(weekStart, WEEKLY_HOUR);
  const to = addDays(weekStart, 7);
  const any = events.some((e) => e.day >= weekStart && e.day < to && at(e.day, 23, 59) >= from);
  if (!any) return null;
  return { title: 'Bu hafta neler var', body: `${inCity(city)} bu haftanın en kalabalık etkinliklerini ve çıkış saatlerini gör.` };
}

// Bulunma eki, ünlü ve ünsüz uyumuyla: Ankara'da, İzmir'de, Muş'ta, Eskişehir'de, Kars'ta.
export function inCity(city: string) {
  const vowels = [...city.toLocaleLowerCase('tr')].filter((ch) => 'aeıioöuü'.includes(ch));
  const back = 'aıou'.includes(vowels.at(-1) ?? 'a');
  const hard = 'çfhkpsşt'.includes(city.toLocaleLowerCase('tr').at(-1) ?? '');
  return `${city}'${hard ? 't' : 'd'}${back ? 'a' : 'e'}`;
}
