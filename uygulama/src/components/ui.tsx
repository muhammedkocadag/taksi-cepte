import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid } from '@/theme/tokens';

type Variant = 'yellow' | 'green' | 'red' | 'redSoft' | 'ghost';

export function Button({
  label,
  icon,
  variant = 'yellow',
  onPress,
  disabled,
  style,
}: {
  label: string;
  icon?: IconName;
  variant?: Variant;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = { yellow: c.yellow, green: solid.income, red: '#dc2626', redSoft: c.redSoft, ghost: c.sunk }[variant];
  const fg = { yellow: solid.onYellow, green: solid.onSolid, red: solid.onSolid, redSoft: c.red, ghost: c.text }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={fg} />}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function SheetHeader({ icon, tone, title, subtitle }: { icon: IconName; tone: 'red' | 'green' | 'yellow' | 'orange'; title: string; subtitle?: ReactNode }) {
  const { c } = useTheme();
  const t = { red: [c.red, c.redSoft], green: [c.green, c.greenSoft], yellow: [c.yellowInk, c.yellowSoft], orange: [c.orange, c.orangeSoft] }[tone];
  return (
    <View style={styles.head}>
      <View style={styles.headIcon}>
        <Icon name={icon} size={22} color={t[0]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headTitle, { color: c.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headSub, { color: c.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

// Altı çizgili giriş alanı; sayı alanlarında rakam dışı karakterler atılır.
export function Field({
  label,
  value,
  onChange,
  suffix,
  digits,
  placeholder,
  autoFocus,
  autoCapitalize,
  big,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  digits?: number;
  placeholder?: string;
  autoFocus?: boolean;
  autoCapitalize?: 'characters' | 'words' | 'none';
  big?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={[styles.fieldLabel, { color: c.muted }]}>{label}</Text> : null}
      <View style={[styles.field, { borderBottomColor: c.yellow }]}>
        <TextInput
          value={value}
          onChangeText={(v) => onChange(digits ? v.replace(/\D/g, '').slice(0, digits) : v)}
          keyboardType={digits ? 'number-pad' : 'default'}
          placeholder={placeholder}
          placeholderTextColor={c.faint}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[
            styles.input,
            { color: c.text, ...(digits ? fonts.numHeavy : fonts.uiBold), fontSize: big ? 28 : 20 },
          ]}
          accessibilityLabel={label}
        />
        {suffix ? <Text style={[styles.suffix, { color: c.faint }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

// Seçilebilir küçük düğme (yakıt tipi, yıl gibi).
export function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.choice, { backgroundColor: on ? c.yellow : c.sunk, borderColor: on ? c.yellow : c.line }]}
    >
      <Text style={[styles.choiceText, { color: on ? solid.onYellow : c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { ...fonts.uiBold, fontSize: 14 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, paddingBottom: 4 },
  input: { flex: 1, paddingVertical: 4 },
  suffix: { ...fonts.uiBold, fontSize: 15 },
  choice: { paddingHorizontal: 14, height: 42, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  choiceText: { ...fonts.uiBold, fontSize: 15 },
  btn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { ...fonts.uiBold, fontSize: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headIcon: { width: 30, alignItems: 'center' },
  headTitle: { ...fonts.uiBold, fontSize: 21 },
  headSub: { ...fonts.ui, fontSize: 14.5, marginTop: 2 },
});
