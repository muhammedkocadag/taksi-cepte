# Taksi Cepte — mağaza metinleri

App Store Connect ve Google Play Console'a yüklenecek metinler. Karakter sınırları ölçüldü.
Yayından önce: destek e-postası ve ekran görüntüleri hazır olmalı; yasal metinler hukukçu kontrolünden geçmeli.

Mağaza formlarına girilecek adresler:
- Gizlilik politikası (App Store + Google Play): https://taksi-cepte-9c4ac.web.app/gizlilik
- Hesap silme (Google Play → Veri güvenliği): https://taksi-cepte-9c4ac.web.app/hesap-silme
- Destek / pazarlama sitesi: https://taksi-cepte-9c4ac.web.app

---

## App Store (iOS)

| Alan | Sınır | Metin |
|---|---|---|
| Ad | 30 | **Taksi Cepte** (11) |
| Alt başlık | 30 | **Taksici gelir-gider defteri** (27) |
| Anahtar kelimeler | 100 | `taksi,şoför,taksici,gelir,gider,kazanç,vardiya,ciro,yakıt,defter,bakım,muayene,pos,nakit,hesap` (94) |
| Birincil kategori | | Finans |
| İkincil kategori | | İş |
| Yaş sınırı | | 4+ |
| Fiyat | | Ücretsiz |

Anahtar kelimelerde addaki kelimeleri tekrar etmeye gerek yok, Apple adı zaten arar. Virgülden sonra boşluk bırakma (karakter boşa gider). Başka markaların adlarını (BiTaksi, Uber vb.) kullanma; Apple reddeder.

### Tanıtım metni (170)
Vardiyanı başlat, her yolculuktan sonra tutarı yaz ve tek dokunuşla kaydet. Nakit, POS ve uygulama kazancın, giderlerin ve net kârın hep cebinde.

### Açıklama (4000)

Taksi Cepte, taksi şoförleri için yapılmış sade bir gelir-gider defteri. Nakit, POS ve uygulama kazancını tek yerde topla; vardiya sonunda ne kadar kazandığını, ne harcadığını ve net kârını anında gör.

TEK DOKUNUŞLA KAYIT
Yolculuk bitti mi? Tutarı yaz, Nakit, POS ya da Uygulama'ya dokun; kaydedildi. Yakıt, yemek ve diğer giderler de aynı kolaylıkla. Kayıt ekranı telefon tuş takımı gibi büyük ve sade; trafik ışığında bile rahatça kullanılır.

VARDİYA TAKİBİ
Vardiyanı başlat, gün boyu cirosunu, giderini ve net kârını canlı izle. Vardiya gece yarısını geçse de bölünmez. Bitirirken yaptığın km'yi gir; km başına ne kazandığını öğren. İstersen vardiya hedefi koy, ilerlemeni çubukta gör.

ANALİZ
Günlük, haftalık ve aylık kazancını grafiklerle gör. Saat başı net kazancını, ortalama yolculuk tutarını ve km başı kazancını öğren. En yoğun saatlerini keşfet. Gelirinin ve giderinin nereden geldiğini dağılım grafikleriyle anla. Önceki döneme göre ne kadar arttığını ya da azaldığını hemen gör.

ARAÇ VE BAKIM
Göstergedeki km'yi takip et; vardiya sonunda girdiğin km'ler kendiliğinden eklenir. Genel bakıma kaç km, muayeneye ve trafik sigortasına kaç gün kaldığını tek bakışta gör. Muayene ve sigorta bitmeden önce hatırlatma al.

ETKİNLİKLER
Şehrindeki maçları, konserleri ve fuarları başlangıç ve bitiş saatleriyle gör; çıkışta doğru yerde ol. Beklenen yoğunluğu öğren, ilgilendiğin etkinlik için hatırlatma kur. (Şimdilik Ankara için.)

SENİN İÇİN TASARLANDI
• Gece gündüz rahat okunan açık ve koyu tema
• Büyük rakamlar, sade ekranlar
• İnternet olmasa da çalışır
• Telefon numaranla, şifresiz giriş
• Kayıtların hesabına bağlı; telefonunu değiştirsen de kaybolmaz

