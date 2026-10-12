import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { Icon } from '@/components/Icon';
import { useTabBarSpace } from '@/components/TabBar';
import { TopBlur, useScrollY } from '@/components/TopBlur';
import { DEMAND_LABEL, SUPPORTED_CITIES, sampleEvents, type CityEvent, type Demand } from '@/lib/events';
import { MONTHS, addDays, dayDiff, monday, startOfDay } from '@/lib/period';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

type Tab = 'bugun' | 'hafta' | 'ay';
const TABS: [Tab, string][] = [
  ['bugun', 'Bugün'],
  ['hafta', 'Bu hafta'],
  ['ay', 'Bu ay'],
];

export default function Etkinlik() {
  const { c } = useTheme();
  const tabSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const { y, onScroll } = useScrollY();
  const s = styles(c);
  const { profile, settings, setSetting } = useProfile();
  const [tab, setTab] = useState<Tab>('bugun');
  const il = profile?.il ?? '';

  // Zil açık etkinlikler ayarlarda saklanır (bildirimler sonraki adımda bunlara göre kurulacak).
  const bells = useMemo<string[]>(() => {
    try {
      return JSON.parse(settings.evBells ?? '[]');
    } catch {
      return [];
    }
  }, [settings.evBells]);
  const toggleBell = (id: string) => {
    Haptics.selectionAsync();
    setSetting('evBells', JSON.stringify(bells.includes(id) ? bells.filter((x) => x !== id) : [...bells, id]));
  };

  const now = Date.now();
  const t0 = startOfDay(now);
  const n = new Date(now);
  const limit = {
    bugun: addDays(t0, 1),
    hafta: addDays(monday(t0), 7),
    ay: new Date(n.getFullYear(), n.getMonth() + 1, 1).getTime(),
  }[tab];
  const list = sampleEvents(now)
    .filter((e) => e.day >= t0 && e.day < limit)
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const supported = SUPPORTED_CITIES.includes(il);

  return (
    <View style={s.screen}>
      <Backdrop />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[s.body, { paddingTop: insets.top, paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Etkinlikler</Text>
        <View style={s.pill}>
          <Icon name="pin" size={14} color={c.yellowInk} />
          <Text style={s.pillText}>{il}</Text>
        </View>
        <Text style={s.lead}>Konser, maç ve fuarların çıkış saatlerini takip et, doğru yerde ol.</Text>

        <View style={s.seg}>
          {TABS.map(([v, l]) => {
            const on = tab === v;
            return (
              <Pressable
                key={v}
                onPress={() => setTab(v)}
                style={[s.segBtn, on && { backgroundColor: c.yellow }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.segText, { color: on ? solid.onYellow : c.muted }]}>{l}</Text>
              </Pressable>
            );
          })}
        </View>

        {!supported ? (
          <Text style={s.empty}>
            Şimdilik sadece Ankara'dayız.{'\n'}
            {il} için etkinlikler çok yakında.
          </Text>
        ) : list.length === 0 ? (
          <Text style={s.empty}>{tab === 'bugun' ? 'Bugün için etkinlik yok.' : 'Bu dönem için etkinlik yok.'}</Text>
        ) : (
          <>
            {list.map((e, i) => (
              <EventRow key={e.id} e={e} days={dayDiff(e.day, t0)} bell={bells.includes(e.id)} onBell={() => toggleBell(e.id)} last={i === list.length - 1} />
            ))}
            <View style={s.footer}>
              <Icon name="bell" size={14} color={c.faint} />
              <Text style={s.footText}>Zil açıksa 1 gün önce ve etkinlik günü hatırlatılır.</Text>
            </View>
            <Text style={s.sample}>Deneme sürümü: gösterilen etkinlikler örnektir.</Text>
          </>
        )}
      </Animated.ScrollView>
      <TopBlur y={y} />
    </View>
  );
}

function EventRow({ e, days, bell, onBell, last }: { e: CityEvent; days: number; bell: boolean; onBell: () => void; last: boolean }) {
  const { c } = useTheme();
  const s = styles(c);
  const d = new Date(e.day);
  const demandColor: Record<Demand, string> = { cokYuksek: c.green, yuksek: c.yellowInk, orta: c.muted };

  // Geri sayım rozeti: bugün yeşil, 7 gün içinde sarı, daha uzak turuncu.
  const badge =
    days === 0
      ? { text: 'Bugün', bg: solid.income, fg: solid.onSolid, icon: null }
      : days <= 7
        ? { text: days === 1 ? 'Yarın' : `${days} gün kaldı`, bg: c.yellow, fg: solid.onYellow, icon: 'clock' as const }
        : { text: `${days} gün kaldı`, bg: c.orangeSoft, fg: c.orange, icon: 'cal' as const };

  return (
    <View style={[s.ev, last && { borderBottomWidth: 0 }]}>
      <View style={s.evTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.cat}>
            {e.cat}
            {days > 1 ? ` · ${d.getDate()} ${MONTHS[d.getMonth()]}` : ''}
          </Text>
          <Text style={s.evTitle}>{e.title}</Text>
        </View>
        <Pressable
          onPress={onBell}
          style={({ pressed }) => [s.bell, { backgroundColor: bell ? c.yellow : c.sunk }, pressed && { transform: [{ scale: 0.92 }] }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: bell }}
          accessibilityLabel={bell ? 'Hatırlatmayı kapat' : 'Hatırlat'}
        >
          <Icon name={bell ? 'bell' : 'belloff'} size={20} color={bell ? solid.onYellow : c.muted} />
        </Pressable>
      </View>
      <View style={s.between}>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          {badge.icon ? <Icon name={badge.icon} size={13} color={badge.fg} /> : <View style={[s.dot, { backgroundColor: badge.fg }]} />}
          <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
        </View>
        <Text style={s.demand}>
          Beklenen talep: <Text style={{ color: demandColor[e.demand], ...fonts.uiBold }}>{DEMAND_LABEL[e.demand].toLocaleLowerCase('tr-TR')}</Text>
        </Text>
      </View>
      <View style={s.details}>
        <View style={s.detail}>
          <Icon name="pin" size={16} color={c.muted} />
          <Text style={s.detailText}>{e.venue}</Text>
        </View>
        <View style={s.detail}>
          <Icon name="clock" size={16} color={c.muted} />
          <Text style={[s.detailText, { ...fonts.numHeavy }]}>
            {e.start} – {e.end}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    body: { paddingHorizontal: 18, paddingBottom: 40 },
    title: { ...fonts.uiHeavy, fontSize: 28, color: c.text, marginTop: 8, lineHeight: 44, letterSpacing: -0.5 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      backgroundColor: c.yellowSoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 4,
    },
    pillText: { ...fonts.uiBold, fontSize: 13, color: c.yellowInk },
    lead: { ...fonts.ui, fontSize: 15.5, color: c.muted, lineHeight: 22, marginTop: 10 },
    seg: { flexDirection: 'row', marginTop: 16, marginBottom: 4, padding: 4, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    segBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    segText: { ...fonts.uiSemi, fontSize: 15 },
    empty: { ...fonts.ui, fontSize: 16, color: c.faint, textAlign: 'center', paddingVertical: 48, lineHeight: 24 },
    ev: { gap: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 20, padding: 18, marginTop: 14 },
    evTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    cat: { ...fonts.uiBold, fontSize: 12, color: c.muted },
    evTitle: { ...fonts.uiSemi, fontSize: 19, color: c.text, marginTop: 4, lineHeight: 25 },
    // Yuvarlak zil: açıkken dolu taksi sarısı, kapalıyken sade.
    bell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
    badgeText: { ...fonts.uiBold, fontSize: 12 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    demand: { ...fonts.uiSemi, fontSize: 13.5, color: c.muted, flexShrink: 1, textAlign: 'right' },
    details: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 },
    detail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { ...fonts.uiSemi, fontSize: 15, color: c.text },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
    footText: { ...fonts.ui, fontSize: 13.5, color: c.faint },
    sample: { ...fonts.ui, fontSize: 12.5, color: c.faint, textAlign: 'center', marginTop: 6 },
  });
