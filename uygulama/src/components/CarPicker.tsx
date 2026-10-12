import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Choice, Field } from '@/components/ui';
import { CARS, lower } from '@/lib/data';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

type Step = 'brand' | 'model' | 'year' | 'custom';

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 2 - 1995 }, (_, i) => thisYear + 1 - i);

// Marka → model → yıl, aramalı. Listede yoksa serbest yazı. Bir Sheet'in içinde kullanılır.
export function CarPicker({ onDone, onBack }: { onDone: (model: string, year: number) => void; onBack: () => void }) {
  const { c } = useTheme();
  const [step, setStep] = useState<Step>('brand');
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  const go = (s: Step) => {
    setQ('');
    setStep(s);
  };
  const back = () => {
    if (step === 'brand') onBack();
    else if (step === 'year') go(CARS[brand] ? 'model' : 'custom');
    else go('brand');
  };

  const title = { brand: 'Marka seç', model: `${brand} · model seç`, year: `${model} · yıl`, custom: 'Aracını yaz' }[step];
  const sub = { brand: 'Listeden seç, yazmana gerek yok', model: 'Listeden seç, yazmana gerek yok', year: 'Ruhsattaki model yılı', custom: 'Marka ve modeli yaz' }[step];
  const src = step === 'brand' ? Object.keys(CARS) : step === 'model' ? CARS[brand] : [];
  const list = src.filter((x) => lower(x).includes(lower(q)));

  return (
    <>
      <View style={styles.head}>
        <Pressable onPress={back} style={[styles.backBtn, { backgroundColor: c.sunk }]} accessibilityLabel="Geri">
          <Icon name="left" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.sub, { color: c.muted }]}>{sub}</Text>
        </View>
      </View>

      {(step === 'brand' || step === 'model') && (
        <>
          <View style={[styles.search, { backgroundColor: c.sunk, borderColor: c.line }]}>
            <Icon name="search" size={18} color={c.faint} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={step === 'brand' ? 'Marka ara' : 'Model ara'}
              placeholderTextColor={c.faint}
              style={[styles.searchInput, { color: c.text }]}
              autoCorrect={false}
            />
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {list.map((x) => (
              <Pressable
                key={x}
                onPress={() => {
                  if (step === 'brand') {
                    setBrand(x);
                    go('model');
                  } else {
                    setModel(`${brand} ${x}`);
                    go('year');
                  }
                }}
                style={[styles.row, { borderBottomColor: c.line }]}
              >
                <Text style={[styles.rowText, { color: c.text }]}>{x}</Text>
                <Icon name="right" size={18} color={c.faint} />
              </Pressable>
            ))}
            {list.length === 0 && <Text style={[styles.none, { color: c.faint }]}>"{q}" bulunamadı.</Text>}
            <Pressable
              onPress={() => {
                setBrand('');
                go('custom');
              }}
              style={styles.row}
            >
              <Text style={[styles.rowText, { color: c.muted }]}>Listede yok, kendim yazacağım</Text>
              <Icon name="pencil" size={18} color={c.faint} />
            </Pressable>
          </ScrollView>
        </>
      )}

      {step === 'year' && (
        <ScrollView style={styles.list} contentContainerStyle={styles.years}>
          {YEARS.map((y) => (
            <Choice key={y} label={String(y)} on={false} onPress={() => onDone(model, y)} />
          ))}
        </ScrollView>
      )}

      {step === 'custom' && (
        <>
          <Field value={q} onChange={setQ} placeholder="Örn. Chery Tiggo 7" autoFocus autoCapitalize="words" />
          <View style={{ flexDirection: 'row' }}>
            <Button
              label="Devam et"
              disabled={!q.trim()}
              onPress={() => {
                setModel(q.trim());
                go('year');
              }}
            />
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { ...fonts.uiBold, fontSize: 20 },
  sub: { ...fonts.ui, fontSize: 14, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, ...fonts.uiSemi, fontSize: 17 },
  list: { maxHeight: 380 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  rowText: { ...fonts.uiSemi, fontSize: 17 },
  none: { ...fonts.ui, fontSize: 15, paddingVertical: 14 },
  years: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
