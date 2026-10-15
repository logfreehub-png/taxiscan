"""Tarif formulasi asosida narxni hisoblovchi provayder.

Real API yo'q paytda yoki backup sifatida ishlatiladi.
Formula: max(min_fare, base_fare + km*per_km + min*per_min) * surge

Masofa va vaqt OSRM (real avtomobil yo'li) orqali olinadi, OSRM ishlamasa
haversine + tirbandlik koeffitsientiga fallback qiladi.
"""
import math
import hashlib
from datetime import datetime
from zoneinfo import ZoneInfo
from .base import BaseProvider, EstimateResult

TASHKENT_TZ = ZoneInfo("Asia/Tashkent")


def tashkent_now() -> datetime:
    """Toshkent lokal vaqti — server TZ (prod'da UTC) dan MUSTAQIL.

    datetime.now() server tizim vaqtini oladi: UTC serverda Toshkentdan 5 soat
    orqada. Natijada Toshkent tunida (22:40–00:20) server 17:40–19:20 deb bilib,
    kechki pik koeffitsientlarini (tirbandlik 1.5–1.7 + surge) qo'llab yuborardi
    — narx tunda ~2.2 barobar oshib ketardi. Barcha soatga bog'liq hisoblar
    faqat shu funksiyadan foydalanishi shart.
    """
    return datetime.now(TASHKENT_TZ)


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    """Ikki nuqta orasidagi havodan masofa (km)."""
    R = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def estimate_duration_min(distance_km: float, hour: int = None) -> float:
    """Free-flow (tirbandliksiz) yo'l vaqtini baholash — faqat OSRM ishlamaganda.

    Bu yerda soatga bog'liq sekinlashuv QO'LLANMAYDI: tirbandlik vaqti alohida
    `traffic_adjusted_duration()` orqali (real pik koeffitsientlari bilan)
    qo'shiladi. Free-flow uchun Toshkentning bo'sh yo'ldagi o'rtacha tezligi.
    """
    avg_speed = 32  # km/soat — Toshkent bo'sh yo'l (free-flow) o'rtacha tezligi
    return (distance_km / avg_speed) * 60


# === Toshkent pik vaqtlari =================================================
# Manba: Yandex Go rasmiy tarif sahifasi + Toshkent tirbandlik real kuzatuvi.
#   Ertalabki pik:  07:00–10:00 (eng zich 08:00–09:00) — ishga qatnov
#   Tushlik:        12:00–14:00 — yengilroq pik
#   Kechki pik:     17:00–20:00 (eng zich 18:00–19:00) — ishdan qaytish
#   Juma kechqurun  — ayniqsa tirband (1.5×+)
# Narxga ta'sir IKKI mustaqil real omil orqali hisoblanadi:
#   1) traffic_factor — yo'l VAQTI free-flow'dan necha barobar uzun (per_min ↑)
#   2) demand surge   — TALAB koeffitsienti (umumiy narx ×)
# Ikkalasi ham real hodisa, shuning uchun "ikki marta jarima" emas.


def _traffic_factor(hour: int, weekday: int = 0) -> float:
    """OSRM free-flow vaqtini real tirbandlik vaqtiga yaqinlashtiruvchi koeff.

    OSRM tirbandlikni hisobga olmaydi. Toshkentda pik soatlarda real yo'l vaqti
    free-flow'dan 1.3–1.85 barobar uzun bo'ladi — bu per-minute narxni oshiradi.
    weekday: 0=Dushanba ... 4=Juma, 5=Shanba, 6=Yakshanba.
    """
    if hour == 18:                 t = 1.70   # eng zich kechki pik
    elif hour == 19:               t = 1.60
    elif hour == 17:               t = 1.50
    elif hour == 8:                t = 1.55   # eng zich ertalabki pik
    elif hour == 9:                t = 1.45
    elif hour == 20:               t = 1.35
    elif hour in (7, 16):          t = 1.30
    elif hour in (10, 21):         t = 1.20
    elif hour in (12, 13, 14):     t = 1.18   # tushlik
    elif hour in (11, 15, 22):     t = 1.10
    elif hour in (0, 1, 2, 3, 4, 5):  t = 1.00  # tun — yo'l bo'sh
    else:                          t = 1.08

    if weekday == 4 and hour in (16, 17, 18, 19, 20):
        t += 0.15                  # juma kechqurun — qo'shimcha tirbandlik
    if weekday in (5, 6):          # dam olish kunlari kamroq tirbandlik
        t = 1.0 + (t - 1.0) * 0.6
    return round(t, 2)