Taksi Cepte ücretsizdir. Sorun ya da önerin için: [destek e-postası]

### Bu sürümde yenilikler (ilk sürüm)
Taksi Cepte'nin ilk sürümü. Kazancını tek dokunuşla kaydet, vardiyanı takip et, aracının bakımını unutma.

---

## Google Play (Android)

| Alan | Sınır | Metin |
|---|---|---|
| Uygulama adı | 30 | **Taksi Cepte: Taksici Defteri** (28) |
| Kısa açıklama | 80 | **Nakit, POS ve uygulama kazancını tek dokunuşla kaydet, vardiyanı takip et.** |
| Tam açıklama | 4000 | App Store açıklamasının aynısı |
| Kategori | | Finans |
| İçerik derecelendirmesi | | Herkes (anket doldurulacak) |

Google Play'de anahtar kelime alanı yok; arama, ad + kısa açıklama + tam açıklamadan yapılır. Bu yüzden açıklamada "taksi", "şoför", "gelir", "gider", "kazanç", "vardiya" kelimeleri doğal şekilde geçiyor.

---

## Gizlilik beyanları (iki mağaza da soruyor)

Uygulamanın topladığı veriler (Aşama 2 sonrası, Firebase ile):

| Veri | Ne için | Kişiyle ilişkili mi | Takip (reklam) |
|---|---|---|---|
| Telefon numarası | Giriş | Evet | Hayır |
| Ad | Uygulama içinde gösterim | Evet | Hayır |
| Gelir-gider kayıtları, vardiyalar (finansal bilgi) | Uygulamanın işlevi, buluta yedekleme | Evet | Hayır |
| Araç bilgileri (plaka, km, bakım tarihleri) | Uygulamanın işlevi | Evet | Hayır |
| Çalıştığı il | Etkinlikleri gösterme | Evet | Hayır |
| Kullanıcı kimliği (Firebase) | Hesabı tanıma | Evet | Hayır |
| Cihaz bilgisi (iOS/Android, model, sistem ve uygulama sürümü), kayıt ve son giriş zamanı | Destek ve uygulamanın işletilmesi (yönetim paneli) | Evet | Hayır |

Konum, kişiler, fotoğraf, reklam kimliği toplanmıyor. Yönetim panelinde sadece uygulama sahibi ad, telefon, il, araç ve cihaz bilgisini görür; gelir-gider kayıtları panelde yoktur (Firestore kurallarıyla engelli). App Store beyanında cihaz bilgisi "Diagnostics → Other Diagnostic Data" (kişiyle ilişkili, izleme yok) olarak işaretlenir; yayından önce Apple'ın güncel listesiyle kontrol et.

Aşama 2'de çökme raporu (Crashlytics vb.) ya da analitik eklenirse bu tablo güncellenmeli.

---

## Ekran görüntüleri planı

Gerekli boyutlar: iPhone 6,9" (1320×2868 veya 1290×2796), Android telefon (en az 1080 genişlik). İlk 3 görsel en önemlisi; arama sonuçlarında görünenler onlar.

| # | Ekran | Başlık (görselin üstünde) |
|---|---|---|
| 1 | Kayıt ekranı (tutar girilmiş, Nakit'e basılıyor) | Yolculuk bitti, tek dokunuşla kaydet |
| 2 | Ana sayfa (dolu vardiya, hedef çubuğu) | Vardiyanın cirosu, gideri, net kârı |
| 3 | Analiz (haftalık grafik + halka grafik) | Ne zaman, ne kadar kazandığını gör |
| 4 | Araç ve bakım | Muayene, sigorta, bakım: hiçbirini unutma |
| 5 | Etkinlikler | Maç, konser, fuar: çıkışta orada ol |
| 6 | Koyu ve açık tema yan yana | Gece de gündüz de rahat |

Görsellerdeki veriler gerçekçi ama uydurma olmalı (gerçek bir şoförün kayıtları değil). Arka plan uygulamanın lacivert-siyah degradesi, başlıklar beyaz, vurgu taksi sarısı.
