import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { EditEntrySheet } from '@/components/EditEntrySheet';
import { EntryRow } from '@/components/EntryRow';
import { BackHeader } from '@/components/ScreenHeader';
import { dayLabel, hm, tl } from '@/lib/format';
import { totals, useShift, type Entry, type Shift } from '@/store/shift';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export default function Gecmis() {
  const { c } = useTheme();
  const { current, past } = useShift();
  const [editing, setEditing] = useState<Entry | null>(null);
  const shifts: Shift[] = current ? [current, ...past] : past;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Backdrop />
      <BackHeader title="Geçmiş" />
      <ScrollView contentContainerStyle={styles.body}>
        {shifts.length === 0 && (
          <Text style={[styles.empty, { color: c.faint }]}>Henüz bir vardiya yok.</Text>
        )}
        {shifts.map((s) => {
          const t = totals(s);
          const items = [...s.entries].sort((a, b) => b.at - a.at);
          return (
            <View key={s.id} style={[styles.group, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <View style={styles.groupHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupTitle, { color: c.text }]}>
                    {s === current ? 'Bu vardiya' : dayLabel(s.start)}
                  </Text>
                  <Text style={[styles.groupMeta, { color: c.faint }]}>
                    {hm(s.start)} – {s.end ? hm(s.end) : 'devam ediyor'} · {t.trips} yolculuk
                    {s.km ? ` · ${s.km} km` : ''}
                  </Text>
                </View>
                <Text style={[styles.net, { color: t.net < 0 ? c.red : c.green }]}>Net {tl(t.net)}</Text>
              </View>
              {items.length === 0 ? (
                <Text style={[styles.empty, { color: c.faint }]}>Kayıt yok</Text>
              ) : (
                items.map((e) => <EntryRow key={e.id} shift={s} entry={e} onPress={() => setEditing(e)} divider={false} />)
              )}
            </View>
          );
        })}
      </ScrollView>
      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingBottom: 40 },
  group: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6, marginTop: 14 },
  groupHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  groupTitle: { ...fonts.uiSemi, fontSize: 17 },
  groupMeta: { ...fonts.ui, fontSize: 13.5, marginTop: 2 },
  net: { ...fonts.numHeavy, fontSize: 15 },
  empty: { ...fonts.ui, fontSize: 15, textAlign: 'center', paddingVertical: 28 },
});
