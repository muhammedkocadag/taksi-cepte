import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/ui';
import { CATEGORY } from '@/lib/categories';
import { dayLabel, hm } from '@/lib/format';
import { EXPENSE, INCOME, useShift, type Category, type Entry } from '@/store/shift';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export function EditEntrySheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const { c } = useTheme();
  const { updateEntry, deleteEntry } = useShift();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Nakit');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setAmount(String(entry.amount));
    setCategory(entry.category);
    setConfirmDelete(false);
  }, [entry]);

  const value = parseInt(amount, 10) || 0;

  const save = () => {
    if (!entry || value <= 0) return;
    updateEntry(entry.id, { amount: value, category });
    onClose();
  };

  const remove = () => {
    if (!entry) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteEntry(entry.id);
    onClose();
  };

  const chips = (cats: Category[]) => (
    <View style={styles.chipRow}>
      {cats.map((cat) => {
        const on = cat === category;
        const tone = CATEGORY[cat].tone(c);
        return (
          <Pressable
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.chip, { borderColor: on ? tone.fg : c.line, backgroundColor: on ? tone.bg : c.bg }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Icon name={CATEGORY[cat].icon} size={18} color={on ? tone.fg : c.muted} />
            <Text style={[styles.chipText, { color: on ? tone.fg : c.text }]}>{CATEGORY[cat].short}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Sheet visible={!!entry} onClose={onClose}>
      <View>
        <Text style={[styles.title, { color: c.text }]}>Kaydı düzenle</Text>
        {entry && (
          <Text style={[styles.sub, { color: c.muted }]}>
            {dayLabel(entry.at)} · {hm(entry.at)}
          </Text>
        )}
      </View>
      <View style={[styles.field, { borderBottomColor: c.yellow }]}>
        <Text style={[styles.cur, { color: c.yellowInk }]}>₺</Text>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          style={[styles.input, { color: c.text }]}
          accessibilityLabel="Tutar"
          selectTextOnFocus
        />
      </View>
      <Text style={[styles.group, { color: c.green }]}>Gelir</Text>
      {chips(INCOME)}
      <Text style={[styles.group, { color: c.red }]}>Gider</Text>
      {chips(EXPENSE)}
      <View style={styles.buttons}>
        <Button
          label={confirmDelete ? 'Eminim, sil' : 'Sil'}
          icon="trash"
          variant={confirmDelete ? 'red' : 'redSoft'}
          onPress={remove}
        />
        <Button label="Kaydet" variant="yellow" onPress={save} disabled={value <= 0} style={{ flex: 1.4 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...fonts.uiBold, fontSize: 21 },
  sub: { ...fonts.ui, fontSize: 14.5, marginTop: 2 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, paddingBottom: 6 },
  cur: { ...fonts.numHeavy, fontSize: 26 },
  input: { flex: 1, ...fonts.numHeavy, fontSize: 30, paddingVertical: 4 },
  group: { ...fonts.uiBold, fontSize: 15, marginBottom: -8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipText: { ...fonts.uiBold, fontSize: 14.5 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