def traffic_adjusted_duration(free_flow_min: float, when: datetime = None) -> float:
    """Free-flow yo'l vaqtini joriy soatdagi real tirbandlik vaqtiga aylantiradi."""
    if when is None:
        when = tashkent_now()
    return round(free_flow_min * _traffic_factor(when.hour, when.weekday()), 1)


def _base_hour_surge(hour: int, weekday: int = 0) -> float:
    """Talab (demand) surge — molniya/коэффициент спроса taqlidi.

    Bu — shu soatdagi O'RTACHA talab ko'tarilishi (yumshoq). Pik vaqtdagi
    katta narx asosan TIRBANDLIK (traffic_factor → vaqt uzayadi) orqali keladi,
    shuning uchun bu yerda surge yumshoq — aks holda pik IKKI marta jarima oladi
    (surge + tirbandlik) va narx haqiqiy taksidan oshib ketadi.
    Xizmatlar orasidagi farq esa _service_surge orqali (±15%).
    """
    # ——— TALAB YUQORI (narx OSHADI) — Toshkent real qatnov pattern'i ———
    # Ertalabki pik (ishga): ~7:30–10. Tushlik (obed): 12–14. Kechki (ishdan qaytish): 17–20.
    if hour == 8:                    s = 1.12   # ertalabki pik — eng zich
    elif hour == 9:                  s = 1.10
    elif hour == 7:                  s = 1.05   # ertalabki pik boshlanishi (~7:30)
    elif hour == 10:                 s = 1.04   # ertalabki pik tugashi (~10 gacha)
    elif hour == 18:                 s = 1.14   # kechki ishdan qaytish — eng zich
    elif hour == 19:                 s = 1.13
    elif hour == 17:                 s = 1.08   # kechki pik boshlanishi
    elif hour == 20:                 s = 1.06   # kechki pik tugashi
    elif hour == 13:                 s = 1.05   # tushlik (obed) — talab oshadi
    elif hour == 12:                 s = 1.04
    elif hour == 14:                 s = 1.02
    # ——— QOLGAN PAYT (narx 1.0 dan PASTGA tushadi) ———
    elif hour == 16:                 s = 1.00   # kechki pik oldidan — neytral
    elif hour in (11, 15):           s = 0.96   # pik oralig'i — sokin
    elif hour == 21:                 s = 0.97   # kechki pikdan keyin
    elif hour in (6, 22):            s = 0.94   # tong / kech kechqurun
    elif hour in (0, 1, 23):         s = 0.92   # tun — sokin
    elif hour in (2, 3, 4, 5):       s = 0.90   # chuqur tun — eng sokin, narx tushgan
    else:                            s = 0.96

    if weekday == 4 and hour in (17, 18, 19, 20):
        s += 0.05                    # juma kechqurun — talab yanada yuqori
    if weekday in (5, 6) and hour in (7, 8, 9, 10):
        s = max(0.92, s - 0.10)      # dam olish kuni ertalab — ishga qatnov yo'q, narx past
    return round(s, 3)


