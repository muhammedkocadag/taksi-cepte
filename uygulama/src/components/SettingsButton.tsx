import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

export const SETTINGS_BTN = 44;
export const SETTINGS_RIGHT = 18;
export const SETTINGS_TOP = 8;

// Bütün sekmelerde sağ üstte sabit; sayfa kaysa da yerinde durur.
export function SettingsButton() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => router.push('/ayarlar')}
      style={[styles.btn, { top: insets.top + SETTINGS_TOP, backgroundColor: c.surface, borderColor: c.line }]}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Ayarlar"
    >
      <Icon name="gear" size={21} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: SETTINGS_RIGHT,
    width: SETTINGS_BTN,
    height: SETTINGS_BTN,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
