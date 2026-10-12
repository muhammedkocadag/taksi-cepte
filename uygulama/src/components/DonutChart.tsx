import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import type { SplitItem } from '@/components/SplitBar';
import { tl } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const SIZE = 132;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const GAP = 4; // parçalar arası boşluk (piksel, çember üzerinde)

// Dağılım: halka grafik + yanda nokta · ad · tutar. Ortada toplam; bir dilime dokununca
// ortada o kategorinin adı ve yüzdesi çıkar, diğer dilimler soluklaşır. Tekrar dokununca toplama döner.
// Alan adı "amount": stilde `x.value` kullanmak Reanimated eklentisini tetikliyor (bkz. SplitBar).
export function DonutChart({ items, total }: { items: SplitItem[]; total: number }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  const parts = items.filter((i) => i.amount > 0);
  const gap = parts.length > 1 ? GAP : 0;

  // Dönem değişince seçim sıfırlanır.
  useEffect(() => setSel(null), [total]);

  let offset = 0;
  const arcs = parts.map((p) => {
    const len = (p.amount / total) * CIRC;
    const arc = { ...p, len, dash: Math.max(len - gap, 1), offset };
    offset += len;
    return arc;
  });

  const pick = (key: string | null) => {
    Haptics.selectionAsync();
    setSel((cur) => (key === null || cur === key ? null : key));
  };

  // Dokunulan noktanın açısından (saat 12'den saat yönünde) hangi dilim olduğunu bulur.
  const onPress = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.locationX - SIZE / 2;
    const dy = e.nativeEvent.locationY - SIZE / 2;
    if (Math.hypot(dx, dy) < R - STROKE) return pick(null); // ortadaki boşluk: toplama dön
    let ang = Math.atan2(dx, -dy);
    if (ang < 0) ang += 2 * Math.PI;
    const pos = (ang / (2 * Math.PI)) * CIRC;
    const hit = arcs.find((a) => pos >= a.offset && pos < a.offset + a.len);
    if (hit) pick(hit.key);
  };

  const selected = arcs.find((a) => a.key === sel) ?? null;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPress} disabled={arcs.length === 0} style={{ width: SIZE, height: SIZE }} accessibilityLabel="Dağılım grafiği">
        <Svg width={SIZE} height={SIZE} pointerEvents="none">
          {/* Saat 12 yönünden başlar, saat yönünde ilerler. */}
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.sunk} strokeWidth={STROKE} fill="none" />
            {arcs.map((a) => (
              <Circle
                key={a.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={a.color}
                strokeWidth={STROKE}
                strokeOpacity={selected && selected.key !== a.key ? 0.25 : 1}
                fill="none"
                strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
                strokeDashoffset={-a.offset}
              />
            ))}
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          {selected ? (
            <>
              <Text style={[styles.centerLabel, { color: c.muted }]} numberOfLines={1}>
                {selected.label}
              </Text>
              <Text style={[styles.centerValue, { color: selected.color }]}>
                %{Math.round((selected.amount / total) * 100)}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.centerLabel, { color: c.muted }]}>Toplam</Text>
              <Text style={[styles.centerValue, { color: c.text, fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>
                {tl(total)}
              </Text>
            </>
          )}
        </View>
      </Pressable>

      <View style={styles.legend}>
        {items.map((p) => {
          const zero = p.amount === 0;
          const dim = selected !== null && selected.key !== p.key;
          return (
            <View key={p.key} style={[styles.row, dim && { opacity: 0.4 }]}>
              <View style={[styles.dot, { backgroundColor: zero ? c.line : p.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: zero ? c.faint : c.text }]} numberOfLines={1}>
                  {p.label}
                </Text>
                <Text style={[styles.amount, { color: zero ? c.faint : c.muted }]}>{tl(p.amount)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 14 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: STROKE + 6 },
  centerLabel: { ...fonts.ui, fontSize: 13 },
  centerValue: { ...fonts.display, fontSize: 24, marginTop: 1 },
  legend: { flex: 1, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { ...fonts.uiSemi, fontSize: 16 },
  amount: { ...fonts.num, fontSize: 14, marginTop: 1 },
});
