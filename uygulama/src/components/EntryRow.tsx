import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { CATEGORY, EXPENSE_TITLE } from '@/lib/categories';
import { hm, tl } from '@/lib/format';
import { isIncome, type Entry, type Shift } from '@/store/shift';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Gelirler vardiya içindeki sırasıyla "3. Yolculuk" diye adlandırılır.
export function entryTitle(shift: Shift, e: Entry) {
  if (!isIncome(e.category)) return EXPENSE_TITLE[e.category] ?? CATEGORY[e.category].label;
  const order = shift.entries.filter((x) => isIncome(x.category)).sort((a, b) => a.at - b.at);
  return `${order.indexOf(e) + 1}. Yolculuk`;
}

export function EntryRow({
  shift,
  entry,
  onPress,
  last,
  divider = true,
}: {
  shift: Shift;
  entry: Entry;
  onPress: () => void;
  last?: boolean;
  divider?: boolean; // kutu içinde (ana sayfa) satır çizgisi yok
}) {
  const { c } = useTheme();
  const inc = isIncome(entry.category);
  const fg = inc ? c.green : c.red;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: c.line, borderBottomWidth: last || !divider ? 0 : 1 },
        pressed && { backgroundColor: divider ? c.sunk : c.bg },
      ]}
      accessibilityRole="button"
      accessibilityHint="Düzenlemek için dokun"
    >
      {/* Simge ödeme türünü gösterir (para / kart / telefon); renk sadece gelir-gider: yeşil / kırmızı. */}
      <View style={styles.icon}>
        <Icon name={CATEGORY[entry.category].icon} size={24} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]}>{entryTitle(shift, entry)}</Text>
        <Text style={[styles.meta, { color: c.faint }]}>
          {CATEGORY[entry.category].short} · {hm(entry.at)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: fg }]}>
        {inc ? '+' : '−'}
        {tl(entry.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  icon: { width: 28, alignItems: 'center' },
  title: { ...fonts.uiSemi, fontSize: 17 },
  meta: { ...fonts.ui, fontSize: 14, marginTop: 2 },
  amount: { ...fonts.num, fontSize: 17 },
});