def _weekly_factor(when: datetime = None) -> float:
    """Haftadan-haftaga sekin o'zgaradigan MAVSUMIY koeff (±~6%).

    Real hodisa: yoqilg'i narxi, mavsumiy talab (qish — sovuq, yoz — jazirama),
    bayram haftalari narxni biroz ko'taradi yoki tushiradi. MUHIM: bu koeff
    BARCHA brendga BIR XIL qo'llanadi — ya'ni brendlar tartibini O'ZGARTIRMAYDI
    (kim arzon/qimmat ekani saqlanadi), faqat umumiy daraja hafta sayin suriladi.
    Shu sabab bu "aldov" emas — real bozor darajasi tebranishi.

    Tarkibi:
      * silliq yillik to'lqin (52 haftalik davr) — mavsumiy ko'tarilish/tushish
      * har haftaga barqaror kichik deterministik siljish (hafta ichida o'zgarmas)
    """
    if when is None:
        when = tashkent_now()
    iso_year, iso_week, _ = when.isocalendar()
    # Qish (dekabr–fevral) talab yuqori, bahor/kuz mo''tadil — silliq yillik to'lqin.
    # Fazani shunday tanlaymizki, ~1-hafta (yanvar) eng yuqori bo'lsin.
    seasonal = math.cos(2 * math.pi * (iso_week - 1) / 52.0)  # +1 (qish) .. -1 (yoz)
    # Har haftaga barqaror, lekin oldindan aytib bo'lmaydigan kichik siljish
    h = int(hashlib.md5(f"week:{iso_year}-{iso_week}".encode()).hexdigest()[:8], 16)
    wk_noise = (h / 0xFFFFFFFF) * 2 - 1  # -1..1
    factor = 1.0 + seasonal * 0.04 + wk_noise * 0.02  # ±~6%
    return round(factor, 3)


def _minute_jitter(service_code: str, now: datetime = None) -> float:
    """Har minutda smooth o'zgaradigan deterministik fluctuation.

    Smooth random walk: bir minut +- 3% atrofida o'zgarishi mumkin.
    Bir xil minut ichida (60 soniya) bir xil natija qaytaradi.
    Har service uchun fluctuation boshqa-boshqa — real bozorni taqlid qiladi.
    """
    if now is None:
        now = tashkent_now()
    # Minutga round, soniyalar e'tibordan tashqari
    minute_bucket = now.strftime("%Y%m%d%H%M")
    # Bir oldingi minut va keyingi minutni ham hisobga olib smooth bo'lsin
    seed = f"{service_code}:{minute_bucket}"
    h = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
    # 0..1 ga normalize, keyin -0.03..+0.03 ga map
    norm = (h / 0xFFFFFFFF) * 2 - 1  # -1..1
    return 1.0 + norm * 0.02  # +-2% jitter (har daqiqa kichik tebranish)


def _service_demand_mult(service_code: str, base_hour: float, now: datetime = None) -> float:
    """Har brendning MUSTAQIL real-time surge ko'paytuvchisi — narx SPREAD'ini beradi.

    Real Toshkentda bir vaqtning o'zida turli ilovalar narxi KO'P farq qiladi
    (kuzatilgan misol: WB ~16 100, Yandex ~17 500, Uklon ~23 000 — bir xil yo'l, bir
    payt). Sabab: har kompaniyaning haydovchi ta'minoti/talabi har xil, har biri o'z
    "molniya" surge'ini mustaqil qo'yadi. MUHIM xususiyat — bu farq PIK soatda
    KENGAYADI (mashina yetishmay, surge brendma-brend turlicha keskin oshadi), sokin
    paytda esa TORAYADI (narxlar bir-biriga yaqin).

    Modeli: har brend o'z fazasi+davrida silliq tebranadi (deterministik, jumpsiz),
    AMMO tebranish amplitudasi pik intensivligiga bog'liq:
      * sokin payt (base≈0.90): amplituda ~±4% → narxlar yaqin
      * eng zich pik (base≈1.14): amplituda ~±20% → keng, realistik spread
    Natijada kim arzon/qimmat ekani vaqt o'tib TABIIY o'zgaradi — hech bir brend doim
    eng arzon yoki doim eng qimmat emas, lekin har payt aniq farq ko'rinadi (ishonchli).
    """
    if now is None:
        now = tashkent_now()
    brand = (service_code or "").split("__")[0]
    # Brend bo'yicha barqaror faza (0..2π) va davr (140..220 daqiqa)
    h = int(hashlib.md5(f"sd:{brand}".encode()).hexdigest()[:8], 16)
    phase = (h % 10000) / 10000 * 2 * math.pi
    period_min = 140.0 + (h % 80)   # 140..220 daqiqa — har brendda turlicha
    minutes = now.hour * 60 + now.minute + now.second / 60.0
    wave = math.sin(2 * math.pi * minutes / period_min + phase)  # -1..1
    # Amplituda pik intensivligiga bog'liq: sokin ~0.04, eng zich pik ~0.20
    peak_intensity = max(0.0, base_hour - 0.95)     # 0 .. ~0.19
    amp = 0.04 + peak_intensity * 0.85
    return 1.0 + wave * amp


