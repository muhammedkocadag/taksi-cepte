import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CarPicker } from '@/components/CarPicker';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, Choice, Field, PickBox, SheetHeader } from '@/components/ui';
import { FUELS, formatPlate, plateExample, plateOk } from '@/lib/data';
import { useProfile } from '@/store/profile';
import { useVehicle } from '@/store/vehicle';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Araç ekleme / düzenleme. Araç seçimi aynı pencerede adım adım: marka → model → yıl.
export function VehicleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { vehicle, save } = useVehicle();
  const [picking, setPicking] = useState(false);
  const [plate, setPlate] = useState('');
  const { profile } = useProfile();
  const example = plateExample(profile?.il);
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
    if (!plateOk(plate)) return setErr(`Plakayı "${example}" biçiminde gir.`);
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
        placeholder={example}
        autoCapitalize="characters"
      />
      <PickBox label="Araç" value={car} placeholder="Marka, model ve yıl seç" onPress={() => setPicking(true)} />
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  err: { ...fonts.uiBold, fontSize: 14.5 },
  buttons: { flexDirection: 'row', gap: 10 },
});
