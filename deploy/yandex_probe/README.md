# Real taksi narxi servisi (Yandex Go, WB Taxi)

Telefon (USB, adb) orqali Yandex Go va WB Taxi ilovalaridan real narxni o'qiydi va HTTP orqali beradi.
Telefon bitta, shuning uchun probe'lar navbat bilan bajariladi (Yandex ~12 s, WB ~15 s).

```
mijoz → taxiscan backend (/taxi/estimate/) → yandex-probe :3060 → adb → telefon
                     ↓
          LiveYandexQuote (ML arxivi, mijozga qaytmaydi)
```

## Server (gpuserver, `deploy` foydalanuvchisi)

```
~/yandex-probe/server.py     # shu papkadagi fayl
~/yandex-probe/.env          # env.example dan, PROBE_API_KEY bilan (chmod 600)
~/yandex-probe/data/*.jsonl  # har bir probe (muvaffaqiyatli va xato) — ML zaxira
```

pm2 jarayoni `yandex-probe`. Server qayta yonganda crontab'dagi `@reboot pm2 resurrect` uni ko'taradi.

```bash
pm2 logs yandex-probe
pm2 restart yandex-probe
python3 ~/yandex-probe/server.py probe --end 41.3111 69.2797   # servissiz bir martalik test
python3 ~/yandex-probe/server.py probe --provider wb --start 41.2995 69.2010 --end 41.3111 69.2797
```

Firewall: `sudo ufw allow 3060/tcp`.

## API

`X-Api-Key` sarlavhasi majburiy.

* `POST /v1/quote` `{"provider":"yandex"|"wb","start_lat","start_lng","end_lat","end_lng"}` →
  `{"ok":true,"cached":false,"from","to","trip_min","arrival","demand","seconds","probed_at",
  "tariffs":[{"tariff":"Start","price":22500,"pickup_min":2,"notes":["Talab yuqori"]}]}`
* `GET /v1/health` → `{"ok","device","awake","locked","busy"}`

`provider` berilmasa `yandex` olinadi. WB javobida `code`: `standard`, `comfort`, `comfort_plus`.

Xato bo'lsa `ok:false`, `error` quyidagilardan biri bo'ladi: `busy`, `phone_locked`, `screen_off`, `no_device`, `timeout`, `unauthorized`, `bad_provider`.
Bunday holatda backend o'sha brend narxini formula bilan hisoblaydi.

## Tariflar ro'yxatini surish (scroll)

Narxlar barqarorlashgach, servis tarif kartalarini surib yangi tariflarni yig'adi. Business topilsa (WB'da Electro) yoki yangi tarif chiqmasa to'xtaydi, ko'pi bilan `MAX_SWIPES`=4 marta.
Yo'nalishni kartalar joylashuvidan o'zi aniqlaydi: Yandex va WB'da gorizontal, Uklon'da vertikal. Uklon'da avval tepaga suriladi, chunki Layt yuqorida yashiringan.

## Uklon xususiyati

`geo:LAT,LON` faqat borish manzilini oladi. Ilova kodida ham marshrut doim [joriy joylashuv, manzil] bo'ladi, koordinata bilan qidiruv ham ishlamaydi.
Shuning uchun probe paytida telefonga test GPS beriladi (`cmd location providers set-test-provider-location`) va keyin olib tashlanadi.
Google joylashuv xizmati Wi-Fi orqali haqiqiy joyni ham qo'shgani uchun bu har doim ham ishlamaydi (taxminan yarmida).
Uklon pickup'i `UK_HOME_FROM` (telefonning haqiqiy joyidagi manzil) bo'lib chiqsa, probe `mock_failed` qaytaradi va noto'g'ri narx bermaydi.
Boshlanish nuqtasi telefondan 300 m ichida bo'lsa, test GPS kerak emas.
Navbatda Uklon Yandex va WB'dan keyin turadi (`PRIORITY`).

## WB Taxi xususiyati

