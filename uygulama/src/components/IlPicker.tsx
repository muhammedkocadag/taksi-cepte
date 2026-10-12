import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { ILLER, lower } from '@/lib/data';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const ALL = ILLER.map((name, i) => ({ name, code: String(i + 1).padStart(2, '0') }));

// 81 il; adıyla ya da plaka koduyla aranır ("06" → Ankara).
export function IlPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (il: string) => void }) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  useEffect(() => {
    if (visible) setQ('');
  }, [visible]);
  const query = lower(q.trim());
  const list = ALL.filter((x) => lower(x.name).includes(query) || x.code.startsWith(query));

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View>
        <Text style={[styles.title, { color: c.text }]}>Çalıştığın il</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Etkinlikler bu ile göre gösterilir</Text>
      </View>
      <View style={[styles.search, { backgroundColor: c.sunk, borderColor: c.line }]}>
        <Icon name="search" size={18} color={c.faint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="İl ya da plaka kodu ara"
          placeholderTextColor={c.faint}
          style={[styles.input, { color: c.text }]}
          autoCorrect={false}
        />
      </View>
      <FlatList
        style={styles.list}
        data={list}
        keyExtractor={(x) => x.code}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={[styles.none, { color: c.faint }]}>"{q}" bulunamadı.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              onPick(item.name);
              onClose();
            }}
            style={[styles.row, { borderBottomColor: c.line }]}
          >
            <Text style={[styles.code, { color: c.faint }]}>{item.code}</Text>
            <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
            <Icon name="right" size={18} color={c.faint} />
          </Pressable>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...fonts.uiBold, fontSize: 21 },
  sub: { ...fonts.ui, fontSize: 14.5, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  input: { flex: 1, ...fonts.uiSemi, fontSize: 17 },
  list: { maxHeight: 400 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: 1 },
  code: { ...fonts.num, fontSize: 15, width: 26 },
  name: { flex: 1, ...fonts.uiBold, fontSize: 17 },
  none: { ...fonts.ui, fontSize: 15, paddingVertical: 14 },
});
