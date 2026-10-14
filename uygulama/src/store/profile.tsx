import { useSQLiteContext } from 'expo-sqlite';
import { createContext, Fragment, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { cloudEnabled } from '@/lib/auth';

import { loadSettings, saveSettings, wipeAll } from './db';

// Kullanıcı bilgileri ve ayarlar (`settings` tablosu). Giriş, bulut ve hesap silme akışı: src/store/account.ts.

export type Profile = { name: string; il: string; phone: string };

type ProfileValue = {
  profile: Profile | null; // null: kayıt/giriş yapılmamış
  settings: Record<string, string>;
  signIn: (p: Profile) => void;
  // Gerçek derlemede telefondaki bütün veriyi siler (başka biri girerse karışmasın; kayıtlar bulutta).
  // Expo Go'da (bulut yok) sadece çıkış işaretler, kayıtlar telefonda kalır.
  signOut: () => void;
  setSetting: (key: string, value: string) => void;
  deleteAccount: () => void; // telefondaki bütün veriyi siler (buluttaki silme: account.ts)
  // Buluttan yeni veri gelince: ayarlar yeniden okunur, dataVersion artar, vardiya ve araç sağlayıcıları da
  // veritabanından yeniden okur (ekran ve gezinme yerinde kalır).
  reloadFromDb: () => void;
  dataVersion: number;
};

const ProfileContext = createContext<ProfileValue | null>(null);

const toProfile = (s: Record<string, string>): Profile | null =>
  s.signedIn === '1' ? { name: s.name ?? '', il: s.il ?? '', phone: s.phone ?? '' } : null;

export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState(() => loadSettings(db));
  const [dataVersion, setDataVersion] = useState(0);

  const write = useCallback(
    (values: Record<string, string>) => {
      saveSettings(db, values);
      setSettings((s) => ({ ...s, ...values }));
    },
    [db],
  );

  const signIn = useCallback((p: Profile) => write({ ...p, signedIn: '1' }), [write]);
  const setSetting = useCallback((key: string, value: string) => write({ [key]: value }), [write]);

  // Silince araç ve vardiya sağlayıcıları generation anahtarıyla baştan kurulur (boş veritabanından okur).
  const [generation, setGeneration] = useState(0);
  const deleteAccount = useCallback(() => {
    wipeAll(db);
    setSettings({});
    setGeneration((g) => g + 1);
  }, [db]);

  const signOut = useCallback(() => (cloudEnabled ? deleteAccount() : write({ signedIn: '0' })), [deleteAccount, write]);

  const reloadFromDb = useCallback(() => {
    setSettings(loadSettings(db));
    setDataVersion((v) => v + 1);
  }, [db]);

  const profile = useMemo(() => toProfile(settings), [settings]);
  const value = useMemo(
    () => ({ profile, settings, signIn, signOut, setSetting, deleteAccount, reloadFromDb, dataVersion }),
    [profile, settings, signIn, signOut, setSetting, deleteAccount, reloadFromDb, dataVersion],
  );
  return (
    <ProfileContext.Provider value={value}>
      <Fragment key={generation}>{children}</Fragment>
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const v = useContext(ProfileContext);
  if (!v) throw new Error('useProfile ProfileProvider içinde kullanılmalı');
  return v;
}
