import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { EditEntrySheet } from '@/components/EditEntrySheet';
import { EndShiftSheet } from '@/components/EndShiftSheet';
import { EntryRow } from '@/components/EntryRow';
import { Icon } from '@/components/Icon';
import { useTabBarSpace } from '@/components/TabBar';
import { SETTINGS_BTN } from '@/components/SettingsButton';
import { CATEGORY } from '@/lib/categories';
import { dur, tl } from '@/lib/format';
import { useCountUp } from '@/lib/useCountUp';
import { useProfile } from '@/store/profile';
import { INCOME, totals, useShift, type Entry } from '@/store/shift';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

const RECENT_COUNT = 5;

function useNow(everyMs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

export default function Home() {
  const { c } = useTheme();
  const tabSpace = useTabBarSpace();
  const s = styles(c);
  const { current, startShift } = useShift();
  const { settings } = useProfile();
  const now = useNow(15_000);
  const [ending, setEnding] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  const t = totals(current);
  const goal = settings.goalOn === '1' ? parseInt(settings.goal ?? '', 10) || 0 : 0;
  const goalPct = goal > 0 ? Math.min(100, Math.round((t.revenue / goal) * 100)) : 0;
  const revenue = useCountUp(t.revenue);
  const net = useCountUp(t.net);

  // Ayarlar düğmesi sekmelerin ortak düzeninde, sağ üstte sabit; burada yeri boş bırakılır.
  const settingsBtn = <View style={{ width: SETTINGS_BTN, height: SETTINGS_BTN }} />;

  const sheets = (
    <>
      <EndShiftSheet visible={ending} onClose={() => setEnding(false)} />
      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />
    </>
  );

  if (!current) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Backdrop />
        {/* İki görünümde de aynı yerde: vardiya bitince özet penceresi kaybolmasın. */}
        {sheets}
        <View style={s.header}>
          <View style={s.pill}>
            <View style={[s.dot, { backgroundColor: c.red }]} />
            <Text style={[s.pillText, { color: c.muted }]}>Vardiya kapalı</Text>
          </View>
          {settingsBtn}
        </View>
        <View style={s.closed}>
          <View style={s.taxi}>
            <Icon name="car" size={46} color={c.yellowInk} />
          </View>
          <Text style={s.closedTitle}>Sürüşe başlamadınız.</Text>
          <Text style={s.closedText}>Kazanç, harcama ve yolculuklarını kaydetmek için vardiyanı başlat.</Text>
          <Pressable style={s.cta} onPress={startShift} accessibilityRole="button">
            <Icon name="play" size={18} color={solid.onYellow} />
            <Text style={s.ctaText}>Vardiyayı Başlat</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const recent = [...current.entries].sort((a, b) => b.at - a.at).slice(0, RECENT_COUNT);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Backdrop />
      {sheets}
      <View style={s.header}>
        <View style={s.pill}>
          <View style={[s.dot, { backgroundColor: c.green }]} />
          <Text style={[s.pillText, { color: c.green }]}>Vardiya · {dur(now - current.start)}</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable
            style={({ pressed }) => [s.stopBtn, pressed && { opacity: 0.6 }]}
            onPress={() => setEnding(true)}
            accessibilityRole="button"
            accessibilityLabel="Vardiyayı bitir"
          >
            <Text style={s.stopText}>Bitir</Text>
          </Pressable>
          {settingsBtn}
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        {/* Deneme tasarımı: çizgiler yerine üç kutu (ciro + net + gider / gelir dağılımı / son işlemler). */}
        <View style={s.card}>
          <View style={s.between}>
            <Text style={[s.label, { color: c.muted, ...fonts.uiSemi }]}>Bu vardiya</Text>
            <Text style={s.chip}>{t.trips} yolculuk</Text>
          </View>
          <Text style={s.big}>{tl(revenue)}</Text>
          {goal > 0 && (
            <View style={s.goal}>
              <View style={s.between}>
                <Text style={s.goalText}>
                  Hedef: <Text style={s.goalNum}>{tl(goal)}</Text>
                </Text>
                <Text style={[s.goalNum, { color: goalPct >= 100 ? c.green : c.text }]}>%{goalPct}</Text>
              </View>
              <View style={s.goalTrack}>
                <View style={[s.goalFill, { width: `${goalPct}%`, backgroundColor: goalPct >= 100 ? c.green : c.yellow }]} />
              </View>
            </View>
          )}
          <View style={[s.row, { marginTop: 18 }]}>
            <View style={s.half}>
              <Text style={s.miniLabel}>Net kâr</Text>
              <Text style={[s.miniValue, { color: net < 0 ? c.red : c.green }]}>
                {net < 0 ? '−' : '+'}
                {tl(Math.abs(net))}
              </Text>
            </View>
            <View style={s.half}>
              <Text style={s.miniLabel}>Gider</Text>
              <Text style={[s.miniValue, { color: c.red }]}>−{tl(t.expense)}</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Gelir dağılımı</Text>
          <View style={[s.row, { marginTop: 12 }]}>
            {INCOME.map((cat) => {
              const tone = CATEGORY[cat].tone(c);
              return (
                <View key={cat} style={s.third}>
                  <Icon name={CATEGORY[cat].icon} size={24} color={tone.fg} />
                  <Text style={s.miniLabel}>{CATEGORY[cat].label}</Text>
                  <Text style={s.thirdValue}>{tl(t.byCategory[cat])}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.card}>
          <View style={s.between}>
            <Text style={s.label}>Son işlemler</Text>
            <Pressable onPress={() => router.push('/gecmis')} hitSlop={10} accessibilityRole="link">
              <Text style={s.link}>Tümü ({current.entries.length})</Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <Text style={s.empty}>Bu vardiyada henüz kayıt yok.{'\n'}Alttaki + ile ilk kaydını ekle.</Text>
          ) : (
            recent.map((e) => (
              <EntryRow key={e.id} shift={current} entry={e} onPress={() => setEditing(e)} divider={false} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 6,
    },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { ...fonts.uiSemi, fontSize: 16 },
    // Sakin gri düğme; yanlışlıkla basılsa da bitirmeden önce onay penceresi açılır.
    stopBtn: { height: 40, paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.key, justifyContent: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    link: { ...fonts.uiSemi, fontSize: 15, color: c.yellowInk },
    stopText: { ...fonts.uiBold, fontSize: 16, color: c.text },
    body: { paddingHorizontal: 18, paddingBottom: 40 },
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 20, padding: 18, marginTop: 14 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    row: { flexDirection: 'row' },
    half: { flex: 1, gap: 6 },
    third: { flex: 1, alignItems: 'center', gap: 6 },
    label: { ...fonts.uiBold, fontSize: 16, color: c.text },
    chip: { ...fonts.ui, fontSize: 15, color: c.muted },
    big: { ...fonts.display, fontSize: 54, color: c.text, letterSpacing: -1.5, marginTop: 10 },
    goal: { marginTop: 14, gap: 8 },
    goalText: { ...fonts.uiSemi, fontSize: 15, color: c.muted },
    goalNum: { ...fonts.numHeavy, fontSize: 15, color: c.text },
    goalTrack: { height: 8, borderRadius: 4, backgroundColor: c.sunk, overflow: 'hidden' },
    goalFill: { height: '100%', borderRadius: 4 },
    miniLabel: { ...fonts.uiSemi, fontSize: 15, color: c.muted },
    miniValue: { ...fonts.numHeavy, fontSize: 23 },
    thirdValue: { ...fonts.numHeavy, fontSize: 17, color: c.text },
    empty: { ...fonts.ui, fontSize: 15, color: c.faint, textAlign: 'center', paddingVertical: 24, lineHeight: 23 },
    closed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
    taxi: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: c.yellowSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closedTitle: { ...fonts.uiHeavy, fontSize: 26, color: c.text, marginTop: 10 },
    closedText: { ...fonts.ui, fontSize: 17, color: c.muted, textAlign: 'center', lineHeight: 25 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 58,
      paddingHorizontal: 30,
      borderRadius: 16,
      backgroundColor: c.yellow,
      marginTop: 18,
    },
    ctaText: { ...fonts.uiBold, fontSize: 18, color: solid.onYellow },
  });
