import type { SQLiteDatabase } from 'expo-sqlite';

import { cloudEnabled, currentUser, deleteUser, idToken, reauthAndRevokeApple, signOutUser, type AuthUser } from '@/lib/auth';

import { loadSettings, loadVehicle, saveSettings, wipeAll } from './db';
import { syncOnce } from './sync';

// Hesap akışları: girişten sonra buluttan geri yükleme, güvenli çıkış, hesap silme.
// Firebase katmanı (src/lib/cloud.ts) sadece gerçek derlemede yüklenir; Expo Go'da bulut adımları atlanır.

type CloudMod = typeof import('@/lib/cloud');
const cloud: CloudMod | null = cloudEnabled ? require('@/lib/cloud') : null;

export const syncNow = (db: SQLiteDatabase, uid: string) => (cloud ? syncOnce(db, cloud.firebaseCloud(uid)) : Promise.resolve(null));

// SMS doğrulamasından hemen sonra. Telefondaki veri başka bir hesaba aitse silinir (aynı telefonda iki şoför),
// sonra bu hesabın buluttaki bütün kayıtları indirilir. Dönüş: profil (ad, il) ve araç bulutta var mı, yani
// "Son bir adım" atlanabilir mi.
export async function restoreAfterSignIn(db: SQLiteDatabase, user: AuthUser): Promise<{ complete: boolean }> {
  const local = loadSettings(db);
  if (cloudEnabled && local.uid && local.uid !== user.uid) wipeAll(db);
  saveSettings(db, { uid: user.uid });
  if (cloud) await syncOnce(db, cloud.firebaseCloud(user.uid));
  const s = loadSettings(db);
  return { complete: !!(s.name && s.il && loadVehicle(db)) };
}

// Çıkıştan önce son kayıtlar buluta gönderilir; gönderilemezse (internet yok) hata fırlatır ve çıkış yapılmaz,
// çünkü çıkışta telefondaki veri silinir.
// Hesaba (uid) bağlanmamış oturum: Firebase gelmeden önce açılmış eski deneme oturumu. Kayıtları bulutta değil;
// çıkışta silinirler. force verilmezse 'yedeksiz' hatası fırlatılır, ekran şoförü uyarır.
export async function prepareSignOut(db: SQLiteDatabase, force = false) {
  const uid = loadSettings(db).uid;
  if (!cloud) return;
  if (!uid) {
    if (force || !hasRecords(db)) return;
    throw Object.assign(new Error('Kayıtlar bir hesaba bağlı değil'), { code: 'yedeksiz' });
  }
  await syncOnce(db, cloud.firebaseCloud(uid));
  await signOutUser();
}

const hasRecords = (db: SQLiteDatabase) =>
  (db.getFirstSync<{ n: number }>('SELECT (SELECT COUNT(*) FROM shifts) + (SELECT COUNT(*) FROM entries) AS n')?.n ?? 0) > 0;

// Buluttaki bütün veriyi ve hesabı siler; başarılıysa çağıran telefondaki veriyi siler.
// Asıl yol sunucu fonksiyonu (firebase/functions → hesabiSil): Firebase hesabı silmek için yakın zamanda giriş
// ister, sunucu bu kısıtı taşımaz. Fonksiyon yayında değilse (fatura hesabı kapalı → 404) uygulama verileri
// kendisi siler (cloud.ts → deleteMyData) ve hesabı silmeyi dener.
const DELETE_URL = 'https://europe-west3-taksi-cepte-9c4ac.cloudfunctions.net/hesabiSil';

// Apple ile girenlerde önce Apple ile yeniden doğrulama (Face ID): Firebase hesabı silmek için yakın zamanda giriş
// ister, Apple da bağlantının iptalini zorunlu tutar. Şoför vazgeçerse hata fırlar ve hiçbir şey silinmez.
export async function deleteCloudAccount() {
  if (!cloudEnabled || !cloud) return;
  const u = currentUser();
  if (!u) return; // giriş yok: bulutta silinecek bir şey yok
  if (u.provider === 'apple') await reauthAndRevokeApple();
  const token = await idToken();
  const r = await fetch(DELETE_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!r || r.status === 404) {
    // Fonksiyon yayında değil ya da ulaşılamadı: uygulama kendisi siler (internet yoksa burada hata fırlar).
    await cloud.deleteMyData(u.uid);
    await deleteUser().catch(() => {});
  } else if (!r.ok) throw new Error(`hesap silinemedi (${r.status})`);
  await signOutUser().catch(() => {});
}
