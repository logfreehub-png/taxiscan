"""
Har minutda bir marta ishlatilishi kerak (cron/scheduler bilan).
Hozirgi minutdagi narxlarni har bir aktiv service + region uchun saqlaydi.
Statistika doim "tirik" bo'lib turishi uchun.
"""
import random
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.taxi.models import PriceEstimate, TaxiService, Region
from apps.taxi.providers.formula import calculate_price


class Command(BaseCommand):
    help = "Hozirgi minutdagi narxlarni stats uchun saqlash (har minutda chaqirilsin)"

    def handle(self, *args, **opts):
        services = list(TaxiService.objects.filter(is_active=True))
        regions = list(Region.objects.filter(is_active=True, city="Tashkent"))
        if not services or not regions:
            self.stdout.write(self.style.ERROR("Avval seed_data ishga tushiring"))
            return

        now = timezone.now()
        n = 0
        # Har bir tuman uchun bir nechta tasodifiy yo'nalish
        for region in regions:
            # 2-4 ta sample yo'nalish
            for _ in range(random.randint(2, 4)):
                distance = random.uniform(3.0, 12.0)
                duration = distance * random.uniform(2.5, 3.8)
                start_lat = region.center_lat + random.uniform(-0.01, 0.01)
                start_lng = region.center_lng + random.uniform(-0.01, 0.01)
                end_lat = region.center_lat + random.uniform(-0.03, 0.03)
                end_lng = region.center_lng + random.uniform(-0.03, 0.03)

                for service in services:
                    price, surge = calculate_price(service, distance, duration)
                    PriceEstimate.objects.create(
                        service=service, region=region,
                        start_lat=start_lat, start_lng=start_lng,
                        end_lat=end_lat, end_lng=end_lng,
                        distance_km=distance, duration_min=duration,
                        price_uzs=price, surge=surge,
                        source="tick", created_at=now,
                    )
                    n += 1

        self.stdout.write(f"{now.strftime('%H:%M:%S')}: {n} ta yozuv qo'shildi")
