import { StyleSheet, Text, View } from 'react-native';

import { tl } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Not: alan adı bilerek "value" değil: Reanimated'ın geliştirme eklentisi stil içindeki `x.value`'yu
// kendi animasyon değeri sanıp araya uyarı kodu ekliyor ve uygulama çöküyor.
export type SplitItem = { key: string; label: string; amount: number; color: string };

// Dağılım: tek parçalı çubuk (iPhone "Depolama" gibi) + altında nokta · ad · tutar · yüzde.
export function SplitBar({ items, total }: { items: SplitItem[]; total: number }) {
  const { c } = useTheme();
  const parts = items.filter((i) => i.amount > 0);
  return (
    <View>
      <View style={styles.bar}>
        {parts.length === 0 ? (
          <View style={[styles.seg, styles.first, styles.last, { flex: 1, backgroundColor: c.sunk }]} />
        ) : (
          parts.map((p, i) => (
            <View
              key={p.key}
              style={[
                styles.seg,
                { flex: p.amount, backgroundColor: p.color },
                i === 0 && styles.first,
                i === parts.length - 1 && styles.last,
              ]}
            />
          ))
        )}
      </View>
      {items.map((p) => {
        const pct = total ? Math.round((p.amount / total) * 100) : 0;
        const zero = p.amount === 0;
        return (
          <View key={p.key} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: zero ? c.line : p.color }]} />
            <Text style={[styles.name, { color: zero ? c.faint : c.text }]}>{p.label}</Text>
            <Text style={[styles.value, { color: zero ? c.faint : c.text }]}>{tl(p.amount)}</Text>
            <Text style={[styles.pct, { color: c.muted }]}>%{pct}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 3, height: 12, marginTop: 14, marginBottom: 6 },
  seg: { borderRadius: 2 },
  first: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  last: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { ...fonts.uiSemi, fontSize: 16, flex: 1 },
  value: { ...fonts.num, fontSize: 16 },
  pct: { ...fonts.num, fontSize: 14, width: 44, textAlign: 'right' },
});
