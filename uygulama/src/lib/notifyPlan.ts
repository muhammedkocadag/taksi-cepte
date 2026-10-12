import type { Vehicle } from '@/store/db';

import type { CityEvent } from './events';
import { addDays } from './period';

// Hangi bildirimin ne zaman çıkacağını hesaplar (saf fonksiyon; telefona kurma işi notifications.ts'te).

export type Planned = { id: string; at: number; title: string; body: string };

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
  notifShift: boolean;
  notifMaint: boolean;
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

  // Geçmişte kalanlar kurulmaz; aynı anda en fazla 60 (iOS sınırı 64).
  return out
    .filter((p) => p.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, 60);
}
