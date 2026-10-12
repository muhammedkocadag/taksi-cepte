import { useSQLiteContext } from 'expo-sqlite';
import { createContext, Fragment, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { loadSettings, saveSettings, wipeAll } from './db';

// Kullanıcı bilgileri ve ayarlar. Aşama 1'de SMS gerçek değil; Firebase gelince
// telefon doğrulaması ve hesap buluta taşınacak.

export type Profile = { name: string; il: string; phone: string };

type ProfileValue = {
  profile: Profile | null; // null: kayıt/giriş yapılmamış
  settings: Record<string, string>;
  signIn: (p: Profile) => void;
  signOut: () => void;
  setSetting: (key: string, value: string) => void;
  deleteAccount: () => void;
};

const ProfileContext = createContext<ProfileValue | null>(null);

const toProfile = (s: Record<string, string>): Profile | null =>
  s.signedIn === '1' ? { name: s.name ?? '', il: s.il ?? '', phone: s.phone ?? '' } : null;

export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState(() => loadSettings(db));

  const write = useCallback(
    (values: Record<string, string>) => {
      saveSettings(db, values);
      setSettings((s) => ({ ...s, ...values }));
    },
    [db],
  );

  const signIn = useCallback((p: Profile) => write({ ...p, signedIn: '1' }), [write]);
  const signOut = useCallback(() => write({ signedIn: '0' }), [write]);
  const setSetting = useCallback((key: string, value: string) => write({ [key]: value }), [write]);

  // Silince araç ve vardiya sağlayıcıları generation anahtarıyla baştan kurulur (boş veritabanından okur).
  const [generation, setGeneration] = useState(0);
  const deleteAccount = useCallback(() => {
    wipeAll(db);
    setSettings({});
    setGeneration((g) => g + 1);
  }, [db]);

  const profile = useMemo(() => toProfile(settings), [settings]);
  const value = useMemo(
    () => ({ profile, settings, signIn, signOut, setSetting, deleteAccount }),
    [profile, settings, signIn, signOut, setSetting, deleteAccount],
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
