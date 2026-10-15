"""
TaxiNarx ma'lumotlar bazasini boshlang'ich ma'lumotlar bilan to'ldirish:
- 5 ta brend × 4 tarif = ~20 ta TaxiService (Yandex Start, Comfort, Comfort+, Business...)
- Toshkent shahridagi 11 ta tuman
- Default superuser
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.taxi.models import TaxiService, Region

User = get_user_model()


# Brend → asosiy meta. Tariflar pastda alohida.
BRANDS = {
    "yandex_go": {
        "name": "Yandex Go",
        "color": "#FFCC00",
        "website": "https://taxi.yandex.uz",
        "deeplink_template": "yandextaxi://route?"
                             "start-lat={start_lat}&start-lon={start_lng}"
                             "&end-lat={end_lat}&end-lon={end_lng}",
    },
    # Quyidagi mahalliy brendlarning rasmiy deeplink sxemasi ommaviy hujjatlashtirilmagan.
    # Shuning uchun bo'sh qoldiramiz — ilova ochilmasa mobil tarafda Play Store / sayt
    # fallback ishlaydi (src/lib/openTaxiApp.ts). Aniq sxema topilsa, shu yerga yozing.
    "uklon": {
        "name": "Uklon",
        "color": "#00C853",
        "website": "https://uklon.uz",
        "deeplink_template": "",
    },
    "fast": {
        "name": "Fasten",
        "color": "#FF6B00",
        "website": "https://fasten.com/uz_uz",
        "deeplink_template": "",
    },
    "wb_taxi": {
        "name": "WB Taxi",
        "color": "#7B2CBF",
        "website": "https://wbtaxi.uz",
        "deeplink_template": "",
        # WB Taxi faqat Toshkent shahri ichida ishlaydi — shahar chegarasi (bbox,
        # ozgina zaxira bilan): g'arbda Uchtepa, sharqda Bektemir/TTZ, shimolda
        # Yunusobod, janubda Yangihayot. Chirchiq/G'azalkent/Chimyon TASHQARIDA.
        "coverage_area": {
            "label": "Toshkent shahri",
            "min_lat": 41.16, "max_lat": 41.42,
            "min_lng": 69.10, "max_lng": 69.47,
        },
    },
    "mytaxi": {
        "name": "MyTaxi",
        "color": "#0066CC",
        "website": "https://mytaxi.uz",
        "deeplink_template": "",
    },
}

# Real Yandex Go / Uklon Toshkent tarif farqlari (2025-2026 amaliy):
#   Econom -> Comfort:    +35-40% (yangi mashinalar, climate)
#   Econom -> Comfort+:   +60-75% (premium klass, audi/bmw)
#   Econom -> Business:   +95-115% (S-klass, mercedes E)
TIERS = [
    ("econom",       "Start",     1.00, "Eng arzon, kichik mashinalar"),
    ("comfort",      "Comfort",   1.40, "Klimat, yangi mashinalar"),
    ("comfort_plus", "Comfort+",  1.70, "Keng salon, yetuk haydovchi"),
    ("business",     "Business",  2.05, "Mercedes/BMW, premium servis"),
]

# 2026-yil Toshkent REAL narxlar (econom/Start), past talab (surge≈1.0) holati.
# Manba: Yandex Go rasmiy Toshkent Start tarifi (taxi.yandex.com/tashkent/tariff/start)
#   — ~2 500 so'm/km, kutish ~650 so'm/daqiqa, harakatdagi daqiqa pastroq (~310–370).
#   Shahar ichi ~10 daqiqalik safar real ~18 000–30 000 so'm (pastki — bo'sh yo'l,
#   yuqori — propka/surge). Aeroportdan markazgacha ~35 000–55 000 so'm.
#
# MUHIM (foydalanuvchi talabi — eng asosiy):
#   1) Real Toshkentda narxlar BIR XIL EMAS — bir paytda turli ilovalar KO'P farq
#      qiladi (kuzatilgan: WB ~16 100, Yandex ~17 500, Uklon ~23 000 — bir xil yo'l).
#      Demak kimdir aniq arzon, kimdir aniq qimmat bo'lishi KERAK (ishonchli ko'rinsin).
#   2) LEKIN hech bir brend "doim eng arzon"/"doim eng qimmat" emas — kim arzon ekani
#      vaqt o'tib o'zgaradi. Bu IKKI manbadan keladi:
#      a) REAL tarif STRUKTURASI (quyidagi tariflar) — har brend boshqa narsada arzon:
#           • Uklon  — eng past base+minimal → QISQA safarda
#           • Fasten — umumiy balansi past    → O'RTA safarda
#           • Yandex — eng past km narxi      → UZOQ safarda
#           • MyTaxi — eng past daqiqa narxi  → PROPKA (vaqt cho'zilganda)
#           • WB     — o'rtacha + katta cashback (eslatma)
#      b) Har brendning MUSTAQIL real-time surge'i (formula._service_demand_mult) —
#         pik soatda brendlar narxi KENG tarqaladi (±~20%, real spread), sokin paytda
#         yaqinlashadi (±~4%). Har biri o'z fazasida → eng arzon brend vaqt o'tib o'zgaradi.
#   3) Narxni OSHIRADIGAN narsa = REAL pik/propka. Pik soatda OSRM yo'l VAQTI
#      `traffic_adjusted_duration` orqali cho'ziladi (per-minut ↑) + `_base_hour_surge`
#      talab koeffitsienti. Pik (08–10, 17–20, juma kechqurun) narx hammada ko'tariladi,
#      AMMO turli darajada (spread kengayadi). Surge 0.80–1.55 oralig'ida chegaralangan.
#
# Anchorlar (econom): 4.1km/10daq sokin payt ~14k, pik paytda ~15.5k(arzon)–21.5k(qimmat).
ECONOM_BASE = {
    # base=подача+посадка, per_km, per_min(harakatdagi), minimum=минималка
    "yandex_go": dict(base=2550, per_km=2450, per_min=370, minimum=11000),  # km arzon → UZOQ
    "mytaxi":    dict(base=2550, per_km=2620, per_min=310, minimum=11000),  # daqiqa arzon → PROPKA
    "uklon":     dict(base=2200, per_km=2560, per_min=360, minimum=9700),   # base/min arzon → QISQA
    "fast":      dict(base=2450, per_km=2520, per_min=345, minimum=10600),  # balansli → O'RTA
    "wb_taxi":   dict(base=2500, per_km=2540, per_min=355, minimum=11000),  # o'rtacha + cashback
}


def build_services():
    out = []
    sort = 0
    for bcode, brand in BRANDS.items():
        base = ECONOM_BASE[bcode]
        for tier_code, tier_label, mult, _desc in TIERS:
            sort += 1
            code = f"{bcode}__{tier_code}"
            name = f"{brand['name']} {tier_label}"
            out.append({
                "code": code,
                "name": name,
                "brand": brand["name"],
                "tier": tier_code,
                "color": brand["color"],
                "website": brand["website"],
                "deeplink_template": brand["deeplink_template"],
                "base_fare_uzs": int(base["base"] * mult),
                "per_km_uzs": int(base["per_km"] * mult),
                "per_minute_uzs": int(base["per_min"] * mult),
                "minimum_fare_uzs": int(base["minimum"] * mult),
                "coverage_area": brand.get("coverage_area"),
                "sort_order": sort,
            })
    return out


# Toshkent tumanlari (taxminiy markaz koordinatalari)
REGIONS = [
    ("Yunusobod", 41.366, 69.288, 4.5),
    ("Mirzo Ulug'bek", 41.336, 69.336, 4.0),
    ("Mirobod", 41.296, 69.281, 3.5),
    ("Yashnobod", 41.296, 69.347, 4.0),
    ("Chilonzor", 41.275, 69.203, 4.5),
    ("Shayxontohur", 41.327, 69.235, 3.5),
    ("Olmazor", 41.366, 69.218, 4.5),
    ("Sergeli", 41.231, 69.222, 5.0),
    ("Yakkasaroy", 41.288, 69.260, 3.0),
    ("Bektemir", 41.225, 69.376, 5.0),
    ("Uchtepa", 41.302, 69.156, 4.5),
]


class Command(BaseCommand):
    help = "TaxiNarx loyihasi uchun boshlang'ich ma'lumotlar"

    def handle(self, *args, **options):
        self.stdout.write("Eski TaxiService'larni tozalash (yangi brendlar va tarif strukturasi)...")
        # Hammasini o'chiramiz — keyin yangilaymiz (eski yango/uzum/on_taxi ham ketsin)
        TaxiService.objects.all().delete()

        self.stdout.write("Taxi xizmatlari (brend x tarif) yaratilmoqda...")
        for s in build_services():
            obj, created = TaxiService.objects.update_or_create(
                code=s["code"], defaults=s
            )
            tag = "yangi" if created else "yangilandi"
            self.stdout.write(f"  • {obj.name} — {tag}")

        self.stdout.write("\nToshkent tumanlari yaratilmoqda...")
        for name, lat, lng, radius in REGIONS:
            obj, created = Region.objects.update_or_create(
                name=name,
                city="Tashkent",
                defaults={
                    "center_lat": lat,
                    "center_lng": lng,
                    "radius_km": radius,
                },
            )
            tag = "yangi" if created else "mavjud"
            self.stdout.write(f"  • {obj.name} — {tag}")

        # Superuser yaratish
        if not User.objects.filter(phone="+998900000000").exists():
            User.objects.create_superuser(
                username="admin",
                phone="+998900000000",
                password="admin12345",
                role="admin",
            )
            self.stdout.write(self.style.SUCCESS(
                "\nSuperuser yaratildi:\n"
                "  Telefon: +998900000000\n"
                "  Parol:   admin12345"
            ))

        self.stdout.write(self.style.SUCCESS("\nTayyor!"))