# === WB Taxi tungi tarifi ==================================================
# Real kuzatuv: WB Taxi 22:40 dan 00:20 gacha narxni 2.2 barobar oshiradi
# (brendning o'z tungi tarifi). Bu BOSHQA brendlarga tegishli EMAS — ular
# tunda odatdagi past talab koeffitsientida qoladi.
WB_NIGHT_BRAND = "wb_taxi"
WB_NIGHT_MULT = 2.2
_WB_NIGHT_START_MIN = 22 * 60 + 40   # 22:40
_WB_NIGHT_END_MIN = 20               # 00:20


def brand_night_mult(service_code: str, when: datetime = None) -> float:
    """Brendga xos tungi tarif ko'paytuvchisi (Toshkent vaqti bo'yicha).

    Hozircha faqat WB Taxi: 22:40–00:20 oralig'ida 2.2x. Boshqa brendlar 1.0.
    """
    brand = (service_code or "").split("__")[0]
    if brand != WB_NIGHT_BRAND:
        return 1.0
    if when is None:
        when = tashkent_now()
    m = when.hour * 60 + when.minute
    if m >= _WB_NIGHT_START_MIN or m < _WB_NIGHT_END_MIN:
        return WB_NIGHT_MULT
    return 1.0


def region_level(region_id) -> float:
    """Tuman bo'yicha UMUMIY narx darajasi (barcha brendga BIR XIL) — ~0.95..1.06.

    Real hodisa: markaziy/biznes tumanlarda (talab va tirbandlik yuqori) narx sal
    yuqoriroq, chekka tumanlarda pastroq. MUHIM: BARCHA brendga TENG qo'llanadi —
    brendlar tartibini O'ZGARTIRMAYDI (bu "aldov" emas, faqat hududiy daraja).
    Deterministik: bir tuman doim bir xil darajada (statistika tarixi barqaror qoladi).
    """
    if not region_id:
        return 1.0
    h = int(hashlib.md5(f"reglvl:{region_id}".encode()).hexdigest()[:8], 16)
    u = h / 0xFFFFFFFF  # 0..1
    return round(0.95 + u * 0.11, 4)  # 0.95 .. 1.06


def region_factor(service_code: str, region_id) -> float:
    """Rayon bo'yicha narx ko'paytuvchisi (±3%) — deterministik.

    Bir brend bir rayonda arzonroq, boshqasida qimmatroq bo'lishi mumkin (real
    bozorda har hudud talabi/mashina zichligi har xil). Amplituda kichik (±3%):
    premium brendlar (yaqin narxli) rayonma-rayon tartibini almashtiradi, lekin
    Fasten'ning katta gap'i saqlangani uchun u baribir eng arzon qoladi.
    """
    if not region_id:
        return 1.0
    brand = (service_code or "").split("__")[0]
    h = int(hashlib.md5(f"region:{brand}:{region_id}".encode()).hexdigest()[:8], 16)
    u = h / 0xFFFFFFFF  # 0..1
    return round(1.0 + (2 * u - 1) * 0.03, 4)  # 0.97 .. 1.03


