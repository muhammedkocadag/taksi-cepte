// Taksi Cepte yönetim paneli. Firebase Hosting.de /panel adresinde yayınlanır (firebase/ içinde `npm run deploy:panel`).
// Yetki SUNUCUDA: firestore.rules → isAdmin(). Bu sayfa sadece okur; kazanç ve vardiya kayıtlarına kurallar izin vermez.
// localhost'ta emülatöre bağlanır (`npm run panel:emulator`, sahte veri: ornek-veri.mjs).
// Şoförlerin yazdığı metinler sayfaya sadece textContent ile basılır (innerHTML yok).

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  GoogleAuthProvider, connectAuthEmulator, getAuth, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  collection, collectionGroup, connectFirestoreEmulator, getDocs, getFirestore,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import { firebaseConfig } from './config.js';

const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const app = initializeApp(local ? { apiKey: 'demo', authDomain: location.host, projectId: 'demo-taksi-cepte' } : firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
if (local) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
}

const $ = (id) => document.getElementById(id);
const show = (id) => ['login', 'denied', 'app'].forEach((x) => ($(x).hidden = x !== id));

$('in').onclick = async () => {
  $('loginErr').textContent = '';
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') $('loginErr').textContent = `Giriş olmadı: ${e.code ?? e.message}`;
  }
};
$('out').onclick = () => signOut(auth);
// Sadece emülatör: Google penceresi olmadan, yazılan e-postayla sahte Google kimliği (emülatör imzasız kimliği kabul eder).
if (local) {
  $('dev').hidden = false;
  $('devIn').onclick = () =>
    signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: $('devMail').value, email: $('devMail').value, email_verified: true })))
      .catch((e) => ($('loginErr').textContent = `Giriş olmadı: ${e.code ?? e.message}`));
}
$('reload').onclick = () => load();
$('q').oninput = () => render();

onAuthStateChanged(auth, (user) => {
  $('who').textContent = user?.email ?? '';
  $('out').hidden = !user;
  if (!user) return show('login');
  load();
});

let people = [];

async function load() {
  $('reload').disabled = true;
  try {
    const [acc, users, cars] = await Promise.all([
      getDocs(collection(db, 'accounts')),
      getDocs(collection(db, 'users')),
      getDocs(collectionGroup(db, 'vehicle')),
    ]);
    const byId = new Map();
    const get = (id) => byId.get(id) ?? byId.set(id, { id }).get(id);
    acc.forEach((d) => Object.assign(get(d.id), { account: d.data() }));
    users.forEach((d) => Object.assign(get(d.id), { profile: d.data() }));
    cars.forEach((d) => Object.assign(get(d.ref.parent.parent.id), { car: d.data() }));
    people = [...byId.values()].sort((a, b) => (b.account?.created_at ?? 0) - (a.account?.created_at ?? 0));
    show('app');
    render();
  } catch (e) {
    if (e.code === 'permission-denied') {
      $('deniedText').textContent = `${auth.currentUser?.email ?? 'Bu hesap'} yönetici değil. Doğru Google hesabıyla gir.`;
      show('denied');
    } else {
      show('app');
      $('note').textContent = `Yüklenemedi: ${e.code ?? e.message}`;
    }
  } finally {
    $('reload').disabled = false;
  }
}

// ---- biçimler ----
const fmtPhone = (p = '') => {
  const d = p.replace(/\D/g, '');
  return d.length === 12 && d.startsWith('90') ? `+90 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : p;
};
const fmtDate = (ms) =>
  ms ? new Date(ms).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';
const ago = (ms) => {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 60) return m <= 1 ? 'şimdi' : `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} saat önce`;
  const g = Math.round(h / 24);
  return g < 30 ? `${g} gün önce` : `${Math.round(g / 30)} ay önce`;
};
const carText = (c) => (c ? [c.year, c.model].filter(Boolean).join(' ') : '');
const deviceText = (a) => (a ? [a.model, a.os && `${a.platform === 'ios' ? 'iOS' : 'Android'} ${a.os}`].filter(Boolean).join(' · ') : '');

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const k of kids) if (k != null && k !== '') e.append(k);
  return e;
}
const cell = (main, sub, cls) => el('td', { className: cls ?? '' }, main, sub ? el('div', { className: 'sub', textContent: sub }) : null);

function row(p) {
  const a = p.account;
  const tr = el('tr');
  const add = (label, main, sub, cls) => {
    const td = cell(main, sub, cls);
    if (label) td.setAttribute('data-l', label);
    tr.append(td);
  };
  add(null, p.profile?.name || '(adsız)', null, 'name');
  // Telefonla girenlerde numara, Apple ile girenlerde e-posta (gizli e-posta da olabilir: ...@privaterelay.appleid.com).
  add('Telefon / e-posta', a?.phone ? fmtPhone(a.phone) : a?.email || '–', a?.provider === 'apple' ? 'Apple ile giriş' : '', 'nowrap');
  add('İl', p.profile?.il || '–');
  add('Araç', carText(p.car) || '–', p.car?.fuel || '');
  const dev = el('span');
  if (a) dev.append(el('span', { className: `tag ${a.platform}`, textContent: a.platform === 'ios' ? 'iPhone' : 'Android' }), ' ');
  dev.append(deviceText(a) || '–');
  add('Cihaz', dev, a?.app ? `Uygulama ${a.app}` : '');
  add('Kayıt', fmtDate(a?.created_at));
  add('Son giriş', ago(a?.last_seen) || '–', a?.last_seen ? fmtDate(a.last_seen) : '');
  return tr;
}

function stats() {
  const DAY = 86_400_000;
  const now = Date.now();
  const today = new Date().setHours(0, 0, 0, 0);
  const acc = people.map((p) => p.account).filter(Boolean);
  const items = [
    [people.length, 'Toplam kullanıcı'],
    [acc.filter((a) => a.platform === 'ios').length, 'iPhone'],
    [acc.filter((a) => a.platform === 'android').length, 'Android'],
    [acc.filter((a) => a.created_at >= today).length, 'Bugün kaydolan'],
    [acc.filter((a) => a.created_at >= now - 7 * DAY).length, 'Son 7 günde kaydolan'],
    [acc.filter((a) => a.last_seen >= now - 7 * DAY).length, 'Son 7 günde aktif'],
  ];
  $('stats').replaceChildren(...items.map(([n, l]) => el('div', { className: 'stat' }, el('b', { textContent: String(n) }), el('small', { textContent: l }))));
}

function render() {
  stats();
  const q = $('q').value.trim().toLocaleLowerCase('tr');
  const list = q
    ? people.filter((p) =>
        [p.profile?.name, p.profile?.il, p.account?.phone, fmtPhone(p.account?.phone), p.account?.email, carText(p.car), deviceText(p.account)]
          .join(' ')
          .toLocaleLowerCase('tr')
          .includes(q),
      )
    : people;
  $('rows').replaceChildren(...(list.length ? list.map(row) : [el('tr', {}, el('td', { colSpan: 7, className: 'empty', textContent: q ? 'Eşleşen kullanıcı yok.' : 'Henüz kullanıcı yok.' }))]));
  $('note').textContent = `${list.length} kullanıcı gösteriliyor. Kazanç ve vardiya kayıtları bu panelde yoktur.`;
}
