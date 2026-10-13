import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { SUPPORTED_CITIES, cityEvents } from '@/lib/events';
import { applyPlan, useNotificationTaps } from '@/lib/notifications';
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
    const all = SUPPORTED_CITIES.includes(profile.il) ? cityEvents() : [];
    return plan({
      now: Date.now(),
      shiftStart: current?.start ?? null,
      vehicle,
      events: all.filter((e) => ids.includes(e.id)),
      cityEvents: all,
      city: profile.il,
      notifShift: settings.notifShift !== '0',
      notifMaint: settings.notifMaint !== '0',
      notifWeekly: settings.notifWeekly !== '0',
    });
  }, [profile, current?.start, vehicle, bells, settings.notifShift, settings.notifMaint, settings.notifWeekly]);

  const open = useCallback((url: string) => {
    if (profile) router.push(url as never);
  }, [profile]);
  useNotificationTaps(open);

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
