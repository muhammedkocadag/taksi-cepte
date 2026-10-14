import { openBrowserAsync } from 'expo-web-browser';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { Icon, type IconName } from '@/components/Icon';
import { IlPicker } from '@/components/IlPicker';
import { BackHeader } from '@/components/ScreenHeader';
import { Sheet } from '@/components/Sheet';
import { Button, Field, SheetHeader } from '@/components/ui';
import { cloudEnabled, currentUser, isCanceled } from '@/lib/auth';
import { seedDemo } from '@/lib/demoData';
import { APP_NAME, LEGAL } from '@/lib/brand';
import { testNotification, useNotifPermission } from '@/lib/notifications';
import { weeklyDigest } from '@/lib/notifyPlan';
import { addDays, monday } from '@/lib/period';
import { deleteCloudAccount, prepareSignOut } from '@/store/account';
import { useCityEvents } from '@/store/events';
import { useProfile } from '@/store/profile';
import { useTheme, type ThemeSetting } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

const THEMES: [ThemeSetting, string][] = [
  ['auto', 'Otomatik'],
  ['light', 'Açık'],
  ['dark', 'Koyu'],
];

// "5321234547" → "+90 532 ••• •• 47"
const maskPhone = (d: string) => (d.length === 10 ? `+90 ${d.slice(0, 3)} ••• •• ${d.slice(8)}` : '');

