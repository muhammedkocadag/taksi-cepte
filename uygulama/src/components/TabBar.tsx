import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { useShift } from '@/store/shift';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

export const TABS = [
  { name: 'index', href: '/', label: 'Ana Sayfa', icon: 'home' },
  { name: 'analiz', href: '/analiz', label: 'Analiz', icon: 'pie' },
  { name: 'arac', href: '/arac', label: 'Araç', icon: 'car' },
  { name: 'etkinlik', href: '/etkinlik', label: 'Etkinlik', icon: 'cal' },
] as const;

// Yüzen cam kapsül (iPhone'un yeni "Liquid Glass" tarzı): alttan ve kenarlardan ayrık, köşeleri tam yuvarlak.
export const TAB_BAR_HEIGHT = 66;
export const SIDE = 14;
export const barBottom = (insetBottom: number) => (insetBottom > 0 ? insetBottom - 6 : 12);

function TabButton({ isFocused, label, icon, ...props }: TabTriggerSlotProps & { label: string; icon: IconName }) {
  const { c } = useTheme();
  const color = isFocused ? c.yellowInk : c.muted;
  return (
    <Pressable {...props} style={styles(c).tab} accessibilityRole="tab" accessibilityState={{ selected: isFocused }}>
      <Icon name={icon} size={23} color={color} />
      <Text style={[styles(c).tabLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// Sekme ekranlarında kaydırılan içeriğin altına bırakılacak boşluk (kapsül + alttaki aralık).
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + barBottom(insets.bottom) + 20;
}

export function TabBar() {
  const { c, isDark } = useTheme();
  const s = styles(c);
  const insets = useSafeAreaInsets();
  const { current, startShift } = useShift();

  // Vardiya kapalıysa ortadaki buton vardiyayı başlatıp kayıt ekranını açar.
  const onCenter = () => {
    if (!current) startShift();
    router.push('/kayit');
  };

  const tab = (i: number) => (
    <TabTrigger key={TABS[i].name} name={TABS[i].name} asChild>
      <TabButton label={TABS[i].label} icon={TABS[i].icon} />
    </TabTrigger>
  );

  // Cam katmanı ayrı (köşeleri kırpılır), düğmeler üstünde; kapsülün iki yanından içerik örtülmeden görünür.
  return (
    <View style={[s.bar, { bottom: barBottom(insets.bottom) }]}>
      <View style={[StyleSheet.absoluteFill, s.glass]}>
        <BlurView intensity={isDark ? 45 : 55} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { backgroundColor: c.nav }]} />
      </View>
      {tab(0)}
      {tab(1)}
      <View style={s.centerSlot}>
        <Pressable
          onPress={onCenter}
          style={({ pressed }) => [
            s.fab,
            { backgroundColor: current ? c.yellow : solid.income },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={current ? 'Kayıt ekle' : 'Vardiyayı başlat'}
        >
          <Icon name={current ? 'plus' : 'play'} size={28} color={current ? solid.onYellow : solid.onSolid} />
        </Pressable>
      </View>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      left: SIDE,
      right: SIDE,
      height: TAB_BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      borderRadius: TAB_BAR_HEIGHT / 2,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    glass: {
      borderRadius: TAB_BAR_HEIGHT / 2,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
    tabLabel: { ...fonts.uiSemi, fontSize: 11 },
    centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fab: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
