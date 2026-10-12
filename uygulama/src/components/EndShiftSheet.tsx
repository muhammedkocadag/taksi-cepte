import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, SheetHeader, fieldBox } from '@/components/ui';
import { dur, fmt, tl } from '@/lib/format';
import { totals, useShift, type Shift } from '@/store/shift';
import { useVehicle } from '@/store/vehicle';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const HOUR = 3_600_000;

// İki adım: önce km sorusu (atlanabilir), sonra vardiya özeti.
export function EndShiftSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { current, endShift } = useShift();
  const { addKm } = useVehicle();
  const [km, setKm] = useState('');
  const [done, setDone] = useState<Shift | null>(null);

  useEffect(() => {
    if (visible) {
      setKm('');
      setDone(null);
    }
  }, [visible]);

  const finish = () => {
    const shift = endShift(parseInt(km, 10) || null);
    if (shift?.km) addKm(shift.km);
    if (shift) setDone(shift);
    else onClose();
  };

  if (done) {
    const t = totals(done);
    const ms = (done.end ?? Date.now()) - done.start;
    const rows: [string, string][] = [
      ['Süre', dur(ms)],
      ['Ciro', tl(t.revenue)],
      ['Gider', tl(t.expense)],
      ['Yolculuk', String(t.trips)],
      ['Saat başı net', ms > 0 ? tl(t.net / (ms / HOUR)) : '—'],
      ...(done.km
        ? ([
            ['Km', `${fmt(done.km)} km`],
            ['Km başı net', `₺${(t.net / done.km).toFixed(1).replace('.', ',')}`],
          ] as [string, string][])
        : []),
    ];
    return (
      <Sheet visible={visible} onClose={onClose} dismissable={false}>
        <View style={styles.summaryTop}>
          <View style={[styles.okCircle, { backgroundColor: c.greenSoft }]}>
            <Icon name="check" size={28} color={c.green} />
          </View>
          <Text style={[styles.summaryLabel, { color: c.muted }]}>Vardiya tamamlandı · net kâr</Text>
          <Text style={[styles.summaryNet, { color: t.net < 0 ? c.red : c.green }]}>
            {t.net < 0 ? '−' : ''}
            {tl(Math.abs(t.net))}
          </Text>
        </View>
        <View>
          {rows.map(([k, v]) => (
            <View key={k} style={[styles.row, { borderBottomColor: c.line }]}>
              <Text style={[styles.rowKey, { color: c.muted }]}>{k}</Text>
              <Text style={[styles.rowVal, { color: c.text }]}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Button label="Tamam" onPress={onClose} />
        </View>
      </Sheet>
    );
  }

  const t = totals(current);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHeader
        icon="flag"
        tone="red"
        title="Vardiyayı bitir"
        subtitle={current ? `${dur(Date.now() - current.start)} · Ciro ${tl(t.revenue)}` : undefined}
      />
      <Text style={[styles.q, { color: c.text }]}>Bu vardiyada kaç km yaptın?</Text>
      <View style={[styles.field, fieldBox(c, true)]}>
        <TextInput
          value={km}
          onChangeText={(v) => setKm(v.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          placeholder="Örn: 245"
          placeholderTextColor={c.faint}
          style={[styles.input, { color: c.text }]}
          accessibilityLabel="Km"
          autoFocus
        />
        <Text style={[styles.suffix, { color: c.faint }]}>KM</Text>
      </View>
      <Text style={[styles.hint, { color: c.faint }]}>
        İstersen boş bırakabilirsin. Girersen km başı kazancın hesaplanır.
      </Text>
      <View style={styles.buttons}>
        <Button label="Vazgeç" variant="ghost" onPress={onClose} />
        <Button label="Vardiyayı Bitir" icon="stop" variant="red" onPress={finish} style={{ flex: 1.4 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  q: { ...fonts.uiBold, fontSize: 16, marginBottom: -6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5 },
  input: { flex: 1, ...fonts.numHeavy, fontSize: 28, paddingVertical: 4 },
  suffix: { ...fonts.uiBold, fontSize: 15 },
  hint: { ...fonts.ui, fontSize: 13.5, marginTop: -6 },
  buttons: { flexDirection: 'row', gap: 10 },
  summaryTop: { alignItems: 'center', gap: 8, paddingTop: 4 },
  okCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { ...fonts.uiSemi, fontSize: 15, marginTop: 4 },
  summaryNet: { ...fonts.display, fontSize: 44, letterSpacing: -1.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
  rowKey: { ...fonts.ui, fontSize: 16 },
  rowVal: { ...fonts.numHeavy, fontSize: 16 },
});
