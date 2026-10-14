import type { TextStyle } from 'react-native';

// Renkler önizlemedeki (onizleme.html) paletle birebir aynı.
export type Palette = {
  bg: string;
  surface: string;
  sunk: string;
  line: string;
  text: string;
  muted: string;
  faint: string;
  key: string;
  keyLine: string;
  yellow: string;
  yellowInk: string;
  yellowIcon: string; // simge ve grafik sarısı (Uygulama kategorisi): yazı için yellowInk, bu daha canlı
  yellowSoft: string;
  green: string;
  greenSoft: string;
  red: string;
  redSoft: string;
  blue: string;
  blueSoft: string;
  orange: string;
  orangeSoft: string;
  grey: string;
  greySoft: string;
  nav: string;
  // Hafif cam: yarı saydam kutu + ince açık kenar; zeminde hafif renk parlaması.
  card: string;
  cardBorder: string;
  glowA: string;
  glowB: string;
};

// Koyu tema: saf siyah zemin (iPhone koyu modu gibi; OLED ekranda pil tasarrufu), kutular #1c1c1e.
export const dark: Palette = {
  bg: '#000000',
  surface: '#1c1c1e',
  sunk: '#0e0e10',
  line: '#38383a',
  text: '#f5f5f7',
  muted: '#98989f',
  faint: '#6e6e73',
  key: '#2c2c2e',
  keyLine: '#3a3a3c',
  yellow: '#facc15',
  yellowInk: '#facc15',
  yellowIcon: '#facc15',
  yellowSoft: 'rgba(250,204,21,0.16)',
  green: '#34d399',
  greenSoft: 'rgba(16,185,129,0.18)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  blue: '#60a5fa',
  blueSoft: 'rgba(59,130,246,0.2)',
  orange: '#fb923c',
  orangeSoft: 'rgba(249,115,22,0.2)',
  grey: '#a1a1a6',
  greySoft: 'rgba(152,152,159,0.18)',
  nav: 'rgba(28,28,30,0.35)',
  card: 'rgba(255,255,255,0.065)',
  cardBorder: 'rgba(255,255,255,0.10)',
  glowA: '#1e3a5f',
  glowB: '#facc15',
};

export const light: Palette = {
  bg: '#eef1f6',
  surface: '#ffffff',
  sunk: '#e9edf2',
  line: '#dfe4ea',
  text: '#0f172a',
  muted: '#5b6678',
  faint: '#8b95a5',
  key: '#ffffff',
  keyLine: '#d9dfe7',
  yellow: '#facc15',
  yellowInk: '#a16207',
  yellowIcon: '#eab308',
  yellowSoft: '#fef3c7',
  green: '#059669',
  greenSoft: '#d1fae5',
  red: '#dc2626',
  redSoft: '#fee2e2',
  blue: '#2563eb',
  blueSoft: '#dbeafe',
  orange: '#ea580c',
  orangeSoft: '#ffedd5',
  grey: '#64748b',
  greySoft: '#e2e8f0',
  nav: 'rgba(255,255,255,0.35)',
  card: 'rgba(255,255,255,0.55)',
  cardBorder: 'rgba(255,255,255,0.9)',
  glowA: '#93c5fd',
  glowB: '#fcd34d',
};

// Kayıt butonları iki temada da aynı dolgun renkte.
export const solid = {
  income: '#059669',
  expense: '#e11d48',
  onSolid: '#ffffff',
  onYellow: '#111111',
};

// Yazı tipi telefonun kendi yazı tipi (iPhone'da SF Pro, Android'de Roboto): fontFamily verilmez,
// sadece kalınlık. Stillerde `...fonts.ui` diye yayılır. Kalınlık ölçülü: sadece en önemli rakam
// (ciro, net kâr) `display`. Rakamlarda tabular-nums: haneler eşit genişlikte, sayarak artan tutar titremez.
export const fonts = {
  ui: { fontWeight: '400' },
  uiSemi: { fontWeight: '500' },
  uiBold: { fontWeight: '600' },
  uiHeavy: { fontWeight: '700' },
  num: { fontWeight: '500', fontVariant: ['tabular-nums'] },
  numHeavy: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  display: { fontWeight: '700', fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;
