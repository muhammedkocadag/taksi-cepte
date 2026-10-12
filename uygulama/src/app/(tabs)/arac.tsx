import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { Icon } from '@/components/Icon';
import { useTabBarSpace } from '@/components/TabBar';
import { MaintenanceSheet, OdoSheet } from '@/components/MaintenanceSheet';
import { VehicleSheet } from '@/components/VehicleSheet';
import { fmt, stampLabel, tl } from '@/lib/format';
import { maintItems, type MaintKey, type Urgency } from '@/lib/maintenance';
import { addDays, startOfDay } from '@/lib/period';
import { useShift } from '@/store/shift';
import { useVehicle } from '@/store/vehicle';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

export default function Arac() {
  const { c } = useTheme();
  const tabSpace = useTabBarSpace();
  const s = styles(c);
  const { vehicle } = useVehicle();
  const { current, past } = useShift();
  const [editing, setEditing] = useState(false);
  const [odoOpen, setOdoOpen] = useState(false);
  const [maint, setMaint] = useState<MaintKey | null>(null);

  const sheets = (
    <>
      <VehicleSheet visible={editing} onClose={() => setEditing(false)} />
      <OdoSheet visible={odoOpen} onClose={() => setOdoOpen(false)} />
      <MaintenanceSheet kind={maint} onClose={() => setMaint(null)} />
    </>
  );

  if (!vehicle) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Backdrop />
        {sheets}
        <Text style={s.title}>Araç ve bakım</Text>
        <View style={s.center}>
          <View style={s.circle}>
            <Icon name="car" size={44} color={c.yellowInk} />
          </View>
          <Text style={s.emptyTitle}>Aracını ekle</Text>
          <Text style={s.emptyText}>Plakanı ve gösterge km'ni gir; bakım, muayene ve sigorta tarihlerini senin yerine takip edelim.</Text>
          <Pressable style={s.cta} onPress={() => setEditing(true)} accessibilityRole="button">
            <Icon name="plus" size={20} color={solid.onYellow} />
            <Text style={s.ctaText}>Aracını Ekle</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const tone: Record<Urgency, string> = { acil: c.red, yakin: c.orange, iyi: c.green, eksik: c.faint };
  const items = maintItems(vehicle);

  // Son 30 gün: km vardiya sonunda girilenlerden, yakıt "Yakıt" giderlerinden.
  const since = addDays(startOfDay(Date.now()), -30);
  let km = 0;
  let fuel = 0;
  let fuelKm = 0;
  for (const sh of (current ? [current, ...past] : past).filter((x) => x.start >= since)) {
    const f = sh.entries.filter((e) => e.category === 'Yakıt').reduce((t, e) => t + e.amount, 0);
    fuel += f;
    if (sh.km) {
      km += sh.km;
      fuelKm += f;
    }
  }
  const meta = [vehicle.model ? `${vehicle.year ? vehicle.year + ' ' : ''}${vehicle.model}` : '', vehicle.fuel].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Backdrop />
      {sheets}
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { paddingHorizontal: 0 }]}>Araç ve bakım</Text>

        {/* Kimlik satırı: plaka küçük ve harf yazı tipiyle; büyük rakam sadece gösterge km'si. */}
        <Pressable
          onPress={() => setEditing(true)}
          style={({ pressed }) => [s.section, s.carRow, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Araç bilgilerini düzenle"
        >
          <View style={s.carIcon}>
            <Icon name="car" size={26} color={c.yellowInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.plate}>{vehicle.plate}</Text>
            {!!meta && <Text style={s.meta}>{meta}</Text>}
            {!vehicle.fuel && <Text style={[s.meta, { color: c.yellowInk }]}>Yakıt tipini eklemek için dokun</Text>}
          </View>
          <Icon name="right" size={20} color={c.faint} />
        </Pressable>

        <View style={s.section}>
          <View style={s.between}>
            <View>
              <View style={s.labelRow}>
                <Icon name="gauge" size={16} color={c.muted} />
                <Text style={s.label}>Gösterge</Text>
              </View>
              <Text style={s.odo}>
                {fmt(vehicle.odo)}
                <Text style={s.odoUnit}> km</Text>
              </Text>
              <Text style={s.stamp}>Son güncelleme: {stampLabel(vehicle.odoAt)}</Text>
            </View>
            <Pressable
              onPress={() => setOdoOpen(true)}
              style={[s.iconBtn, { backgroundColor: c.sunk, borderColor: c.sunk }]}
              accessibilityRole="button"
              accessibilityLabel="Göstergeyi güncelle"
            >
              <Icon name="pencil" size={20} color={c.muted} />
            </Pressable>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Bakım</Text>
          {items.map((it, i) => (
            <Pressable
              key={it.key}
              onPress={() => setMaint(it.key)}
              style={s.mt}
              accessibilityRole="button"
            >
              <View style={s.iconBox}>
                <Icon name={it.icon} size={21} color={tone[it.urgency]} />
              </View>
              <Text style={s.mtName}>{it.name}</Text>
              <Text style={[s.mtText, { color: it.urgency === 'eksik' ? c.yellowInk : tone[it.urgency] }]}>{it.text}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[s.section, { borderBottomWidth: 0 }]}>
          <Text style={s.label}>Son 30 gün</Text>
          <View style={[s.row, { marginTop: 14 }]}>
            {[
              ['Yol', `${fmt(km)} km`],
              ['Yakıt', tl(fuel)],
              ['Km başı yakıt', km ? `₺${(fuelKm / km).toFixed(2).replace('.', ',')}` : '—'],
            ].map(([k, v], i) => (
              <View key={k} style={[s.third, i > 0 && s.vline]}>
                <Text style={s.miniLabel}>{k}</Text>
                <Text style={s.thirdValue}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={s.hint}>Km, vardiya sonunda girdiğin değerlerden; yakıt, "Yakıt" giderlerinden hesaplanır.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    body: { paddingHorizontal: 18, paddingBottom: 40 },
    title: { ...fonts.uiHeavy, fontSize: 28, color: c.text, marginTop: 8, lineHeight: 44, paddingHorizontal: 18, letterSpacing: -0.5 },
    section: { backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 20, padding: 18, marginTop: 14 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    row: { flexDirection: 'row' },
    carRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    carIcon: { width: 32, alignItems: 'center' },
    plate: { ...fonts.uiBold, fontSize: 21, color: c.text },
    meta: { ...fonts.uiSemi, fontSize: 15, color: c.muted, marginTop: 3 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { ...fonts.uiBold, fontSize: 16, color: c.text },
    odo: { ...fonts.display, fontSize: 44, color: c.text, letterSpacing: -1.2, marginTop: 6 },
    odoUnit: { ...fonts.uiBold, fontSize: 17, color: c.muted, letterSpacing: 0 },
    stamp: { ...fonts.ui, fontSize: 14, color: c.faint, marginTop: 4 },
    iconBtn: { width: 48, height: 48, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    mt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
    iconBox: { width: 28, alignItems: 'center' },
    mtName: { flex: 1, ...fonts.uiBold, fontSize: 17, color: c.text },
    mtText: { ...fonts.numHeavy, fontSize: 16 },
    third: { flex: 1, gap: 6 },
    vline: { paddingLeft: 12 },
    miniLabel: { ...fonts.uiSemi, fontSize: 14, color: c.muted },
    thirdValue: { ...fonts.numHeavy, fontSize: 18, color: c.text },
    hint: { ...fonts.ui, fontSize: 13.5, color: c.faint, marginTop: 16, lineHeight: 19 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
    circle: { width: 104, height: 104, borderRadius: 52, backgroundColor: c.yellowSoft, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { ...fonts.uiHeavy, fontSize: 26, color: c.text, marginTop: 10 },
    emptyText: { ...fonts.ui, fontSize: 17, color: c.muted, textAlign: 'center', lineHeight: 25 },
    cta: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 58, paddingHorizontal: 30, borderRadius: 16, backgroundColor: c.yellow, marginTop: 18 },
    ctaText: { ...fonts.uiBold, fontSize: 18, color: solid.onYellow },
  });
