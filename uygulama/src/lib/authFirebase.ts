import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  AppleAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  revokeToken,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from '@react-native-firebase/auth';

// Gerçek giriş (React Native Firebase): Apple ile giriş (iPhone, ücretsiz) ve telefon + SMS (fatura hesabı açılınca).
// Sadece auth.ts yükler: Expo Go'da bu dosya hiç açılmaz.

export type AuthUser = { uid: string; phone: string; email: string; provider: 'apple' | 'phone' | 'other' };

const toUser = (u: User | null): AuthUser | null => {
  if (!u) return null;
  const p = u.providerData[0]?.providerId;
  return {
    uid: u.uid,
    phone: u.phoneNumber ?? '',
    email: u.email ?? '',
    provider: p === 'apple.com' ? 'apple' : p === 'phone' ? 'phone' : 'other',
  };
};

// ---- Apple ile giriş ----
// Apple'a tek kullanımlık rastgele bir değerin özeti (nonce) verilir, Firebase'e değerin kendisi: kimlik belgesinin
// başkası tarafından tekrar kullanılmasını önler (Firebase'in istediği yöntem).
async function appleCredential() {
  const raw = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  const r = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce,
  });
  if (!r.identityToken) throw Object.assign(new Error('Apple kimlik belgesi yok'), { code: 'auth/apple-no-token' });
  // Apple adı SADECE ilk girişte verir; sonraki girişlerde boş gelir (profil zaten bulutta).
  const name = [r.fullName?.givenName, r.fullName?.familyName].filter(Boolean).join(' ');
  return { credential: AppleAuthProvider.credential(r.identityToken, raw), name, authCode: r.authorizationCode };
}

export const appleAvailable = () => (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false));

export async function signInWithApple(): Promise<{ user: AuthUser; name: string }> {
  const { credential, name } = await appleCredential();
  const res = await signInWithCredential(getAuth(), credential);
  return { user: toUser(res.user)!, name };
}

// Hesap silmeden önce: Apple ile yeniden doğrula (Firebase yakın zamanda giriş ister) ve Apple bağlantısını iptal et
// (Apple, Apple ile giriş kullanan uygulamalardan hesap silmede bunu zorunlu tutar). Kullanıcı vazgeçerse hata fırlatır.
export async function reauthAndRevokeApple() {
  const u = getAuth().currentUser;
  if (!u) return;
  const { credential, authCode } = await appleCredential();
  await reauthenticateWithCredential(u, credential);
  // İptal için Firebase'deki Apple sağlayıcısında anahtar (Team ID, Key ID, .p8) tanımlı olmalı; yoksa başarısız olur
  // ve Apple bir sonraki girişte adı yeniden vermez. Silmeyi durdurmaz; geliştirmede görünür olsun.
  if (authCode)
    await revokeToken(getAuth(), authCode).catch((e) => {
      if (__DEV__) console.warn('Apple bağlantısı iptal edilemedi', e);
    });
}

let pending: ConfirmationResult | null = null;

// +905xxxxxxxxx numarasına kod gönderir. Android'de kod SMS'ten otomatik okunursa giriş kendiliğinden
// tamamlanır (onUser bildirir), confirmCode'a gerek kalmaz.
export async function sendCode(phone: string) {
  // Geliştirme sürümünde Firebase test numaraları (gerçek SMS yok) uygulama doğrulamasını (iPhone'da Safari'de
  // reCAPTCHA) atlar. Firebase'in resmi test ayarı; sadece test numaralarıyla çalışır, mağaza sürümünü etkilemez.
  if (__DEV__) getAuth().settings.appVerificationDisabledForTesting = true;
  await registerForSilentPush();
  pending = await signInWithPhoneNumber(getAuth(), phone);
}

// iPhone: Firebase, uygulamanın gerçek olduğunu görünmez (sessiz) bir bildirimle doğrular; bunun için iPhone'un
// bildirim adresi (APNs token) gerekir. Uygulama uzaktan bildirime kaydolmazsa adres hiç oluşmaz ve Firebase
// Safari'de reCAPTCHA açar. Kayıt izin penceresi çıkarmaz (sessiz bildirim izin istemez). Firebase'e APNs anahtarı
// yüklü (Cloud Messaging → Apple app configuration). Kayıt beklenenden uzun sürerse beklemeden devam edilir.
let pushRegistered = false;
async function registerForSilentPush() {
  if (Platform.OS !== 'ios' || pushRegistered) return;
  try {
    await Promise.race([Notifications.getDevicePushTokenAsync(), new Promise((r) => setTimeout(r, 4000))]);
    pushRegistered = true;
  } catch {
    // adres alınamazsa Firebase yine Safari'ye düşer; giriş yine çalışır
  }
}

export async function confirmCode(code: string): Promise<AuthUser> {
  if (!pending) throw Object.assign(new Error('Kod istenmedi'), { code: 'auth/missing-verification-id' });
  const cred = await pending.confirm(code);
  const u = toUser(cred?.user ?? getAuth().currentUser);
  if (!u) throw Object.assign(new Error('Giriş tamamlanmadı'), { code: 'auth/internal-error' });
  return u;
}

export const currentUser = () => toUser(getAuth().currentUser);

export const onUser = (cb: (u: AuthUser | null) => void) => onAuthStateChanged(getAuth(), (u) => cb(toUser(u)));

export async function idToken() {
  const u = getAuth().currentUser;
  return u ? u.getIdToken() : null;
}

export const signOutUser = () => signOut(getAuth());

// Firebase hesabını siler. Son girişin üzerinden uzun süre geçtiyse Firebase 'auth/requires-recent-login' ile
// reddeder; o zaman veriler zaten silinmiş olur, hesap kaydı (sadece telefon numarası) kalır.
export async function deleteUser() {
  await getAuth().currentUser?.delete();
}
