# TaxiNarx — Mobil ilova (React Native + Expo)

Toshkentdagi taksilarni taqqoslash platformasining **Android va iOS** uchun mobil
versiyasi. Web (Next.js) frontend bilan bir xil backend (Django REST + JWT) ga
ulanadi va bir xil dizayn tilini (brand sariq `#FFCC00`, qora `ink`) ishlatadi.

```
mobile/
├─ app/                      # Ekranlar (Expo Router — fayl asosida navigatsiya)
│  ├─ _layout.tsx            # Root: ThemeProvider + auth bootstrap + Stack
│  ├─ index.tsx              # Kirish nuqtasi — auth holatiga qarab yo'naltiradi
│  ├─ (auth)/
│  │  ├─ _layout.tsx
│  │  ├─ login.tsx
│  │  └─ register.tsx
│  └─ (tabs)/                # Asosiy ilova — pastki tab navigatsiya
│     ├─ _layout.tsx         # Rolga moslashadigan tablar
│     ├─ index.tsx           # Asosiy (yo'lovchi yoki haydovchi)
│     ├─ stats.tsx           # Statistika (faqat haydovchi)
│     ├─ billing.tsx         # Obuna + kartalar
│     └─ profile.tsx         # Profil + mavzu + chiqish
├─ src/
│  ├─ theme/                 # Ranglar, light/dark mavzu (Context)
│  ├─ lib/
│  │  ├─ api/                # client (fetch+JWT), types, config, geocoding
│  │  └─ format.ts           # so'm / sana formatlash
│  ├─ store/auth.ts          # Zustand auth store (AsyncStorage persist)
│  ├─ components/            # PriceList, TierPicker, LivePriceBar, AddressInput...
│  │  └─ ui/                 # Card, Button, Badge, Field, Screen, Header...
│  └─ screens/               # PassengerHome, DriverHome, Stats, Billing, Profile
├─ app.json
├─ package.json
└─ tsconfig.json
```

## Texnologiyalar
- **Expo SDK 54** + **React Native 0.81** + **React 19** + **TypeScript**
- **expo-router v6** — fayl asosida navigatsiya (web App Router uslubida)
- **Zustand** + **AsyncStorage** — holat va sessiya saqlash
- **expo-location** — joriy joylashuv
- **@expo/vector-icons** (Ionicons) — ikonkalar
- Light / Dark / Avto mavzu

## Ishga tushirish

### 1) Backendni ishga tushiring
`taxsi_narxlar/backend` papkasida (asosiy README ga qarang):
```powershell
cd ../backend
python manage.py runserver 0.0.0.0:8001
```
> `0.0.0.0` — telefon LAN orqali ulanishi uchun muhim.

### 2) Mobil ilovani ishga tushiring
```powershell
cd mobile
npm install
npx expo start
```
So'ng:
- **i** — iOS simulyator (faqat macOS)
- **a** — Android emulyator
- yoki telefoningizda **Expo Go** ilovasi orqali QR kodni skanerlang

### 3) Backend manzilini sozlash
`src/lib/api/config.ts` faylida:
- **iOS simulyator** — avtomatik `127.0.0.1`
- **Android emulyator** — avtomatik `10.0.2.2`
- **Real telefon** — `LAN_IP` ga kompyuteringiz IP sini yozing (masalan `192.168.1.50`)
  va `USE_LAN = true` qiling. Telefon va kompyuter bir Wi-Fi da bo'lsin.

Kompyuter IP sini bilish: `ipconfig` (Windows) → "IPv4 Address".

## Sinov hisobi
```
Telefon: +998900000000
Parol:   admin12345
```

## Asosiy ekranlar
- **Yo'lovchi** — qayerdan/qayerga manzil, tarif tanlash, real-time narxlar,
  eng arzon variant, "hozirgi joydan chaqirsam qancha?"
- **Haydovchi** — zonalar bo'yicha narxlar, qaysi xizmat ko'p to'laydi, statistika
- **Obuna** — $1/oy premium, UzCard/Humo/Visa karta qo'shish, tranzaksiyalar
- **Profil** — light/dark mavzu, server sozlamasi, chiqish

> Eslatma: dizayn barcha qurilma o'lchamlarida bir xil — `SafeAreaView` (notch/tirnoq)
> va standart paddinglar hisobga olingan.
