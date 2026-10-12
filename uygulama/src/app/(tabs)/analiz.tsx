import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { Icon, type IconName } from '@/components/Icon';
import { DonutChart } from '@/components/DonutChart';
import { useTabBarSpace } from '@/components/TabBar';
import { TopBlur, useScrollY } from '@/components/TopBlur';
import { CATEGORY } from '@/lib/categories';
import { dur, fmt, hm, tl } from '@/lib/format';
import {
  HOUR,
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  addDays,
  aggregate,
  compact,
  dayDiff,
  inRange,
  rangeOf,
  startOfDay,
  step,
  type Agg,
  type Mode,
  type Period,
} from '@/lib/period';
import { useCountUp } from '@/lib/useCountUp';
import { EXPENSE, INCOME, isIncome, useShift, type Category } from '@/store/shift';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

const MODES: [Mode, string][] = [
  ['gun', 'Günlük'],
  ['hafta', 'Haftalık'],
  ['yil', 'Aylık'],
];
const CHART_HEIGHT = 150;
const MIN_HOURS = 6;
const BAR_MAX_WIDTH = 22;

type Bar = { v: number; label: string; top?: string; hl?: boolean; sel?: boolean; onPress?: () => void; aria?: string };

export default function Analiz() {
  const { c } = useTheme();
  const tabSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const { y, onScroll } = useScrollY();
  const s = styles(c);
  const { current, past } = useShift();
  const [period, setPeriod] = useState<Period>({ mode: 'gun', off: 0, month: null });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const all = useMemo(() => (current ? [current, ...past] : past), [current, past]);
  const R = rangeOf(period, now);
  const shifts = inRange(all, R.a, R.b);
  const A = aggregate(shifts, now);
  const prev = aggregate(inRange(all, R.pa, R.pb), now);
  const net = useCountUp(A.net);

  const setMode = (mode: Mode) => setPeriod({ mode, off: 0, month: null });
  const today = startOfDay(now);

  // Grafik
  let bars: Bar[] | null = null;
  let chartBadge = '';
  let hint = '';
  if (period.mode === 'gun' && shifts.length) {
    const t0 = Math.floor(Math.min(...shifts.map((x) => x.start)) / HOUR) * HOUR;
    const t1 = Math.max(...shifts.map((x) => x.end ?? now));
    const used = Math.max(1, Math.ceil((t1 - t0) / HOUR));
    // Kısa vardiyada en az 6 saatlik çizgi: 1-2 çubuk bütün alanı kaplayıp blok gibi durmasın.
    const n = Math.max(MIN_HOURS, used);
    const v = Array<number>(n).fill(0);
    for (const sh of shifts)
      for (const e of sh.entries) if (isIncome(e.category)) v[Math.min(used - 1, Math.floor((e.at - t0) / HOUR))] += e.amount;
    const every = Math.ceil(n / 6);
    const mi = v.indexOf(Math.max(...v));
    bars = v.map((x, i) => ({
      v: x,
      hl: i === mi && x > 0,
      top: x ? compact(x) : '',
      label: i % every === 0 ? hm(t0 + i * HOUR) : '',
    }));
    chartBadge = `${hm(t0)} – ${hm(t1)}`;
    if (v[mi] > 0) hint = `En yoğun saat: ${hm(t0 + mi * HOUR)} – ${hm(t0 + (mi + 1) * HOUR)}`;
  } else if (period.mode === 'hafta') {
    const v = Array<number>(7).fill(0);
    for (const sh of shifts)
      for (const e of sh.entries) if (isIncome(e.category)) v[dayDiff(sh.start, R.a)] += e.amount;
    const mi = v.indexOf(Math.max(...v));
    bars = v.map((x, i) => {
      const day = addDays(R.a, i);
      const off = dayDiff(day, today);
      return {
        v: x,
        hl: i === mi && x > 0,
        top: x ? compact(x) : '',
        label: WEEKDAYS_SHORT[i],
        aria: `${new Date(day).getDate()} ${MONTHS[new Date(day).getMonth()]}`,
        onPress: off <= 0 ? () => setPeriod({ mode: 'gun', off, month: null }) : undefined,
      };
    });
    chartBadge = '7 gün';
    hint = 'Bir güne dokununca o günün detayı açılır';
  } else if (period.mode === 'yil') {
    const v = Array<number>(12).fill(0);
    for (const sh of inRange(all, R.ya, R.yb))
      for (const e of sh.entries) if (isIncome(e.category)) v[new Date(sh.start).getMonth()] += e.amount;
    const mi = v.indexOf(Math.max(...v));
    const sel = period.month;
    bars = v.map((x, i) => ({
      v: x,
      hl: sel !== null ? i === sel : i === mi && x > 0,
      sel: i === sel,
      top: x ? compact(x) : '',
      label: MONTHS_SHORT[i],
      aria: MONTHS[i],
      onPress: () => setPeriod((p) => ({ ...p, month: p.month === i ? null : i })),
    }));
    chartBadge = '12 ay';
    hint = sel !== null ? 'Yıl geneline dönmek için seçili aya tekrar dokun' : 'Bir aya dokununca rakamlar o aya geçer';
  }

  let badge: { up: boolean; text: string } | null = null;
  if (prev.shifts && prev.net > 0 && A.shifts) {
    const p = Math.round(((A.net - prev.net) / prev.net) * 100);
    badge = { up: p >= 0, text: `${R.cmp} ${p >= 0 ? '▲' : '▼'} %${Math.abs(p)}` };
  }

  const head = (
    <>
      <Text style={s.title}>Analiz</Text>
      <View style={s.seg}>
        {MODES.map(([m, label]) => {
          const on = period.mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[s.segBtn, on && { backgroundColor: c.yellow }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.segText, { color: on ? solid.onYellow : c.muted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.dnav}>
        <Pressable onPress={() => setPeriod((p) => step(p, -1, now))} style={s.navBtn} hitSlop={8} accessibilityLabel="Önceki dönem">
          <Icon name="left" size={22} color={c.text} />
        </Pressable>
        <View style={s.dnavLabel}>
          <Icon name="cal" size={17} color={c.muted} />
          <Text style={s.dnavText}>{R.label}</Text>
        </View>
        <Pressable
          onPress={() => setPeriod((p) => step(p, 1, now))}
          disabled={!R.canFwd}
          style={[s.navBtn, !R.canFwd && { opacity: 0.3 }]}
          hitSlop={8}
          accessibilityLabel="Sonraki dönem"
        >
          <Icon name="right" size={22} color={c.text} />
        </Pressable>
      </View>
    </>
  );

  const empty = !A.shifts && period.mode !== 'yil';
  const hours = A.ms / HOUR;

  return (
    <View style={s.screen}>
      <Backdrop />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[s.body, { paddingTop: insets.top, paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        {head}

        {empty ? (
          <Text style={s.empty}>
            Bu dönem için kayıt yok.{'\n'}‹ ile önceki dönemlere bakabilirsin.
          </Text>
        ) : (
          <>
            <View style={s.section}>
              <View style={s.between}>
                <Text style={s.label}>Net kâr</Text>
                {badge && (
                  <Text
                    style={[
                      s.badge,
                      { color: badge.up ? c.green : c.red, backgroundColor: badge.up ? c.greenSoft : c.redSoft },
                    ]}
                  >
                    {badge.text}
                  </Text>
                )}
              </View>
              <Text style={[s.big, A.net < 0 && { color: c.red }]}>
                {net < 0 ? '−' : ''}
                {tl(Math.abs(net))}
              </Text>
              <View style={[s.row, { marginTop: 14 }]}>
                <View style={s.half}>
                  <Text style={s.miniLabel}>Toplam ciro</Text>
                  <Text style={[s.miniValue, { color: c.text }]}>{tl(A.revenue)}</Text>
                </View>
                <View style={[s.half, s.vline]}>
                  <Text style={s.miniLabel}>Toplam gider</Text>
                  <Text style={[s.miniValue, { color: c.red }]}>−{tl(A.expense)}</Text>
                </View>
              </View>
            </View>

            {bars && (
              <View style={s.section}>
                <View style={s.between}>
                  <Text style={s.label}>Ciro dağılımı</Text>
                  <Text style={s.chip}>{chartBadge}</Text>
                </View>
                <Chart bars={bars} c={c} />
                {!!hint && <Text style={s.hint}>{hint}</Text>}
              </View>
            )}

            {A.trips > 0 && (
              <View style={s.section}>
                <View style={s.between}>
                  <Text style={s.label}>Verimlilik</Text>
                  <Text style={s.chip}>{A.shifts} vardiya</Text>
                </View>
                <Metric c={c} icon="clock" tone={c.yellowInk} bg={c.yellowSoft} title="Saat başı net" detail={`${dur(A.ms)} çalışma`} value={`${tl(hours > 0 ? A.net / hours : 0)}/sa`} />
                <Metric c={c} icon="car" tone={c.green} bg={c.greenSoft} title="Ortalama yolculuk" detail={`${A.trips} yolculuk`} value={tl(A.revenue / A.trips)} />
                {A.km > 0 && (
                  <Metric
                    c={c}
                    icon="pin"
                    tone={c.blue}
                    bg={c.blueSoft}
                    title="Km başı net"
                    detail={`${fmt(A.km)} km`}
                    value={`₺${(A.kmNet / A.km).toFixed(1).replace('.', ',')}/km`}
                  />
                )}
              </View>
            )}

            <Breakdown c={c} title="Gelir dağılımı" cats={INCOME} A={A} total={A.revenue} />
            <Breakdown c={c} title="Gider dağılımı" cats={EXPENSE} A={A} total={A.expense} last />
          </>
        )}
      </Animated.ScrollView>
      <TopBlur y={y} />
    </View>
  );
}

function Chart({ bars, c }: { bars: Bar[]; c: Palette }) {
  const s = styles(c);
  const max = Math.max(1, ...bars.map((b) => b.v));
  const showTop = bars.length <= 12;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={[s.bars, { height: CHART_HEIGHT }]}>
        {bars.map((b, i) => {
          const h = b.v > 0 ? Math.max(3, (b.v / max) * 100) : 0;
          return (
            <Pressable
              key={i}
              onPress={b.onPress}
              disabled={!b.onPress}
              style={s.bcol}
              accessibilityRole={b.onPress ? 'button' : undefined}
              accessibilityLabel={b.aria}
            >
              {showTop && (
                <Text style={[s.btop, b.sel && { color: c.yellowInk }]} numberOfLines={1}>
                  {b.top}
                </Text>
              )}
              <View style={[s.btrack, b.sel && { backgroundColor: c.yellowSoft }]}>
                {/* İnce çubuk (en fazla 22 px), üst köşeleri yuvarlak; boş saatlerde tabanda kısa bir iz. */}
                <View
                  style={[
                    s.bar,
                    b.v > 0
                      ? { height: `${h}%`, backgroundColor: b.hl ? c.yellow : c.line }
                      : { height: 4, backgroundColor: c.sunk },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={s.blabs}>
        {bars.map((b, i) => (
          <Text key={i} style={[s.blab, b.sel && { color: c.yellowInk, ...fonts.uiBold }]} numberOfLines={1}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Metric(p: { c: Palette; icon: IconName; tone: string; bg: string; title: string; detail: string; value: string }) {
  const s = styles(p.c);
  return (
    <View style={s.metric}>
      <View style={s.iconBox}>
        <Icon name={p.icon} size={20} color={p.tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.metricTitle}>{p.title}</Text>
        <Text style={s.metricDetail}>{p.detail}</Text>
      </View>
      {/* Ölçüm rakamı nötr renkte: yeşil/kırmızı sadece gelir/gider anlamına gelir. */}
      <Text style={s.metricValue}>{p.value}</Text>
    </View>
  );
}

function Breakdown(p: { c: Palette; title: string; cats: Category[]; A: Agg; total: number; last?: boolean }) {
  const { c } = p;
  const s = styles(c);
  return (
    <View style={[s.section, p.last && { borderBottomWidth: 0 }]}>
      <Text style={s.label}>{p.title}</Text>
      {/* Deneme: halka grafik. Tek parçalı çubuğa dönmek için DonutChart → SplitBar (aynı props). */}
      <DonutChart
        total={p.total}
        items={p.cats.map((cat) => ({
          key: cat,
          label: CATEGORY[cat].label,
          amount: p.A.byCategory[cat],
          // Uygulama her temada gerçek taksi sarısı (açık temadaki hardal tonu çamur gibi duruyordu).
          color: cat === 'Uygulama' ? c.yellow : CATEGORY[cat].tone(c).fg,
        }))}
      />
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    body: { paddingHorizontal: 18, paddingBottom: 40 },
    title: { ...fonts.uiHeavy, fontSize: 28, color: c.text, marginTop: 8, lineHeight: 44, letterSpacing: -0.5 },
    seg: {
      flexDirection: 'row',
      marginTop: 16,
      padding: 4,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    segBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    segText: { ...fonts.uiSemi, fontSize: 15 },
    dnav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    dnavLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dnavText: { ...fonts.uiBold, fontSize: 17, color: c.text },
    section: { backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 20, padding: 18, marginTop: 14 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    row: { flexDirection: 'row' },
    half: { flex: 1, gap: 6 },
    vline: { paddingLeft: 12 },
    label: { ...fonts.uiBold, fontSize: 16, color: c.text },
    badge: {
      ...fonts.uiBold,
      fontSize: 13,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    chip: { ...fonts.ui, fontSize: 15, color: c.muted },
    big: { ...fonts.display, fontSize: 48, color: c.green, letterSpacing: -1.5, marginTop: 8 },
    miniLabel: { ...fonts.uiSemi, fontSize: 15, color: c.muted },
    miniValue: { ...fonts.numHeavy, fontSize: 22 },
    bars: { flexDirection: 'row', alignItems: 'stretch', gap: 4 },
    bcol: { flex: 1, alignItems: 'center' },
    btop: { ...fonts.num, fontSize: 11, color: c.muted, height: 16 },
    btrack: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end', borderRadius: 8 },
    bar: { width: '100%', maxWidth: BAR_MAX_WIDTH, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
    blabs: { flexDirection: 'row', gap: 4, marginTop: 8 },
    blab: { flex: 1, textAlign: 'center', ...fonts.num, fontSize: 12, color: c.faint },
    hint: { ...fonts.ui, fontSize: 14, color: c.faint, textAlign: 'center', marginTop: 12 },
    metric: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
    iconBox: { width: 28, alignItems: 'center' },
    metricTitle: { ...fonts.uiSemi, fontSize: 16, color: c.text },
    metricDetail: { ...fonts.ui, fontSize: 14, color: c.faint, marginTop: 2 },
    metricValue: { ...fonts.numHeavy, fontSize: 19, color: c.text },
    empty: { ...fonts.ui, fontSize: 16, color: c.faint, textAlign: 'center', paddingVertical: 48, lineHeight: 24 },
  });
