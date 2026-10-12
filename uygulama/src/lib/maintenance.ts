import type { IconName } from '@/components/Icon';
import type { Vehicle } from '@/store/db';

import { startOfDay } from './period';

export type MaintKey = 'svc' | 'muayene' | 'sigorta';
export type Urgency = 'acil' | 'yakin' | 'iyi' | 'eksik';

export type MaintItem = { key: MaintKey; icon: IconName; name: string; urgency: Urgency; text: string };

const RANK: Record<Urgency, number> = { acil: 0, yakin: 1, eksik: 2, iyi: 3 };
const DAY = 86_400_000;

export const MAINT_NAME: Record<MaintKey, string> = { svc: 'Genel bakım', muayene: 'Muayene', sigorta: 'Trafik sigortası' };

// Sade liste: "900 km kaldı", "32 gün kaldı". En acil olan üstte.
export function maintItems(v: Vehicle, now = Date.now()): MaintItem[] {
  const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString('tr-TR');
  const out: MaintItem[] = [];

  if (v.svcLast === null) out.push({ key: 'svc', icon: 'wrench', name: MAINT_NAME.svc, urgency: 'eksik', text: 'Bilgi gir' });
  else {
    const rem = v.svcLast + v.svcInt - v.odo;
    out.push({
      key: 'svc',
      icon: 'wrench',
      name: MAINT_NAME.svc,
      urgency: rem < 1000 ? 'acil' : rem < 3000 ? 'yakin' : 'iyi',
      text: `${fmt(rem)} km ${rem < 0 ? 'geçti' : 'kaldı'}`,
    });
  }

  for (const key of ['muayene', 'sigorta'] as const) {
    const icon: IconName = key === 'muayene' ? 'clip' : 'shield';
    const d = v[key];
    if (d === null) {
      out.push({ key, icon, name: MAINT_NAME[key], urgency: 'eksik', text: 'Bilgi gir' });
      continue;
    }
    const rem = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
    out.push({
      key,
      icon,
      name: MAINT_NAME[key],
      urgency: rem < 15 ? 'acil' : rem <= 45 ? 'yakin' : 'iyi',
      text: rem === 0 ? 'Bugün bitiyor' : `${fmt(rem)} gün ${rem < 0 ? 'geçti' : 'kaldı'}`,
    });
  }
  return out.sort((a, b) => RANK[a.urgency] - RANK[b.urgency]);
}

// "Bugün yeniledim": bitiş tarihi bir yıl sonrası.
export const nextYear = (now = Date.now()) => {
  const d = new Date(now);
  return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()).getTime();
};
