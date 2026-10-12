import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, Field, SheetHeader } from '@/components/ui';
import { dateLabel, fmt } from '@/lib/format';
import { MAINT_NAME, nextYear, type MaintKey } from '@/lib/maintenance';
import { useVehicle } from '@/store/vehicle';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Göstergeyi elle düzeltme.
export function OdoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { vehicle, update } = useVehicle();
  const [odo, setOdo] = useState('');
  useEffect(() => {
    if (visible) setOdo(vehicle ? String(vehicle.odo) : '');
  }, [visible, vehicle]);
  const km = parseInt(odo, 10);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHeader icon="gauge" tone="yellow" title="Göstergeyi güncelle" subtitle="Araç göstergesindeki güncel km" />
      <Field value={odo} onChange={setOdo} digits={7} suffix="KM" autoFocus big />
      <Text style={[styles.hint, { color: c.faint }]}>
        Vardiya sonunda girdiğin km'ler buraya kendiliğinden eklenir. Arada bir göstergeye bakıp düzeltmen yeterli.
      </Text>
      <View style={styles.buttons}>
        <Button label="Vazgeç" variant="ghost" onPress={onClose} />
        <Button
          label="Kaydet"
          disabled={!km}
          onPress={() => {
            update({ odo: km, odoAt: Date.now() });
            onClose();
          }}
          style={{ flex: 1.4 }}
        />
      </View>
    </Sheet>
  );
}

export function MaintenanceSheet({ kind, onClose }: { kind: MaintKey | null; onClose: () => void }) {
  const { vehicle } = useVehicle();
  if (!vehicle) return null;
  return kind === 'svc' ? <ServiceSheet visible onClose={onClose} /> : <DateSheet kind={kind} onClose={onClose} />;
}

function ServiceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { vehicle, update } = useVehicle();
  const [last, setLast] = useState(vehicle?.svcLast != null ? String(vehicle.svcLast) : '');
  const [every, setEvery] = useState(String(vehicle?.svcInt ?? 10_000));
  if (!vehicle) return null;
  const n = parseInt(every, 10);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHeader icon="wrench" tone="orange" title={MAINT_NAME.svc} subtitle={`Her ${fmt(vehicle.svcInt)} km'de bir`} />
      <View style={{ flexDirection: 'row' }}>
        <Button
          label={`Bugün bakım yaptırdım · ${fmt(vehicle.odo)} km`}
          icon="check"
          variant="green"
          onPress={() => {
            update({ svcLast: vehicle.odo, ...(n ? { svcInt: n } : {}) });
            onClose();
          }}
        />
      </View>
      <View style={styles.two}>
        <View style={{ flex: 1 }}>
          <Field label="Son bakım" value={last} onChange={setLast} digits={7} suffix="KM" placeholder="—" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Bakım aralığı" value={every} onChange={setEvery} digits={6} suffix="KM" />
        </View>
      </View>
      <Text style={[styles.hint, { color: c.faint }]}>Bakım aralığını servis kitapçığından ya da ustandan öğrenebilirsin.</Text>
      <View style={styles.buttons}>
        <Button label="Vazgeç" variant="ghost" onPress={onClose} />
        <Button
          label="Kaydet"
          onPress={() => {
            const l = parseInt(last, 10);
            update({ svcLast: isNaN(l) ? vehicle.svcLast : Math.min(l, vehicle.odo), ...(n ? { svcInt: n } : {}) });
            onClose();
          }}
          style={{ flex: 1.4 }}
        />
      </View>
    </Sheet>
  );
}

function DateSheet({ kind, onClose }: { kind: 'muayene' | 'sigorta' | null; onClose: () => void }) {
  const { c, isDark } = useTheme();
  const { vehicle, update } = useVehicle();
  const current = kind && vehicle ? vehicle[kind] : null;
  const [date, setDate] = useState<number>(current ?? nextYear());
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setDate(current ?? nextYear());
    setPicking(false);
  }, [kind, current]);

  const pick = () => {
    if (Platform.OS === 'android')
      DateTimePickerAndroid.open({
        value: new Date(date),
        mode: 'date',
        onChange: (e, d) => {
          if (e.type === 'set' && d) setDate(d.getTime());
        },
      });
    else setPicking((p) => !p);
  };

  const done = (t: number) => {
    if (kind) update({ [kind]: t });
    onClose();
  };

  return (
    <Sheet visible={kind !== null} onClose={onClose}>
      {kind && (
        <>
          <SheetHeader
            icon={kind === 'muayene' ? 'clip' : 'shield'}
            tone="orange"
            title={MAINT_NAME[kind]}
            subtitle={current ? `Bitiş: ${dateLabel(current)}` : 'Bitiş tarihi girilmedi'}
          />
          <View style={{ flexDirection: 'row' }}>
            <Button label="Bugün yeniledim" icon="check" variant="green" onPress={() => done(nextYear())} />
          </View>
          <Text style={[styles.hint, { color: c.faint, textAlign: 'center', marginTop: -6 }]}>
            Yeni bitiş tarihi: {dateLabel(nextYear())}
          </Text>
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: c.muted }]}>Ya da bitiş tarihini seç</Text>
            <Pressable onPress={pick} style={[styles.dateBtn, { borderBottomColor: c.yellow }]} accessibilityRole="button">
              <Icon name="cal" size={20} color={c.muted} />
              <Text style={[styles.dateText, { color: c.text }]}>{dateLabel(date)}</Text>
              <Icon name={picking ? 'up' : 'right'} size={18} color={c.faint} />
            </Pressable>
          </View>
          {picking && Platform.OS === 'ios' && (
            <DateTimePicker
              value={new Date(date)}
              mode="date"
              display="spinner"
              locale="tr-TR"
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, d) => d && setDate(d.getTime())}
              style={{ height: 180 }}
            />
          )}
          <View style={styles.buttons}>
            <Button label="Vazgeç" variant="ghost" onPress={onClose} />
            <Button label="Kaydet" onPress={() => done(date)} style={{ flex: 1.4 }} />
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: { ...fonts.ui, fontSize: 14, lineHeight: 20 },
  buttons: { flexDirection: 'row', gap: 10 },
  two: { flexDirection: 'row', gap: 16 },
  label: { ...fonts.uiBold, fontSize: 14 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, paddingVertical: 8 },
  dateText: { flex: 1, ...fonts.uiBold, fontSize: 20 },
});
