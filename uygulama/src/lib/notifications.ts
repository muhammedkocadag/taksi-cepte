import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import type { Planned } from './notifyPlan';

// Android'deki Expo Go expo-notifications yüklenince çöküyor (SDK 53+). Orada bildirimler kapalı;
// iPhone Expo Go'da ve gerçek derlemede çalışır.
const unsupported = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const Notifications: typeof import('expo-notifications') | null = unsupported ? null : require('expo-notifications');

// Uygulama açıkken gelen bildirim de üstte görünsün.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'hatirlatmalar';

// Bütün bekleyen bildirimleri silip plana göre baştan kurar. İzin yoksa (ve plan boş değilse) bir kez sorar.
export async function applyPlan(items: Planned[]) {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (items.length === 0) return;

  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return;

  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Hatırlatmalar',
      importance: Notifications.AndroidImportance.HIGH,
    });

  for (const p of items)
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: p.title, body: p.body, sound: true, data: p.url ? { url: p.url } : {} },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(p.at), channelId: CHANNEL },
    });
}

export type PermState = 'granted' | 'ask' | 'denied' | 'unknown';

// Ayarlar ekranı için: izin durumu; uygulamaya geri dönünce (telefon ayarlarından) yenilenir.
export function useNotifPermission() {
  const [state, setState] = useState<PermState>('unknown');

  const refresh = useCallback(async () => {
    if (!Notifications) return setState('denied');
    const p = await Notifications.getPermissionsAsync();
    setState(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'denied');
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const fix = useCallback(async () => {
    if (!Notifications) return;
    const p = await Notifications.getPermissionsAsync();
    if (p.canAskAgain) await Notifications.requestPermissionsAsync();
    else await Linking.openSettings();
    refresh();
  }, [refresh]);

  return { state, fix };
}

// Bildirime dokununca `data.url` ekranını açar (uygulama kapalıyken dokunulduysa açılışta da).
// Her dokunuş bir kez işlenir: "son dokunulan bildirim" sonraki açılışlarda da döndüğü için.
const handledTaps = new Set<string>();

export function useNotificationTaps(open: (url: string) => void) {
  useEffect(() => {
    if (!Notifications) return;
    const handle = (r: import('expo-notifications').NotificationResponse | null) => {
      if (!r) return;
      const key = `${r.notification.request.identifier}@${r.notification.date}`;
      if (handledTaps.has(key)) return;
      handledTaps.add(key);
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string') open(url);
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [open]);
}

// Sadece geliştirme: bir bildirimi 5 sn sonra gösterir (Ayarlar'daki deneme satırı). Planlı bildirimlere dokunmaz.
export async function testNotification(p: { title: string; body: string; url?: string }) {
  if (!Notifications) return;
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: p.title, body: p.body, sound: true, data: p.url ? { url: p.url } : {} },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
}
