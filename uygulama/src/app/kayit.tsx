import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { Icon } from '@/components/Icon';
import { CATEGORY } from '@/lib/categories';
import { fmt, tl } from '@/lib/format';
import { EXPENSE, INCOME, isIncome, totals, useShift, type Category, type Entry } from '@/store/shift';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

const MAX_DIGITS = 6;
const FLASH_MS = 1500;
// "Tek dokunuşla kaydedilir" ipucu ilk birkaç kayıtta görünür, sonra kaybolur.
const HINT_LIMIT = 3;
let savesThisSession = 0;

export default function QuickEntry() {
  const { c } = useTheme();
  const s = styles(c);
  const { current, addEntry } = useShift();
  const [amount, setAmount] = useState('0');
  const [saved, setSaved] = useState(0);
  const [flash, setFlash] = useState<Entry | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  if (!current) return <Redirect href="/" />;

  const zero = amount === '0';
  const showHint = savesThisSession < HINT_LIMIT;

  const press = (k: string) => {
    Haptics.selectionAsync();
    setAmount((a) => {
      if (k === '⌫') return a.length > 1 ? a.slice(0, -1) : '0';
      if (a === '0') return k === '00' ? '0' : k;
      // 00: sığdığı kadar sıfır ekler (6 hane sınırı).
      return (a + k).slice(0, Math.max(a.length, MAX_DIGITS));
    });
  };

  // ⌫ basılı tutulunca tutar sıfırlanır (eski C tuşunun işi).
  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAmount('0');
  };

  const save = (category: Category) => {
    const e = addEntry(category, parseInt(amount, 10));
    if (!e) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    savesThisSession++;
    setAmount('0');
    setSaved((n) => n + 1);
    setFlash(e);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };

  const revenue = totals(current).revenue;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <Backdrop />
      <View style={s.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={[s.backBtn, saved > 0 && { backgroundColor: c.greenSoft, borderColor: 'transparent' }]}
          accessibilityRole="button"
        >
          <Icon name={saved > 0 ? 'check' : 'left'} size={18} color={saved > 0 ? c.green : c.text} />
          <Text style={[s.backText, saved > 0 && { color: c.green }]}>{saved > 0 ? 'Bitti' : 'Vazgeç'}</Text>
        </Pressable>
        {flash ? (
          <View style={[s.chip, { backgroundColor: isIncome(flash.category) ? c.greenSoft : c.redSoft }]}>
            <Icon name="check" size={14} color={isIncome(flash.category) ? c.green : c.red} />
            <Text style={[s.chipText, { color: isIncome(flash.category) ? c.green : c.red }]}>
              {isIncome(flash.category) ? '+' : '−'}
              {tl(flash.amount)} {CATEGORY[flash.category].short}
            </Text>
          </View>
        ) : (
          <View style={[s.chip, { backgroundColor: c.yellowSoft }]}>
            <Text style={[s.chipText, { color: c.yellowInk }]}>Vardiya {tl(revenue)}</Text>
          </View>
        )}
      </View>

      <View style={s.amountRow}>
        <Text style={s.label}>Tutar</Text>
        <Text style={[s.amount, zero && { color: c.faint }]}>
          <Text style={{ color: c.yellowInk, fontSize: 32 }}>₺ </Text>
          {fmt(parseInt(amount, 10))}
        </Text>
      </View>

      <View style={s.pad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['00', '0', '⌫']].map((row) => (
          <View key={row.join()} style={s.padRow}>
            {row.map((k) => {
              const digit = k !== '⌫';
              return (
                <View key={k} style={s.keyCell}>
                  <Pressable
                    onPress={() => press(k)}
                    onLongPress={k === '⌫' ? clearAll : undefined}
                    style={({ pressed }) => [
                      s.key,
                      digit && { backgroundColor: c.key },
                      pressed && { backgroundColor: c.line },
                    ]}
                    accessibilityLabel={k === '⌫' ? 'Sil' : k === '00' ? 'İki sıfır' : k}
                    accessibilityHint={k === '⌫' ? 'Basılı tutunca tutarın tamamı silinir' : undefined}
                  >
                    {k === '⌫' ? (
                      <Icon name="bksp" size={28} color={c.muted} />
                    ) : (
                      <Text style={s.keyText}>{k}</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {[
        { title: 'Gelir', cats: INCOME, color: c.green, fill: solid.income },
        { title: 'Gider', cats: EXPENSE, color: c.red, fill: solid.expense },
      ].map((g) => (
        <View key={g.title} style={{ gap: 6 }}>
          <View style={s.groupHead}>
            <View style={[s.dot, { backgroundColor: g.color }]} />
            <Text style={[s.groupTitle, { color: g.color }]}>{g.title}</Text>
            {showHint && <Text style={s.hint}>tek dokunuşla kaydedilir</Text>}
          </View>
          <View style={s.btnRow}>
            {g.cats.map((cat) => (
              <Pressable
                key={cat}
                disabled={zero}
                onPress={() => save(cat)}
                style={({ pressed }) => [
                  s.saveBtn,
                  { backgroundColor: g.fill, opacity: zero ? 0.32 : 1 },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${CATEGORY[cat].label} olarak kaydet`}
              >
                <Icon name={CATEGORY[cat].icon} size={23} color={solid.onSolid} />
                <Text style={s.saveText}>{CATEGORY[cat].short}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 18, gap: 12 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 44,
      paddingLeft: 8,
      paddingRight: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    backText: { ...fonts.uiBold, fontSize: 16, color: c.text },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
    chipText: { ...fonts.numHeavy, fontSize: 14 },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    label: { ...fonts.uiSemi, fontSize: 15, color: c.muted },
    amount: { ...fonts.display, fontSize: 58, color: c.text, letterSpacing: -1.5 },
    // Telefonun arama tuşları gibi: kutu yok, yuvarlak ve hafif tuşlar.
    pad: { flex: 1, gap: 6, minHeight: 220, paddingHorizontal: 12 },
    padRow: { flex: 1, flexDirection: 'row' },
    keyCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    key: {
      height: '92%',
      maxHeight: 80,
      aspectRatio: 1,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyText: { ...fonts.numHeavy, fontSize: 30, color: c.text },
    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 2 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    groupTitle: { ...fonts.uiSemi, fontSize: 15 },
    hint: { ...fonts.ui, fontSize: 13, color: c.faint },
    btnRow: { flexDirection: 'row', gap: 8 },
    saveBtn: { flex: 1, height: 70, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3 },
    saveText: { ...fonts.uiBold, fontSize: 16, color: solid.onSolid },
  });
