import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { cloudEnabled, currentUser } from '@/lib/auth';
import { deviceInfo } from '@/lib/deviceInfo';
import { syncNow } from '@/store/account';
import { useProfile } from '@/store/profile';
import { useShift } from '@/store/shift';
import { useVehicle } from '@/store/vehicle';

// Görünmez: kayıtları bulutla eşitler (src/store/sync.ts). Ne zaman: uygulama açılınca, öne gelince ve bir şey
// değiştikten birkaç saniye sonra. Buluttan yeni veri gelirse ekranlar veritabanından yeniden okur.
// İnternet yoksa sessizce vazgeçer; kayıtlar telefonda durur, bir sonraki turda gider.
// Ayrıca yönetim paneli için hesap kaydını (cihaz, son giriş) günceller.
const DEBOUNCE_MS = 3000;

export function CloudSync() {
  return cloudEnabled ? <Syncer /> : null;
}

function Syncer() {
  const db = useSQLiteContext();
  const { profile, settings, reloadFromDb } = useProfile();
  const { current, past } = useShift();
  const { vehicle } = useVehicle();
  const running = useRef(false);
  const again = useRef(false);

  const run = useCallback(async () => {
    const user = currentUser();
    if (!profile || !user) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      const r = await syncNow(db, user.uid);
      if (r && r.pulled > 0) reloadFromDb();
    } catch {
      // ağ yok ya da zaman aşımı: işaretler ilerlemedi, sonraki tur yeniden dener
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        run();
      }
    }
  }, [db, profile, reloadFromDb]);

  // Açılış ve öne gelme: eşitle + hesap kaydı (en çok 6 saatte bir yazar).
  const signedIn = !!profile;
  useEffect(() => {
    if (!signedIn) return;
    const touch = () => {
      const u = currentUser();
      if (u) require('@/lib/cloud').touchAccount(u.uid, u.phone, deviceInfo()).catch(() => {});
    };
    run();
    touch();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        run();
        touch();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Değişiklikten sonra (vardiya, kayıt, araç, ayarlar) kısa bekleyip gönder.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(run, DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, past, vehicle, settings]);

  return null;
}
