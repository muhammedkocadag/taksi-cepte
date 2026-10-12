import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/Backdrop';
import { CarPicker } from '@/components/CarPicker';
import { Icon } from '@/components/Icon';
import { IlPicker } from '@/components/IlPicker';
import { Logo } from '@/components/Logo';
import { Sheet } from '@/components/Sheet';
import { Button, Field } from '@/components/ui';
import { APP_NAME, TAGLINE } from '@/lib/brand';
import { formatPlate, plateOk } from '@/lib/data';
import { useProfile } from '@/store/profile';
import { useVehicle } from '@/store/vehicle';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, solid, type Palette } from '@/theme/tokens';

// Kayıt ve giriş aynı akış: telefon → SMS kodu → (yeni kullanıcıysa) "Son bir adım".
// Aşama 1: SMS gönderilmiyor, herhangi 6 rakam kabul ediliyor. Firebase gelince gerçek doğrulama.

type Step = 'phone' | 'code' | 'profile';
const RESEND_S = 60;

const fmtPhone = (d: string) => [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ');
const phoneErr = (d: string) => (d.length && d[0] !== '5' ? 'Cep numarası 5 ile başlamalı' : '');

export default function Giris() {
  const { c } = useTheme();
  const s = styles(c);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');

  return (
    <SafeAreaView style={s.screen}>
      <Backdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 'phone' && <PhoneStep phone={phone} setPhone={setPhone} onNext={() => setStep('code')} />}
          {step === 'code' && <CodeStep phone={phone} onBack={() => setStep('phone')} onNext={() => setStep('profile')} />}
          {step === 'profile' && <ProfileStep phone={phone} />}
          <View style={s.dots}>
            {(['phone', 'code', 'profile'] as Step[]).map((x) => (
              <View key={x} style={[s.dot, x === step && s.dotOn]} />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhoneStep({ phone, setPhone, onNext }: { phone: string; setPhone: (v: string) => void; onNext: () => void }) {
  const { c } = useTheme();
  const s = styles(c);
  const err = phoneErr(phone);
  const ok = phone.length === 10 && !err;
  return (
    <>
      <View style={s.brand}>
        <Logo width={104} />
        {/* Logodaki gibi: "Taksi" sarı, "Cepte" yazı renginde (koyu temada beyaz). */}
        <Text style={s.wordmark}>
          <Text style={{ color: c.yellowInk }}>{APP_NAME[0]}</Text> {APP_NAME[1]}
        </Text>
        <Text style={s.tagline}>{TAGLINE}</Text>
        <Text style={[s.sub, { textAlign: 'center', marginTop: 18 }]}>Hoş geldin! Devam etmek için telefon numaranı gir.</Text>
      </View>
      <View style={s.grow} />
      <Text style={s.label}>Telefon numarası</Text>
      <View style={[s.phone, { borderColor: err ? c.red : c.line }]}>
        <Text style={s.cc}>+90</Text>
        <TextInput
          value={fmtPhone(phone)}
          onChangeText={(v) => setPhone(v.replace(/\D/g, '').replace(/^0/, '').slice(0, 10))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel-national"
          placeholder="5XX XXX XX XX"
          placeholderTextColor={c.faint}
          style={s.phoneInput}
          accessibilityLabel="Telefon numarası"
        />
      </View>
      <Text style={[s.hint, err ? { color: c.red } : null]}>{err || 'Giriş ya da kayıt için SMS ile kod göndereceğiz.'}</Text>
      <View style={[s.row, { marginTop: 22 }]}>
        <Button label="Devam et" icon="right" onPress={onNext} disabled={!ok} />
      </View>
      <Text style={s.legal}>
        Devam ederek <Text style={s.legalLink}>Kullanım Koşulları</Text>'nı ve <Text style={s.legalLink}>Aydınlatma Metni</Text>'ni kabul
        etmiş olursun.
      </Text>
    </>
  );
}

function CodeStep({ phone, onBack, onNext }: { phone: string; onBack: () => void; onNext: () => void }) {
  const { c } = useTheme();
  const s = styles(c);
  const [code, setCode] = useState('');
  const [sentAt, setSentAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [verified, setVerified] = useState(false);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (code.length !== 6) return;
    setVerified(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = setTimeout(onNext, 700);
    return () => clearTimeout(id);
  }, [code, onNext]);

  const left = Math.max(0, RESEND_S - Math.floor((now - sentAt) / 1000));

  return (
    <>
      <Pressable onPress={onBack} style={s.back} hitSlop={8} accessibilityRole="button">
        <Icon name="left" size={20} color={c.text} />
        <Text style={s.backText}>Geri</Text>
      </Pressable>
      <Text style={s.h2}>Kodu gir</Text>
      <Text style={s.sub}>
        <Text style={{ color: c.text, ...fonts.uiBold }}>+90 {fmtPhone(phone)}</Text> numarasına 6 haneli bir kod gönderdik.
      </Text>
      <Pressable onPress={() => input.current?.focus()} style={s.otp} accessibilityLabel="Doğrulama kodu">
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={[
              s.box,
              i === code.length && !verified && { borderColor: c.yellow },
              verified && { borderColor: c.green, backgroundColor: c.greenSoft },
            ]}
          >
            <Text style={s.boxText}>{code[i] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          editable={!verified}
          style={s.hidden}
          caretHidden
        />
      </Pressable>
      {verified ? (
        <View style={s.verified}>
          <Icon name="check" size={20} color={c.green} />
          <Text style={[s.verifiedText, { color: c.green }]}>Doğrulandı</Text>
        </View>
      ) : (
        <View style={s.links}>
          <Pressable
            disabled={left > 0}
            onPress={() => {
              setSentAt(Date.now());
              setCode('');
            }}
          >
            <Text style={[s.link, left > 0 && { color: c.faint }]}>
              {left > 0 ? `Tekrar gönder (0:${String(left).padStart(2, '0')})` : 'Kodu tekrar gönder'}
            </Text>
          </Pressable>
          <Pressable onPress={onBack}>
            <Text style={s.link}>Numarayı değiştir</Text>
          </Pressable>
        </View>
      )}
      <View style={s.grow} />
      <Text style={s.legal}>Deneme sürümü: SMS gönderilmiyor, herhangi 6 rakam yazman yeterli.</Text>
    </>
  );
}

function ProfileStep({ phone }: { phone: string }) {
  const { c } = useTheme();
  const s = styles(c);
  const { settings, signIn } = useProfile();
  const { vehicle, save } = useVehicle();
  // Daha önce girilmiş bilgiler varsa (çıkış yapıp tekrar girince) hazır gelir.
  const [name, setName] = useState(settings.name ?? '');
  const [il, setIl] = useState(settings.il ?? '');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [year, setYear] = useState<number | null>(vehicle?.year ?? null);
  const [odo, setOdo] = useState(vehicle ? String(vehicle.odo) : '');
  const [sheet, setSheet] = useState<'il' | 'car' | null>(null);
  const [err, setErr] = useState('');

  const car = model ? `${year ? year + ' ' : ''}${model}` : '';

  const finish = () => {
    const km = parseInt(odo, 10);
    if (!name.trim()) return setErr('Adını yaz.');
    if (!il) return setErr('Çalıştığın ili seç.');
    if (!plateOk(plate)) return setErr('Plakayı "34 T 1234" biçiminde gir.');
    if (!model) return setErr('Aracını listeden seç.');
    if (!km) return setErr('Göstergedeki km\'yi gir.');
    save({
      plate,
      model,
      year,
      fuel: vehicle?.fuel ?? '',
      odo: km,
      odoAt: vehicle && vehicle.odo === km ? vehicle.odoAt : Date.now(),
      svcLast: vehicle?.svcLast ?? null,
      svcInt: vehicle?.svcInt ?? 10_000,
      muayene: vehicle?.muayene ?? null,
      sigorta: vehicle?.sigorta ?? null,
    });
    signIn({ name: name.trim(), il, phone });
    router.replace('/');
  };

  const clear = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setErr('');
  };

  return (
    <>
      <Text style={[s.h2, { marginTop: 8 }]}>Son bir adım</Text>
      <Text style={s.sub}>Seni ve aracını tanıyalım. Eksik kalan bilgileri sonra Araç ekranından tamamlayabilirsin.</Text>
      <View style={{ gap: 22, marginTop: 24 }}>
        <Field label="Adın" value={name} onChange={clear(setName)} placeholder="Örn. Miraç" autoCapitalize="words" />
        <PickField label="Çalıştığın il" value={il} placeholder="İl seç" onPress={() => setSheet('il')} />
        <Field
          label="Plakan"
          value={plate}
          onChange={clear((v: string) => setPlate(formatPlate(v)))}
          placeholder="34 T 1234"
          autoCapitalize="characters"
        />
        <PickField label="Aracın" value={car} placeholder="Marka, model ve yıl seç" onPress={() => setSheet('car')} />
        <Field label="Göstergedeki km" value={odo} onChange={clear(setOdo)} digits={7} suffix="KM" placeholder="Örn. 148500" />
      </View>
      {!!err && <Text style={[s.hint, { color: c.red, marginTop: 16 }]}>{err}</Text>}
      <View style={[s.row, { marginTop: 26 }]}>
        <Button label="Uygulamaya başla" icon="check" variant="green" onPress={finish} />
      </View>

      <IlPicker
        visible={sheet === 'il'}
        onClose={() => setSheet(null)}
        onPick={(v) => {
          setIl(v);
          setErr('');
        }}
      />
      <Sheet visible={sheet === 'car'} onClose={() => setSheet(null)}>
        <CarPicker
          onBack={() => setSheet(null)}
          onDone={(m, y) => {
            setModel(m);
            setYear(y);
            setSheet(null);
            setErr('');
          }}
        />
      </Sheet>
    </>
  );
}

function PickField({ label, value, placeholder, onPress }: { label: string; value: string; placeholder: string; onPress: () => void }) {
  const { c } = useTheme();
  const s = styles(c);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Pressable onPress={onPress} style={s.pickBtn} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={[s.pickText, { color: value ? c.text : c.faint }]}>{value || placeholder}</Text>
        <Icon name="right" size={18} color={c.faint} />
      </Pressable>
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    body: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20 },
    grow: { flexGrow: 1, minHeight: 24 },
    row: { flexDirection: 'row' },
    brand: { alignItems: 'center', marginTop: 40 },
    wordmark: { ...fonts.uiHeavy, fontSize: 34, color: c.text, marginTop: 18, letterSpacing: -0.8 },
    tagline: { ...fonts.uiSemi, fontSize: 15, color: c.muted, marginTop: 4 },
    h2: { ...fonts.uiHeavy, fontSize: 30, color: c.text, letterSpacing: -0.6, marginTop: 18 },
    sub: { ...fonts.ui, fontSize: 16.5, color: c.muted, lineHeight: 24, marginTop: 8 },
    label: { ...fonts.uiBold, fontSize: 14, color: c.muted, marginBottom: 8 },
    phone: { flexDirection: 'row', alignItems: 'center', height: 62, borderRadius: 16, borderWidth: 1.5, backgroundColor: c.surface, paddingHorizontal: 16, gap: 12 },
    cc: { ...fonts.numHeavy, fontSize: 20, color: c.muted },
    phoneInput: { flex: 1, ...fonts.numHeavy, fontSize: 22, color: c.text, letterSpacing: 0.5 },
    hint: { ...fonts.ui, fontSize: 14.5, color: c.faint, marginTop: 10 },
    legal: { ...fonts.ui, fontSize: 13, color: c.faint, textAlign: 'center', marginTop: 18, lineHeight: 19 },
    legalLink: { ...fonts.uiBold, color: c.muted, textDecorationLine: 'underline' },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', height: 44 },
    backText: { ...fonts.uiBold, fontSize: 16, color: c.text },
    otp: { flexDirection: 'row', gap: 8, marginTop: 28 },
    box: { flex: 1, height: 62, borderRadius: 14, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    boxText: { ...fonts.numHeavy, fontSize: 26, color: c.text },
    hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
    links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
    link: { ...fonts.uiBold, fontSize: 15, color: c.yellowInk },
    verified: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 20 },
    verifiedText: { ...fonts.uiBold, fontSize: 16 },
    fieldLabel: { ...fonts.uiBold, fontSize: 14, color: c.muted },
    pickBtn: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: c.yellow, paddingVertical: 8 },
    pickText: { flex: 1, ...fonts.uiBold, fontSize: 20 },
    dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 18 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.line },
    dotOn: { width: 22, backgroundColor: c.yellow },
  });
