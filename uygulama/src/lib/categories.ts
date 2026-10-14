import type { IconName } from '@/components/Icon';
import type { Category } from '@/store/shift';
import type { Palette } from '@/theme/tokens';

type Meta = { label: string; short: string; icon: IconName; tone: (c: Palette) => { fg: string; bg: string } };

export const CATEGORY: Record<Category, Meta> = {
  Nakit: { label: 'Nakit', short: 'Nakit', icon: 'cash', tone: (c) => ({ fg: c.green, bg: c.greenSoft }) },
  POS: { label: 'POS / Kart', short: 'POS', icon: 'card', tone: (c) => ({ fg: c.blue, bg: c.blueSoft }) },
  Uygulama: { label: 'Uygulama', short: 'Uyg.', icon: 'phone', tone: (c) => ({ fg: c.yellowIcon, bg: c.yellowSoft }) },
  Yakıt: { label: 'Yakıt', short: 'Yakıt', icon: 'fuel', tone: (c) => ({ fg: c.orange, bg: c.orangeSoft }) },
  Yemek: { label: 'Yemek', short: 'Yemek', icon: 'food', tone: (c) => ({ fg: c.red, bg: c.redSoft }) },
  Diğer: { label: 'Diğer', short: 'Diğer', icon: 'dots', tone: (c) => ({ fg: c.grey, bg: c.greySoft }) },
};

// Gider satırlarında başlık, kategori adından biraz daha açıklayıcı.
export const EXPENSE_TITLE: Partial<Record<Category, string>> = {
  Yakıt: 'Yakıt alımı',
  Yemek: 'Yemek',
  Diğer: 'Diğer gider',
};
