import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { AuthUser } from './authFirebase';

// Giriş ve bulut, uygulamanın geri kalanına tek kapıdan açılır.
// - Gerçek derleme (development / mağaza): Firebase girişi (Apple ile giriş; telefon + SMS), bulut eşitleme.
// - Expo Go: React Native Firebase yok (yüklenirse çöker). Sahte telefon girişi: herhangi 6 rakam, bulut kapalı.
export const cloudEnabled = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// Telefon + SMS girişi ekranda görünsün mü. Gerçek SMS fatura hesabı ister (14.10.2026: Google 1.500 TL ön ödeme
// istedi, kullanıcı ödemedi). Kullanıcı kararı: giriş SADECE Apple ile (geliştirme sürümünde de). Telefon kodu
// duruyor; sadece Expo Go'da (Apple ile giriş orada yok) sahte telefon girişi. SMS açılırsa true yapılır.
export const PHONE_LOGIN = !cloudEnabled;

type Fb = typeof import('./authFirebase');
const fb: Fb | null = cloudEnabled ? require('./authFirebase') : null;

export type { AuthUser };

export async function sendCode(phone: string) {
  if (fb) await fb.sendCode(phone);
}

export async function confirmCode(code: string, phone: string): Promise<AuthUser> {
  if (fb) return fb.confirmCode(code);
  return { uid: 'yerel', phone, email: '', provider: 'phone' }; // Expo Go: her kod kabul
}

// Apple ile giriş (sadece iPhone, gerçek derleme). name: Apple'ın verdiği ad (sadece ilk girişte dolu).
export const appleAvailable = async () => (fb ? fb.appleAvailable() : false);
export async function signInWithApple() {
  if (!fb) throw Object.assign(new Error('Apple ile giriş yok'), { code: 'auth/operation-not-allowed' });
  return fb.signInWithApple();
}

export const currentUser = () => fb?.currentUser() ?? null;
export const onUser = (cb: (u: AuthUser | null) => void) => fb?.onUser(cb) ?? (() => {});
export const idToken = async () => (fb ? fb.idToken() : null);
export const deleteUser = async () => {
  if (fb) await fb.deleteUser();
};
export const reauthAndRevokeApple = async () => {
  if (fb) await fb.reauthAndRevokeApple();
};
export const signOutUser = async () => {
  if (fb) await fb.signOutUser();
};

// Kullanıcı Apple penceresini kapattı: hata değil, sessizce vazgeçilir.
export const isCanceled = (e: unknown) => /CANCELED|canceled|1001/.test(String((e as { code?: string })?.code ?? ''));

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
  if (code.includes('operation-not-allowed') || code.includes('billing')) return 'Şu an giriş yapılamıyor. Biraz sonra tekrar dene.';
  return 'Bir sorun oldu. Tekrar dene.';
}
