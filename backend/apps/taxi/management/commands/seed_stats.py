"""
Statistika uchun sintetik tarixiy ma'lumotlar yaratish.

Barcha tumanlar (shahar + viloyat) uchun yozuv yaratiladi. Har bir tuman
o'z "mashhurlik" og'irligiga ega — markaziy shahar tumanlari gavjum,
chekka/viloyat tumanlari kamroq. Shu tufayli "Qayerda yo'lovchi ko'p"
realistik va turlicha bo'ladi (bir tekis emas).
"""
import hashlib
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.taxi.models import PriceEstimate, TaxiService, Region

# Markaziy/gavjum shahar tumanlari — eng ko'p talab
CORE_CITY = {
    "Chilonzor", "Yunusobod", "Mirzo Ulug'bek", "Yashnobod", "Mirobod",
    "Shayxontohur", "Yakkasaroy",
}


def _region_weight(region):
    """Tumanning nisbiy mashhurligi (qancha odam chaqirishi)."""
    # Deterministik 0.7..1.3 fluktuatsiya (har tuman uchun barqaror)
    h = int(hashlib.md5(region.name.encode()).hexdigest()[:6], 16) / 0xFFFFFF
    jitter = 0.7 + 0.6 * h
    if region.city == "Tashkent":
        base = 12.0 if region.name in CORE_CITY else 7.0
    else:
        base = 2.5  # Toshkent viloyati tumanlari — ancha kam
    return base * jitter


class Command(BaseCommand):
    help = "Statistika ko'rsatish uchun sintetik tarixiy yozuvlar (barcha tumanlar)"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7)
        parser.add_argument("--per-hour", type=int, default=30,
                            help="Har soatdagi o'rtacha so'rovlar soni")
        parser.add_argument("--clear", action="store_true", help="Avval barcha eski yozuvlarni o'chirish")

    def handle(self, *args, **opts):
        days = opts["days"]
        per_hour = opts["per_hour"]
        if opts["clear"]:
            n = PriceEstimate.objects.all().delete()[0]
            self.stdout.write(f"Eski {n} ta yozuv o'chirildi")

        services = list(TaxiService.objects.filter(is_active=True))
        regions = list(Region.objects.filter(is_active=True))
        if not services or not regions:
            self.stdout.write(self.style.ERROR("Avval seed_data / seed_regions ishga tushiring"))
            return

        weights = [_region_weight(r) for r in regions]

        now = timezone.now()
        created = 0
        for hours_ago in range(days * 24):
            t = now - timedelta(hours=hours_ago)
            hour = t.hour

            # Soatga qarab surge
            if hour in (8, 9, 17, 18, 19):       # tirbandlik
                surge = random.uniform(1.3, 1.6)
            elif hour in (0, 1, 2, 3, 4, 5):     # tun
                surge = random.uniform(1.15, 1.35)
            elif hour in (22, 23):               # kech
                surge = random.uniform(1.0, 1.2)
            else:
                surge = random.uniform(0.95, 1.1)

            # Soatga qarab faollik (tunda kam)
            activity = 0.4 if hour in (1, 2, 3, 4, 5) else 1.0
            n_requests = max(1, int(random.randint(per_hour // 2, per_hour) * activity))

            # Har soatda mashhurlikka qarab tumanlarni tanlaymiz
            for _ in range(n_requests):
                region = random.choices(regions, weights=weights, k=1)[0]
                # Kichik narx fluktuatsiyasi
                price_jitter = random.uniform(0.9, 1.1)
                # Bir nechta brend va tarif
                for service in random.sample(services, k=min(len(services), random.randint(3, 6))):
                    distance = random.uniform(2.5, 12.0)
                    duration = distance * random.uniform(2.5, 4.0)
                    raw_price = (
                        service.base_fare_uzs
                        + distance * service.per_km_uzs
                        + duration * service.per_minute_uzs
                    ) * surge * price_jitter
                    price = max(int(raw_price), service.minimum_fare_uzs)
                    PriceEstimate.objects.create(
                        service=service,
                        region=region,
                        start_lat=region.center_lat + random.uniform(-0.01, 0.01),
                        start_lng=region.center_lng + random.uniform(-0.01, 0.01),
                        end_lat=region.center_lat + random.uniform(-0.03, 0.03),
                        end_lng=region.center_lng + random.uniform(-0.03, 0.03),
                        distance_km=distance,
                        duration_min=duration,
                        price_uzs=price,
                        surge=round(surge, 2),
                        source="formula",
                        created_at=t,
                    )
                    created += 1

        self.stdout.write(self.style.SUCCESS(f"\n{created} ta sintetik yozuv yaratildi (oxirgi {days} kun)"))
