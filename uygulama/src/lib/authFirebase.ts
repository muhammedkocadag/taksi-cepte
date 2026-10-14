import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from '@react-native-firebase/auth';

// Gerçek telefon + SMS girişi (React Native Firebase). Sadece auth.ts yükler: Expo Go'da bu dosya hiç açılmaz.

export type AuthUser = { uid: string; phone: string };

const toUser = (u: User | null): AuthUser | null => (u ? { uid: u.uid, phone: u.phoneNumber ?? '' } : null);

let pending: ConfirmationResult | null = null;

// +905xxxxxxxxx numarasına kod gönderir. Android'de kod SMS'ten otomatik okunursa giriş kendiliğinden
// tamamlanır (onUser bildirir), confirmCode'a gerek kalmaz.
export async function sendCode(phone: string) {
  pending = await signInWithPhoneNumber(getAuth(), phone);
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
