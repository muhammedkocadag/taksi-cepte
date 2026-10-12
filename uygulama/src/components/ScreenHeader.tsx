import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Sekme dışı ekranlar için: solda "Geri", ortada ekran adı.
export function BackHeader({ title }: { title: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.back, { backgroundColor: c.surface, borderColor: c.line }]}
        accessibilityRole="button"
      >
        <Icon name="left" size={18} color={c.text} />
        <Text style={[styles.backText, { color: c.text }]}>Geri</Text>
      </Pressable>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <View style={{ width: 80 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, width: 80, paddingLeft: 8, borderRadius: 12, borderWidth: 1 },
  backText: { ...fonts.uiBold, fontSize: 16 },
  title: { ...fonts.uiBold, fontSize: 21 },
});
