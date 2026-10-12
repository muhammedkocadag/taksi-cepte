import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useProfile } from '@/store/profile';

import { dark, light, type Palette } from './tokens';

export type ThemeSetting = 'auto' | 'light' | 'dark';

type ThemeValue = {
  c: Palette;
  isDark: boolean;
  setting: ThemeSetting;
  setSetting: (s: ThemeSetting) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

// Otomatik modda 19:00–07:00 arası koyu tema.
const isNight = (d: Date) => d.getHours() >= 19 || d.getHours() < 7;

// Seçim ayarlar tablosunda saklanır (anahtar: theme).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, setSetting: save } = useProfile();
  const setting = (['light', 'dark'].includes(settings.theme) ? settings.theme : 'auto') as ThemeSetting;
  const [night, setNight] = useState(() => isNight(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNight(isNight(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  const isDark = setting === 'auto' ? night : setting === 'dark';
  const value = useMemo(
    () => ({ c: isDark ? dark : light, isDark, setting, setSetting: (s: ThemeSetting) => save('theme', s) }),
    [isDark, setting, save],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme ThemeProvider içinde kullanılmalı');
  return v;
}
