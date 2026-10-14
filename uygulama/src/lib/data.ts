// Taksi olarak en çok kullanılan araçlar. Listede olmayan araç serbest yazılabilir.
export const CARS: Record<string, string[]> = {
  Fiat: ['Egea', 'Egea Cross', 'Doblo', 'Linea', 'Tipo', 'Albea', 'Fiorino'],
  Hyundai: ['Accent Blue', 'Accent Era', 'i20', 'i30', 'Elantra', 'Bayon'],
  Toyota: ['Corolla', 'Corolla Hybrid', 'Yaris', 'Auris', 'C-HR'],
  Renault: ['Clio', 'Symbol', 'Taliant', 'Megane', 'Fluence', 'Kangoo'],
  Dacia: ['Logan', 'Sandero', 'Jogger', 'Duster', 'Lodgy'],
  Volkswagen: ['Passat', 'Jetta', 'Caddy', 'Polo', 'Golf'],
  Honda: ['Civic', 'City', 'Jazz'],
  Skoda: ['Octavia', 'Superb', 'Rapid', 'Scala'],
  Ford: ['Focus', 'Fiesta', 'Tourneo Courier', 'Tourneo Connect'],
  Peugeot: ['301', '308', '2008', 'Rifter', 'Partner'],
  Citroën: ['C-Elysée', 'C4', 'Berlingo'],
  Opel: ['Astra', 'Corsa', 'Combo', 'Insignia'],
  Kia: ['Rio', 'Ceed', 'Cerato', 'Stonic'],
  'Mercedes-Benz': ['Vito', 'C-Serisi', 'E-Serisi'],
  Togg: ['T10X', 'T10F'],
};

export const FUELS = ['Benzin', 'Dizel', 'LPG', 'Benzin/LPG', 'Hibrit', 'Elektrik'];

// Plaka kodu sırasıyla (index + 1 = plaka kodu).
export const ILLER = ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'];

export const lower = (s: string) => s.toLocaleLowerCase('tr-TR');

// "34t1234" → "34 T 1234"
export function formatPlate(raw: string) {
  const s = raw.toLocaleUpperCase('tr-TR').replace(/[^0-9A-ZÇĞİÖŞÜ]/g, '');
  const m = s.match(/^(\d{0,2})([A-ZÇĞİÖŞÜ]{0,3})(\d{0,4})/);
  if (!m) return '';
  return [m[1], m[2], m[3]].filter(Boolean).join(' ');
}

// Plaka örneği, şoförün ilinin koduyla (ILLER plaka sırasında; il yoksa Ankara): "06 T 1234".
export const plateExample = (il?: string) => `${String(ILLER.indexOf(il ?? '') + 1 || 6).padStart(2, '0')} T 1234`;

// Plakada sadece Latin harfleri olur; il kodu 01–81.
export const plateOk = (p: string) => /^(0[1-9]|[1-7]\d|8[01]) [A-Z]{1,3} \d{2,4}$/.test(p);
