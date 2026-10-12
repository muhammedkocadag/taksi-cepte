import { BlurView } from 'expo-blur';
import { useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SETTINGS_BTN, SETTINGS_TOP } from '@/components/SettingsButton';
import { useTheme } from '@/theme/ThemeProvider';

// Üstteki buzlu cam şerit: sayfa en üstteyken görünmez, kaydırdıkça belirir. İçerik (saat, dişli, Bitir)
// altından bulanık geçer; alttaki kapsül çubuğun üst karşılığı.
export const TOP_BAR = SETTINGS_TOP + SETTINGS_BTN + 8;

export function useScrollY() {
  const y = useRef(new Animated.Value(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true });
  return { y, onScroll };
}

export function TopBlur({ y }: { y: Animated.Value }) {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = y.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bar, { height: insets.top + TOP_BAR, opacity, borderBottomColor: c.cardBorder }]}
    >
      <BlurView intensity={isDark ? 45 : 55} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { backgroundColor: c.nav }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomWidth: StyleSheet.hairlineWidth },
});