export default function Ayarlar() {
  const { c, setting, setSetting: setTheme } = useTheme();
  const s = styles(c);
  const { profile, settings, setSetting, signIn, signOut, deleteAccount, reloadFromDb } = useProfile();
  const [sheet, setSheet] = useState<'name' | 'il' | 'logout' | 'delete' | null>(null);
  const [name, setName] = useState('');
  const close = () => {
    setSheet(null);
    setAccErr('');
    setForceOut(false);
  };
  // Çıkış ve silme internet ister (önce bulut): olmazsa pencere açık kalır, uyarı çıkar, telefondaki veri silinmez.
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [accErr, setAccErr] = useState('');
  const [forceOut, setForceOut] = useState(false); // yedeksiz kayıtlar için ikinci basış: "Yine de çık"
  const doAccount = async (kind: 'logout' | 'delete') => {
    setBusy(true);
    setAccErr('');
    try {
      if (kind === 'logout') await prepareSignOut(db, forceOut);
      else await deleteCloudAccount();
      setSheet(null);
      if (kind === 'logout') signOut();
      else deleteAccount();
    } catch (e) {
      if (isCanceled(e)) return; // Apple doğrulamasından vazgeçti: hiçbir şey silinmedi
      if ((e as { code?: string })?.code === 'yedeksiz') {
        setForceOut(true);
        setAccErr('Bu kayıtlar bir hesaba yedeklenmemiş; çıkış yaparsan bu telefondan silinir.');
      } else setAccErr('İnternet bağlantısı gerekli. Bağlanıp tekrar dene; kayıtların telefonda duruyor.');
    } finally {
      setBusy(false);
    }
  };
  const perm = useNotifPermission();

  const goalOn = settings.goalOn === '1';
  const on = (key: string) => settings[key] !== '0'; // bildirimler varsayılan açık
  const { events } = useCityEvents();
  const tryWeekly = () => {
    const now = Date.now();
    const il = profile?.il ?? '';
    const d = weeklyDigest(events, monday(now), il) ?? weeklyDigest(events, addDays(monday(now), 7), il);
    if (d) testNotification({ ...d, url: '/etkinlik' });
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Backdrop />
      <BackHeader title="Ayarlar" />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.section}>
          <Text style={s.label}>Görünüm</Text>
          <View style={s.seg}>
            {THEMES.map(([v, l]) => {
              const sel = setting === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setTheme(v)}
                  style={[s.segBtn, sel && { backgroundColor: c.yellow }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                >
                  <Text style={[s.segText, { color: sel ? solid.onYellow : c.muted }]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.hint}>Otomatik: 19:00 – 07:00 arası koyu, gündüz açık tema.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Vardiya hedefi</Text>
          <Row icon="target" tone={c.yellowInk} bg={c.yellowSoft} title="Hedef göster" sub="Ana sayfada ilerleme çubuğu">
            <Toggle value={goalOn} onChange={(v) => setSetting('goalOn', v ? '1' : '0')} label="Hedef göster" />
          </Row>
          {goalOn && (
            <Row icon="cash" tone={c.yellowInk} bg={c.yellowSoft} title="Vardiya başına" sub="Ciro hedefi">
              <View style={s.goal}>
                <Text style={s.goalCur}>₺</Text>
                <TextInput
                  value={settings.goal ?? ''}
                  onChangeText={(v) => setSetting('goal', v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="3500"
                  placeholderTextColor={c.faint}
                  style={s.goalInput}
                  accessibilityLabel="Hedef tutarı"
                />
              </View>
            </Row>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.label}>Ses</Text>
          <Row icon="sound" tone={c.green} bg={c.greenSoft} title="Kayıt sesi" sub="Gelirde çın-çın, giderde kısa bir tık">
            <Toggle value={on('saveSound')} onChange={(v) => setSetting('saveSound', v ? '1' : '0')} label="Kayıt sesi" />
          </Row>
          <Text style={s.hint}>Telefon sessiz moddayken ses çalmaz.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Bildirimler</Text>
          <Row icon="bell" tone={c.blue} bg={c.blueSoft} title="Açık kalan vardiya" sub="Vardiya 14 saati geçince uyar">
            <Toggle value={on('notifShift')} onChange={(v) => setSetting('notifShift', v ? '1' : '0')} label="Açık kalan vardiya" />
          </Row>
          <Row icon="wrench" tone={c.orange} bg={c.orangeSoft} title="Muayene ve sigorta" sub="Bitmeden 7 gün önce ve bitiş günü">
            <Toggle value={on('notifMaint')} onChange={(v) => setSetting('notifMaint', v ? '1' : '0')} label="Muayene ve sigorta hatırlatmaları" />
          </Row>
          <Row icon="cal" tone={c.green} bg={c.greenSoft} title="Haftalık etkinlik özeti" sub="Pazartesi 10:00 · bu hafta neler var">
            <Toggle value={on('notifWeekly')} onChange={(v) => setSetting('notifWeekly', v ? '1' : '0')} label="Haftalık etkinlik özeti" />
          </Row>
          {__DEV__ && (
            <Pressable onPress={tryWeekly} accessibilityRole="button">
              <Text style={s.hint}>Geliştirme: haftalık özeti şimdi dene (5 sn sonra gelir)</Text>
            </Pressable>
          )}
          {__DEV__ && (
            <Pressable
              onPress={() => {
                seedDemo(db);
                reloadFromDb();
              }}
              accessibilityRole="button"
            >
              <Text style={s.hint}>Geliştirme: örnek verileri yükle (mağaza görüntüleri; kayıtların yerine geçer)</Text>
            </Pressable>
          )}
          {perm.state === 'denied' && (
            <Pressable onPress={perm.fix} style={[s.permWarn, { backgroundColor: c.redSoft }]} accessibilityRole="button">
              <Icon name="belloff" size={20} color={c.red} />
              <Text style={[s.permText, { color: c.red }]}>Bildirim izni kapalı. Açmak için dokun, telefon ayarlarında "Bildirimler"i aç.</Text>
            </Pressable>
          )}
          <Text style={s.hint}>Etkinlik hatırlatmaları, Etkinlik ekranında zili açtığın etkinlikler için gelir.</Text>
        </View>

        <View style={[s.section, { borderBottomWidth: 0 }]}>
          <Text style={s.label}>Hesap</Text>
          <Row
            icon="user"
            tone={c.grey}
            bg={c.greySoft}
            title={profile?.name || 'Adın'}
            sub={currentUser()?.provider === 'apple' ? 'Apple ile giriş' : maskPhone(profile?.phone ?? '')}
            onPress={() => {
              setName(profile?.name ?? '');
              setSheet('name');
            }}
          >
            <Icon name="pencil" size={18} color={c.faint} />
          </Row>
          <Row icon="pin" tone={c.grey} bg={c.greySoft} title="Çalıştığın il" sub={`${profile?.il ?? ''} · etkinlikler bu ile göre`} onPress={() => setSheet('il')}>
            <Icon name="right" size={18} color={c.faint} />
          </Row>
          <Row icon="logout" tone={c.grey} bg={c.greySoft} title="Çıkış yap" onPress={() => setSheet('logout')} />
          <Row
            icon="trash"
            tone={c.red}
            bg={c.redSoft}
            title="Hesabı sil"
            titleColor={c.red}
            sub="Hesabın ve tüm kayıtların kalıcı olarak silinir"
            onPress={() => setSheet('delete')}
            last
          />
        </View>
        <Text style={s.version}>
          {APP_NAME.join(' ')} · Sürüm 0.1
        </Text>
        <Text style={s.links}>
          <Text onPress={() => openBrowserAsync(LEGAL.gizlilik)} accessibilityRole="link">Gizlilik</Text>
          {'  ·  '}
          <Text onPress={() => openBrowserAsync(LEGAL.kvkk)} accessibilityRole="link">KVKK</Text>
          {'  ·  '}
          <Text onPress={() => openBrowserAsync(LEGAL.kosullar)} accessibilityRole="link">Kullanım Koşulları</Text>
        </Text>
      </ScrollView>

      <Sheet visible={sheet === 'name'} onClose={close}>
        <SheetHeader icon="user" tone="yellow" title="Adın" />
        <Field value={name} onChange={setName} autoFocus autoCapitalize="words" big />
        <View style={s.buttons}>
          <Button label="Vazgeç" variant="ghost" onPress={close} />
          <Button
            label="Kaydet"
            disabled={!name.trim()}
            onPress={() => {
              if (profile) signIn({ ...profile, name: name.trim() });
              close();
            }}
            style={{ flex: 1.4 }}
          />
        </View>
      </Sheet>

      <IlPicker visible={sheet === 'il'} onClose={close} onPick={(il) => profile && signIn({ ...profile, il })} />

      <Sheet visible={sheet === 'logout'} onClose={close}>
        <SheetHeader
          icon="logout"
          tone="yellow"
          title="Çıkış yapılsın mı?"
          subtitle={
            cloudEnabled
              ? 'Kayıtların hesabına yedeklenir; aynı numarayla giriş yapınca, başka telefondan da geri gelir.'
              : 'Kayıtların bu telefonda kalır; tekrar giriş yapınca yerinde olur.'
          }
        />
        {!!accErr && <Text style={[s.warn, { color: c.red }]}>{accErr}</Text>}
        <View style={s.buttons}>
          <Button label="Vazgeç" variant="ghost" onPress={close} />
          <Button
            label={busy ? 'Yedekleniyor…' : forceOut ? 'Yine de çık' : 'Çıkış yap'}
            variant={forceOut ? 'red' : undefined}
            onPress={() => doAccount('logout')}
            disabled={busy}
            style={{ flex: 1.4 }}
          />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'delete'} onClose={close}>
        <SheetHeader icon="trash" tone="red" title="Hesabın silinsin mi?" />
        <Text style={[s.warn, { color: c.text }]}>
          Bütün vardiyaların, gelir-gider kayıtların ve araç bilgilerin <Text style={{ color: c.red, ...fonts.uiBold }}>kalıcı olarak</Text> silinir. Bu işlem geri alınamaz.
        </Text>
        {!!accErr && <Text style={[s.warn, { color: c.red }]}>{accErr}</Text>}
        <View style={s.buttons}>
          <Button label="Vazgeç" variant="ghost" onPress={close} />
          <Button
            label="Evet, hesabımı sil"
            variant="red"
            onPress={() => doAccount('delete')}
            disabled={busy}
            style={{ flex: 1.6 }}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Row(p: {
  icon: IconName;
  tone: string;
  bg: string;
  title: string;
  titleColor?: string;
  sub?: string;
  onPress?: () => void;
  last?: boolean;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const s = styles(c);
  return (
    <Pressable
      onPress={p.onPress}
      disabled={!p.onPress}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
      accessibilityRole={p.onPress ? 'button' : undefined}
    >
      <View style={s.iconBox}>
        <Icon name={p.icon} size={20} color={p.tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, p.titleColor ? { color: p.titleColor } : null]}>{p.title}</Text>
        {!!p.sub && <Text style={s.rowSub}>{p.sub}</Text>}
      </View>
      {p.children}
    </Pressable>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: c.line, true: c.yellow }}
      thumbColor="#ffffff"
      ios_backgroundColor={c.line}
      accessibilityLabel={label}
    />
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    body: { paddingHorizontal: 18, paddingBottom: 40 },
    section: { backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, marginTop: 14 },
    label: { ...fonts.uiBold, fontSize: 16, color: c.text, marginBottom: 4 },
    hint: { ...fonts.ui, fontSize: 14, color: c.faint, marginTop: 10 },
    seg: { flexDirection: 'row', marginTop: 10, padding: 4, borderRadius: 14, backgroundColor: c.sunk },
    segBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    segText: { ...fonts.uiSemi, fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    iconBox: { width: 28, alignItems: 'center' },
    rowTitle: { ...fonts.uiSemi, fontSize: 17, color: c.text },
    rowSub: { ...fonts.ui, fontSize: 14, color: c.faint, marginTop: 2 },
    goal: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 120, height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, backgroundColor: c.card, borderColor: c.cardBorder },
    goalCur: { ...fonts.numHeavy, fontSize: 18, color: c.muted },
    goalInput: { flex: 1, ...fonts.numHeavy, fontSize: 20, color: c.text, paddingVertical: 4, textAlign: 'right' },
    version: { ...fonts.ui, fontSize: 13, color: c.faint, textAlign: 'center', marginTop: 8 },
    links: { ...fonts.uiSemi, fontSize: 13, color: c.muted, textAlign: 'center', marginTop: 10, lineHeight: 22 },
    buttons: { flexDirection: 'row', gap: 10 },
    permWarn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginTop: 8 },
    permText: { flex: 1, ...fonts.uiBold, fontSize: 14, lineHeight: 20 },
    warn: { ...fonts.ui, fontSize: 16, lineHeight: 24 },
  });
