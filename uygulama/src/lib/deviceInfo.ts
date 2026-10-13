import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Yönetim paneli için cihaz bilgisi (Firestore `accounts/{uid}`, kurallar: firebase/firestore.rules → validAccount).
// Gizlilik metninde ve mağaza beyanlarında "cihaz bilgisi" olarak yazılı (magaza/metinler.md). Konum, reklam kimliği yok.
export type DeviceInfo = { platform: 'ios' | 'android'; os: string; model: string; app: string };

export function deviceInfo(): DeviceInfo {
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    os: String(Device.osVersion ?? '').slice(0, 20),
    model: String(Device.modelName ?? '').slice(0, 60), // "iPhone 15", "Galaxy A54"
    app: String(Constants.expoConfig?.version ?? '').slice(0, 20),
  };
}
