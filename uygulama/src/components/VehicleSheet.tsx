import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CarPicker } from '@/components/CarPicker';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, Choice, Field, SheetHeader } from '@/components/ui';
import { FUELS, formatPlate, plateOk } from '@/lib/data';
import { useVehicle } from '@/store/vehicle';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Araç ekleme / düzenleme. Araç seçimi aynı pencerede adım adım: marka → model → yıl.
export function VehicleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { vehicle, save } = useVehicle();
  const [picking, setPicking] = useState(false);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [fuel, setFuel] = useState('');
  const [odo, setOdo] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPicking(false);
    setPlate(vehicle?.plate ?? '');
    setModel(vehicle?.model ?? '');
    setYear(vehicle?.year ?? null);
    setFuel(vehicle?.fuel ?? '');
    setOdo(vehicle ? String(vehicle.odo) : '');
    setErr('');
  }, [visible, vehicle]);

  const submit = () => {
    const km = parseInt(odo, 10);
    if (!plateOk(plate)) return setErr('Plakayı "34 T 1234" biçiminde gir.');
    if (!km) return setErr('Göstergedeki km boş bırakılamaz.');
    save({
      plate,
      model: model.trim(),
      year,
      fuel,
      odo: km,
      odoAt: vehicle && vehicle.odo === km ? vehicle.odoAt : Date.now(),
      svcLast: vehicle?.svcLast ?? null,
      svcInt: vehicle?.svcInt ?? 10_000,
      muayene: vehicle?.muayene ?? null,
      sigorta: vehicle?.sigorta ?? null,
    });
    onClose();
  };

  if (picking)
    return (
      <Sheet visible={visible} onClose={onClose}>
        <CarPicker
          onBack={() => setPicking(false)}
          onDone={(m, y) => {
            setModel(m);
            setYear(y);
            setPicking(false);
          }}
        />
      </Sheet>
    );

  const car = model ? `${year ? year + ' ' : ''}${model}` : '';
  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHeader icon="car" tone="yellow" title={vehicle ? 'Araç bilgileri' : 'Aracını ekle'} subtitle="Plaka ve gösterge zorunlu" />
      <Field
        label="Plaka"
        value={plate}
        onChange={(v) => {
          setPlate(formatPlate(v));
          setErr('');
        }}
        placeholder="34 T 1234"
        autoCapitalize="characters"
      />
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: c.muted }]}>Araç</Text>
        <Pressable onPress={() => setPicking(true)} style={[styles.pickBtn, { borderBottomColor: c.yellow }]} accessibilityRole="button">
          <Text style={[styles.pickBtnText, { color: car ? c.text : c.faint }]}>{car || 'Marka, model ve yıl seç'}</Text>
          <Icon name="right" size={18} color={c.faint} />
        </Pressable>
      </View>
      <Field
        label="Gösterge"
        value={odo}
        onChange={(v) => {
          setOdo(v);
          setErr('');
        }}
        digits={7}
        suffix="KM"
        placeholder="0"
      />
      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: c.muted }]}>Yakıt tipi</Text>
        <View style={styles.wrap}>
          {FUELS.map((f) => (
            <Choice key={f} label={f} on={fuel === f} onPress={() => setFuel(f)} />
          ))}
        </View>
      </View>
      {!!err && <Text style={[styles.err, { color: c.red }]}>{err}</Text>}
      <View style={styles.buttons}>
        <Button label="Vazgeç" variant="ghost" onPress={onClose} />
        <Button label="Kaydet" onPress={submit} style={{ flex: 1.4 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { ...fonts.uiBold, fontSize: 14 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, paddingVertical: 8 },
  pickBtnText: { flex: 1, ...fonts.uiBold, fontSize: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  err: { ...fonts.uiBold, fontSize: 14.5 },
  buttons: { flexDirection: 'row', gap: 10 },
});