def current_surge(hour: int = None, service_code: str = "default",
                  weekday: int = None, when: datetime = None) -> float:
    """Real-time talab surge — brendma-brend FARQ qiladi (ishonchli spread).

    Omillar:
      1) soat/hafta kuni — pik vaqt egri chizig'i (_base_hour_surge), BARCHA brendga teng
      2) ob-havo — yomg'ir/qor/jazirama issiq (barcha brendga teng)
      3) hafta/mavsum darajasi (_weekly_factor) — barcha brendga teng
      4) har brendning MUSTAQIL surge ko'paytuvchisi (_service_demand_mult) — bu narx
         SPREAD'ini beradi: pik paytda brendlar narxi keng tarqaladi (kimdir aniq arzon,
         kimdir qimmat — real ilovalardagidek), sokin paytda yaqinlashadi. Kim arzon
         ekani vaqt o'tib o'zgaradi (hech bir brend doim eng arzon/qimmat emas).

    `when` — qaysi onga hisoblash (statistika o'tgan soatlar uchun beradi); berilmasa hozir.
    """
    now = when or tashkent_now()
    if hour is None:
        hour = now.hour
    if weekday is None:
        weekday = now.weekday()
    base = _base_hour_surge(hour, weekday)

    weather_boost = 0.0
    try:
        from ..weather import weather_surge
        weather_boost, _, _ = weather_surge()
    except Exception:
        weather_boost = 0.0

    weekly = _weekly_factor(now)              # mavsumiy daraja (barcha brendga bir xil)
    demand = _service_demand_mult(service_code, base, now)  # per-brend spread
    surge = (base + weather_boost) * weekly * demand
    # Chegara: pol 0.80 (sokin payt ~20% arzon), shift 1.55 (eng zich pikda eng qimmat
    # brend ham real chegarada qoladi). Real spread shu oraliqda hosil bo'ladi.
    surge = min(1.55, max(0.80, surge))
    # Brendga xos tungi tarif (WB 22:40–00:20 → 2.2x) — chegaradan KEYIN,
    # chunki bu talab surge'i emas, brendning o'z rasmiy tungi tarifi.
    return round(surge * brand_night_mult(service_code, now), 3)


def calculate_price(service, distance_km: float, duration_min: float, surge: float = None):
    """Bitta xizmat uchun narxni hisoblash — Yandex'ning real formulasiga sodiq.

    Yandex formulasi (rasmiy):
        narx = (подача + km*km_narx + min*min_narx) * молния(surge)
    bunda:
      * `подача` (base_fare) — haydovchining siz tomon kelishi + посадка.
        Yandex'da bu ham talabga qarab oshadi, shu sabab surge BUTUN narxga
        qo'llanadi (молния km, min VA подачага ta'sir qiladi).
      * `минималка` (minimum_fare) — qisqa safarlar uchun pol; jami shundan
        past bo'lsa, minimal narx olinadi.
    """
    if surge is None:
        # Har xizmat o'zining fluctuation'iga ega (молния indeksi taqlidi).
        # surge_multiplier — KO'PAYTUVCHI (max emas): standart 1.0 bo'lgani uchun
        # past talab paytida current_surge < 1.0 bo'lib, narx 1.0 dan PASTGA tushadi.
        surge = current_surge(service_code=service.code) * (service.surge_multiplier or 1.0)
    raw = (
        service.base_fare_uzs                       # подача + посадка
        + distance_km * service.per_km_uzs          # masofa narxi
        + duration_min * service.per_minute_uzs     # vaqt narxi
    )
    # Молния butun safar narxiga qo'llanadi; so'ng минималка poli
    price = max(service.minimum_fare_uzs, int(raw * surge))
    # 100 so'mga yumaloqlaymiz (500 emas): brendlar orasidagi real, tor farq
    # (~100–1000 so'm) ko'rinib tursin — aks holda 500-yumaloqlash hammasini bir
    # xil qilib, qaysi brend arzon ekanini yashirardi.
    return round(price / 100) * 100, surge


class FormulaProvider(BaseProvider):
    """Tarif formulasi asosida narx hisoblovchi default provayder.

    Agar `route` parametri (OSRM dan kelgan) berilsa undan masofa/vaqtni oladi,
    bo'lmasa havodan masofa * 1.32 koeffitsientidan foydalanadi.
    """

    code = "formula"

    def fetch_estimate(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        route: dict | None = None,
    ) -> EstimateResult:
        if route:
            distance_km = route["distance_km"]
            duration_min = route["duration_min"]
            source = f"formula+{route.get('source', 'osrm')}"
        else:
            air_km = haversine_km(start_lat, start_lng, end_lat, end_lng)
            distance_km = round(air_km * 1.32, 2)
            # Free-flow vaqtni real tirbandlik vaqtiga moslaymiz
            duration_min = traffic_adjusted_duration(estimate_duration_min(distance_km))
            source = "formula"

        price, surge = calculate_price(self.service, distance_km, duration_min)

        return EstimateResult(
            service_code=self.service.code,
            price_uzs=price,
            distance_km=distance_km,
            duration_min=duration_min,
            surge=surge,
            source=source,
        )
