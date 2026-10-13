// Uygulama adı henüz kesin değil: ekranlarda görünen ad yalnızca buradan gelir
// (ana ekrandaki ad ise app.json → expo.name).
export const APP_NAME = ['Taksi', 'Cepte'] as const;
export const TAGLINE = 'Taksicinin dijital cüzdanı';

// Yasal belgeler (firebase/web/, Firebase Hosting). Mağaza formlarına da bu adresler girilir.
const SITE = 'https://taksi-cepte-9c4ac.web.app';
export const LEGAL = {
  kvkk: `${SITE}/kvkk`,
  gizlilik: `${SITE}/gizlilik`,
  kosullar: `${SITE}/kosullar`,
  hesapSilme: `${SITE}/hesap-silme`,
};
