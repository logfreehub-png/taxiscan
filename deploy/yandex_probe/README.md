# Yandex Go real narx servisi

Telefon (USB, adb) orqali Yandex Go ilovasidan real narxni o'qiydi va HTTP orqali beradi.

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
```

Firewall: `sudo ufw allow 3060/tcp`.

## API

`X-Api-Key` sarlavhasi majburiy.

* `POST /v1/quote` `{"start_lat","start_lng","end_lat","end_lng"}` →
  `{"ok":true,"cached":false,"from","to","trip_min","arrival","demand","seconds","probed_at",
  "tariffs":[{"tariff":"Start","price":22500,"pickup_min":2,"notes":["Talab yuqori"]}]}`
* `GET /v1/health` → `{"ok","device","awake","locked","busy"}`

Xato bo'lsa `ok:false`, `error` quyidagilardan biri bo'ladi: `busy`, `phone_locked`, `screen_off`, `no_device`, `timeout`, `unauthorized`.
Bunday holatda backend Yandex narxini formula bilan hisoblaydi.

## Telefon talablari

* Yandex Go ilovasida akkaunt bilan kirilgan bo'lishi kerak. Ilova tili o'zbekcha, inglizcha yoki ruscha bo'lishi mumkin. Parser har bir tarifga kanonik `code` beradi: `start`, `comfort`, `comfort_plus`, `business`, `electro`, `carpool`.
* Ekran qulfi o'chirilgan va "Stay awake" yoqilgan bo'lishi kerak. Telefon zaryadda tursa, ekran o'chmaydi.
* Xiaomi'da: Developer options → **USB debugging (Security settings)** yoqilgan bo'lsin. Busiz ekranni masofadan yoqib bo'lmaydi.

## Backend sozlamalari (`backend/.env`)

```
YANDEX_LIVE_URL=http://<statik-ip>:3060
YANDEX_LIVE_KEY=<PROBE_API_KEY bilan bir xil>
YANDEX_LIVE_TIMEOUT=35
# Bir foydalanuvchi + marshrut uchun telefonga faqat bir marta boriladi;
# mobil ilovaning 15 soniyalik yangilanishlari shu natijani oladi
YANDEX_LIVE_REUSE_SECONDS=600
# Telefon xato bersa, shu marshrutga qayta urinmaslik vaqti
YANDEX_LIVE_FAIL_SECONDS=120
```

Tariflar `apps/taxi/live_yandex.py` dagi `TIER_BY_TARIFF` orqali bog'lanadi:
Start→econom, Komfort→comfort, Komfort+→comfort_plus.
Ekranda ko'rinmagan tariflar (Business) `live_est` deb belgilanadi. Ularning narxi formula × (real/formula nisbati) bo'ladi.
