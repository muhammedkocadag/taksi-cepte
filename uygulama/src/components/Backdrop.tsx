import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

// Hafif cam düzeninin zemini: düz zemin + üst köşelerde çok hafif renk parlaması.
// Yarı saydam kutuların "cam" gibi görünmesini bu ışık sağlar; zeminin çoğu yine düz kalır (OLED pil tasarrufu).
export function Backdrop() {
  const { c, isDark } = useTheme();
  const a = isDark ? 0.55 : 0.75;
  const b = isDark ? 0.1 : 0.5;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="glowA" cx="10%" cy="0%" rx="85%" ry="45%">
            <Stop offset="0" stopColor={c.glowA} stopOpacity={a} />
            <Stop offset="1" stopColor={c.glowA} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowB" cx="100%" cy="8%" rx="60%" ry="30%">
            <Stop offset="0" stopColor={c.glowB} stopOpacity={b} />
            <Stop offset="1" stopColor={c.glowB} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glowA)" />
        <Rect width="100%" height="100%" fill="url(#glowB)" />
      </Svg>
    </View>
  );
}
