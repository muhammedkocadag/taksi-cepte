import { useEffect, useMemo } from 'react';

import { sampleEvents } from '@/lib/events';
import { applyPlan } from '@/lib/notifications';
import { plan } from '@/lib/notifyPlan';
import { useProfile } from '@/store/profile';
import { useShift } from '@/store/shift';
import { useVehicle } from '@/store/vehicle';

// Görünmez: vardiya, araç, ayarlar ya da etkinlik zilleri değişince telefondaki bildirimleri yeniden kurar.
export function NotificationSync() {
  const { current } = useShift();
  const { vehicle } = useVehicle();
  const { profile, settings } = useProfile();

  const bells = settings.evBells ?? '[]';
  const items = useMemo(() => {
    if (!profile) return [];
    let ids: string[] = [];
    try {
      ids = JSON.parse(bells);
    } catch {}
    return plan({
      now: Date.now(),
      shiftStart: current?.start ?? null,
      vehicle,
      events: sampleEvents().filter((e) => ids.includes(e.id)),
      notifShift: settings.notifShift !== '0',
      notifMaint: settings.notifMaint !== '0',
    });
  }, [profile, current?.start, vehicle, bells, settings.notifShift, settings.notifMaint]);

  // Aynı plan tekrar kurulmasın diye anahtar: kimlik + zaman.
  const key = items.map((p) => `${p.id}@${p.at}`).join('|');
  useEffect(() => {
    // Kısa bekleme: art arda değişikliklerde tek kurulum.
    const id = setTimeout(() => {
      applyPlan(items).catch(() => {});
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
