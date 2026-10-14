import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { AuthUser } from './authFirebase';

// Giriş ve bulut, uygulamanın geri kalanına tek kapıdan açılır.
// - Gerçek derleme (development / mağaza): Firebase telefon + SMS girişi, bulut eşitleme.
// - Expo Go: React Native Firebase yok (yüklenirse çöker). Sahte giriş: herhangi 6 rakam, bulut kapalı.
export const cloudEnabled = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type Fb = typeof import('./authFirebase');
const fb: Fb | null = cloudEnabled ? require('./authFirebase') : null;

export type { AuthUser };

export async function sendCode(phone: string) {
  if (fb) await fb.sendCode(phone);
}

export async function confirmCode(code: string, phone: string): Promise<AuthUser> {
  if (fb) return fb.confirmCode(code);
  return { uid: 'yerel', phone }; // Expo Go: her kod kabul
}

export const currentUser = () => fb?.currentUser() ?? null;
export const onUser = (cb: (u: AuthUser | null) => void) => fb?.onUser(cb) ?? (() => {});
export const idToken = async () => (fb ? fb.idToken() : null);
export const deleteUser = async () => {
  if (fb) await fb.deleteUser();
};
export const signOutUser = async () => {
  if (fb) await fb.signOutUser();
};

// Firebase hata kodlarını şoförün anlayacağı cümleye çevirir (geliştirmede sonuna Firebase kodu eklenir).
export function authErrorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const text = authErrorMessage(code);
  return __DEV__ && code ? `${text} [${code}]` : text;
}

function authErrorMessage(code: string): string {
  if (code.includes('invalid-phone-number')) return 'Bu numara geçerli görünmüyor. Kontrol edip tekrar dene.';
  if (code.includes('invalid-verification-code')) return 'Kod yanlış. SMS\'teki 6 haneli kodu tekrar gir.';
  if (code.includes('code-expired') || code.includes('session-expired')) return 'Kodun süresi doldu. Yeni kod iste.';
  if (code.includes('too-many-requests')) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  if (code.includes('quota-exceeded')) return 'Şu an SMS gönderilemiyor. Birkaç dakika sonra tekrar dene.';
  if (code.includes('network-request-failed')) return 'İnternet bağlantısı yok. Bağlanıp tekrar dene.';
  if (code.includes('operation-not-allowed') || code.includes('billing')) return 'Şu an SMS gönderilemiyor. Biraz sonra tekrar dene.';
  return 'Bir sorun oldu. Tekrar dene.';
}
