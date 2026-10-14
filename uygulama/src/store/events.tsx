import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { cloudEnabled, currentUser } from '@/lib/auth';
import { SNAPSHOT, SNAPSHOT_AT, SUPPORTED_CITIES, toCityEvents, type CityEvent, type EventDoc } from '@/lib/events';

import { useProfile } from './profile';

// Şehrin etkinlik listesi. Kaynak Firestore `events` (gece görevi her gece 03:30'da günceller). Telefonda önbellek
// (`eventsCache` ayarı: buluta gitmez), internet yokken son liste görünür. Açılışta ve öne gelince, son okumadan
// 6 saat geçtiyse tazelenir. Expo Go'da ya da hiç okunamamışsa uygulamanın içindeki yedek liste (SNAPSHOT).

const REFRESH_MS = 6 * 3_600_000;

type Cache = { at: number; docs: EventDoc[] };
type EventsValue = { events: CityEvent[]; fetchedAt: number; live: boolean };

const EventsContext = createContext<EventsValue | null>(null);

function readCache(db: ReturnType<typeof useSQLiteContext>): Cache | null {
  const r = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'eventsCache'");
  try {
    const c = JSON.parse(r?.value ?? 'null');
    return c && Array.isArray(c.docs) && typeof c.at === 'number' ? c : null;
  } catch {
    return null;
  }
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { profile, dataVersion } = useProfile();
  const [cache, setCache] = useState<Cache | null>(() => readCache(db));

  // Çıkış ya da hesap değişince (veritabanı silinip yeniden yüklenince) önbellek de yeniden okunur.
  useEffect(() => setCache(readCache(db)), [db, dataVersion, profile?.phone]);

  const il = profile?.il ?? '';
  const refresh = useCallback(
    async (force = false) => {
      if (!cloudEnabled || !profile || !SUPPORTED_CITIES.includes(il) || !currentUser()) return;
      const old = readCache(db);
      if (!force && old && Date.now() - old.at < REFRESH_MS) return;
      try {
        const docs: EventDoc[] = await require('@/lib/cloud').fetchEvents(il);
        const next = { at: Date.now(), docs };
        db.runSync(
          `INSERT INTO settings (key, value, updated_at) VALUES ('eventsCache', ?, 0)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [JSON.stringify(next)],
        );
        setCache(next);
      } catch {
        // internet yok: son liste kalır
      }
    },
    [db, il, profile],
  );

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo<EventsValue>(() => {
    const src = cache ?? { at: SNAPSHOT_AT, docs: SNAPSHOT };
    return { events: toCityEvents(src.docs), fetchedAt: src.at, live: !!cache };
  }, [cache]);

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useCityEvents() {
  const v = useContext(EventsContext);
  if (!v) throw new Error('useCityEvents EventsProvider içinde kullanılmalı');
  return v;
}
