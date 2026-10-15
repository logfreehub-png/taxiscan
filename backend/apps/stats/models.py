from django.db import models
from apps.taxi.models import TaxiService, Region


class DailyServiceStat(models.Model):
    """Har bir taxi xizmati uchun kunlik statistika — narx o'rtachalari, raqobat."""

    date = models.DateField("Sana")
    service = models.ForeignKey(
        TaxiService, on_delete=models.CASCADE, related_name="daily_stats"
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="daily_stats",
    )

    avg_price_uzs = models.PositiveIntegerField("O'rtacha narx (so'm)", default=0)
    min_price_uzs = models.PositiveIntegerField("Eng past narx", default=0)
    max_price_uzs = models.PositiveIntegerField("Eng yuqori narx", default=0)
    avg_distance_km = models.FloatField("O'rtacha masofa (km)", default=0)
    avg_duration_min = models.FloatField("O'rtacha vaqt (daqiqa)", default=0)
    request_count = models.PositiveIntegerField("So'rovlar soni", default=0)
    cheapest_count = models.PositiveIntegerField(
        "Eng arzon bo'lgan marotaba", default=0
    )

    class Meta:
        verbose_name = "Kunlik statistika"
        verbose_name_plural = "Kunlik statistikalar"
        unique_together = [("date", "service", "region")]
        ordering = ["-date", "service"]
        indexes = [
            models.Index(fields=["-date", "service"]),
            models.Index(fields=["-date", "region"]),
        ]

    def __str__(self):
        return f"{self.date} • {self.service.name}"


class HourlyPriceSnapshot(models.Model):
    """Soatlik narx surati — TARIX o'zgarmasligi uchun.

    Har soatda har brendning vakil narxi BIR MARTA yoziladi va keyin o'zgarmaydi.
    Shu sabab "soat 8:00 da Yandex qimmat bo'lgan" bo'lsa, keyin WB qimmat bo'lsa ham
    8:00 dagi yozuv Yandex bo'lib qoladi — tarix retroaktiv o'zgarmaydi.
    Joriy (tugamagan) soat har so'rovda yangilanadi, soat tugagach qotadi.
    """
    tier = models.CharField(max_length=20, default="econom")
    brand = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#5C6772")
    day = models.DateField()
    hour = models.PositiveSmallIntegerField()
    price_uzs = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Soatlik narx surati"
        verbose_name_plural = "Soatlik narx suratlari"
        unique_together = [("tier", "brand", "day", "hour")]
        indexes = [models.Index(fields=["day", "tier"])]

    def __str__(self):
        return f"{self.day} {self.hour:02d}:00 {self.brand} {self.tier} = {self.price_uzs}"
