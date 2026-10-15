"""
Toshkent SHAHAR (12 tuman) va Toshkent VILOYATI (tumanlar) ro'yxatini yaratadi.

Faqat mavjudligini ta'minlaydi (get_or_create) — chegara (geometry) keyin
`fetch_polygons` buyrug'i bilan OSM dan to'ldiriladi.
"""
from django.core.management.base import BaseCommand
from apps.taxi.models import Region

# (nom, taxminiy markaz lat, lng) — aniq markaz polygon olingach qayta hisoblanadi
TASHKENT_CITY = [
    ("Bektemir", 41.2250, 69.3340),
    ("Chilonzor", 41.2750, 69.2030),
    ("Mirobod", 41.2960, 69.2810),
    ("Mirzo Ulug'bek", 41.3280, 69.3430),
    ("Olmazor", 41.3660, 69.2180),
    ("Sergeli", 41.2310, 69.2220),
    ("Shayxontohur", 41.3295, 69.2197),
    ("Uchtepa", 41.2870, 69.1850),
    ("Yakkasaroy", 41.2880, 69.2600),
    ("Yangihayot", 41.2150, 69.2450),
    ("Yashnobod", 41.2960, 69.3000),
    ("Yunusobod", 41.3660, 69.2880),
    ("Yangi Toshkent (Do'stlik/Politotdel)", 41.2549, 69.4368),
]

TASHKENT_PROVINCE = [
    ("Bekobod", 40.2200, 69.2690),
    ("Bo'ka", 40.8100, 69.2000),
    ("Bo'stonliq", 41.5400, 70.1300),
    ("Chinoz", 40.9350, 68.7660),
    ("Qibray", 41.3900, 69.4600),
    ("Ohangaron", 40.9080, 69.6390),
    ("Oqqo'rg'on", 40.8800, 69.0700),
    ("Parkent", 41.2900, 69.6800),
    ("Piskent", 40.8900, 69.3400),
    ("Quyichirchiq", 40.9200, 69.0500),
    ("O'rtachirchiq", 41.0700, 69.3600),
    ("Yuqorichirchiq", 41.1000, 69.5500),
    ("Yangiyo'l", 41.1120, 69.0480),
    ("Zangiota", 41.2300, 69.1300),
    ("Toshkent tumani", 41.3600, 69.5600),
]


class Command(BaseCommand):
    help = "Toshkent shahar va viloyat tumanlarini yaratadi (geometriyasiz)"

    def handle(self, *args, **opts):
        created = 0
        for city, items in [("Tashkent", TASHKENT_CITY), ("Toshkent viloyati", TASHKENT_PROVINCE)]:
            for name, lat, lng in items:
                obj, made = Region.objects.get_or_create(
                    name=name, city=city,
                    defaults={"center_lat": lat, "center_lng": lng, "radius_km": 5.0, "is_active": True},
                )
                if made:
                    created += 1
                    self.stdout.write(f"  + {city}: {name}")
        self.stdout.write(self.style.SUCCESS(
            f"\nTayyor — {created} ta yangi tuman qo'shildi. "
            f"Jami: {Region.objects.count()} tuman."
        ))
        self.stdout.write("Endi chegaralarni oling: python manage.py fetch_polygons")