Deeplink: `wb-taxi://ride?from=LAT,LON&to=LAT,LON`. Ilova noldan (cold start) ochilsa, `from` o'rniga telefonning GPS nuqtasini qo'yib yuboradi.
Shuning uchun servis WB'ni yopmaydi. U avval ilova ochiq turganini tekshiradi. Ekranda oldingi tariflar qolgan bo'lsa, BACK bosadi. Keyin deeplink yuboradi.
Buning uchun ekranga bosish (`input keyevent`) ishlashi kerak, ya'ni Xiaomi'da "USB debugging (Security settings)" yoqilgan bo'lsin.
Ilova so'raydigan "physical activity" ruxsati `pm grant ... ACTIVITY_RECOGNITION` bilan berilgan, aks holda dialog chiqib probe to'xtab qoladi.

## Telefon talablari

* Yandex Go va WB Taxi ilovalarida akkaunt bilan kirilgan bo'lishi kerak. WB'da faol buyurtma bo'lmasin.
* Yandex Go: Ilova tili o'zbekcha, inglizcha yoki ruscha bo'lishi mumkin. Parser har bir tarifga kanonik `code` beradi: `start`, `comfort`, `comfort_plus`, `business`, `electro`, `carpool`.
* Ekran qulfi o'chirilgan va "Stay awake" yoqilgan bo'lishi kerak. Telefon zaryadda tursa, ekran o'chmaydi.
* Xiaomi'da: Developer options → **USB debugging (Security settings)** yoqilgan bo'lsin. Busiz ekranni masofadan yoqib bo'lmaydi.

## Backend sozlamalari (`backend/.env`)

```
YANDEX_LIVE_URL=http://<statik-ip>:3060
YANDEX_LIVE_KEY=<PROBE_API_KEY bilan bir xil>
# /taxi/estimate/ javobi Yandex VA WB real narxini shuncha kutadi (nginx 60 s dan kam);
# ulgurmagani fonda keshga tushadi va keyingi 15 s yangilanishda chiqadi
YANDEX_LIVE_WAIT=55
# Probe servisiga HTTP chegarasi (navbat MAX_WAIT + PROBE_TIMEOUT dan katta bo'lsin)
YANDEX_LIVE_HTTP_TIMEOUT=80
# Qaysi brendlar telefondan olinadi
YANDEX_LIVE_PROVIDERS=yandex,wb
# Bir foydalanuvchi + marshrut uchun telefonga faqat bir marta boriladi;
# mobil ilovaning 15 soniyalik yangilanishlari shu natijani oladi
YANDEX_LIVE_REUSE_SECONDS=600
# Telefon xato bersa, shu marshrutga qayta urinmaslik vaqti
YANDEX_LIVE_FAIL_SECONDS=120
```

Tariflar `apps/taxi/live_yandex.py` dagi `PROVIDERS` orqali bog'lanadi:
* Yandex: Start→Start, Comfort→Comfort, Comfort+→Comfort+, Business→Business
* WB: Standard→Start, Comfort→Comfort, Comfort +→Comfort+, Electro→Business
* Uklon: Layt→Start, Standart→Comfort, Komfort→Comfort+, Biznes→Business

`YANDEX_LIVE_STRICT` (yandex, wb) brendlari faqat real narx bilan chiqadi va javob ularni kutadi.
Uklon "yumshoq": real narx tayyor bo'lsa ishlatiladi, bo'lmasa formula bilan chiqadi va javobni ushlab turmaydi.
Har bir o'lchov `LiveYandexQuote` ga (`provider` = yandex | wb) bir marta yoziladi.

Mobil ilovada WB tugmasi `TaxiService.deeplink_template` (migratsiya 0011) orqali WB ilovasini A→B marshrut bilan ochadi.
Yandex va WB narxi FAQAT telefondan olinadi, formula ularga ishlatilmaydi (eski kod `services.py` da kommentda).
Ekranda ko'rinmagan tarif (Business) ro'yxatga chiqmaydi. Real narx olinmasa, brend `unavailable_services` ga tushadi.
`/taxi/estimate/` javobi Yandex va WB kelguncha kutadi (`YANDEX_LIVE_WAIT`, standart 55 s), mobil ilovada shu payt loading turadi.
