from django.db import models
from django.conf import settings


class TaxiService(models.Model):
    """Taxi xizmati — Yandex Go, Yango, MyTaxi, Uzum Taxi, ON Taxi va h.k."""

    code = models.SlugField("Kod", max_length=50, unique=True)
    name = models.CharField("Nomi", max_length=100)
    brand = models.CharField("Brend", max_length=50, blank=True, db_index=True,
                             help_text="Yandex Go, Yango, MyTaxi, Uzum Taxi, ON Taxi")
    tier = models.CharField("Tarif darajasi", max_length=20, blank=True,
                             choices=[("econom", "Ekonom/Start"), ("comfort", "Comfort"),
                                      ("comfort_plus", "Comfort+"), ("business", "Business"),
                                      ("delivery", "Dostavka")], default="econom")
    logo = models.ImageField("Logo", upload_to="taxi_logos/", null=True, blank=True)
    color = models.CharField("Brend rang", max_length=7, default="#FFCC00")
    website = models.URLField("Veb sayt", blank=True)
    deeplink_template = models.CharField(
        "Deep-link shabloni",
        max_length=500,
        blank=True,
        help_text="Masalan: yandextaxi://route?start-lat={start_lat}&start-lon={start_lng}",
    )

    base_fare_uzs = models.PositiveIntegerField("Bazaviy narx (so'm)", default=6000)
    per_km_uzs = models.PositiveIntegerField("Har 1 km uchun (so'm)", default=2200)
    per_minute_uzs = models.PositiveIntegerField("Har 1 daqiqa uchun (so'm)", default=400)
    minimum_fare_uzs = models.PositiveIntegerField("Minimum narx (so'm)", default=10000)
    surge_multiplier = models.FloatField("Surge ko'paytuvchi", default=1.0)

    # Xizmat hududi — ba'zi xizmatlar (masalan WB Taxi) faqat shahar ichida ishlaydi.
    # Bo'sh bo'lsa cheklov yo'q. Format:
    #   {"label": "Toshkent shahri", "min_lat": 41.16, "max_lat": 41.42,
    #    "min_lng": 69.10, "max_lng": 69.47}
    coverage_area = models.JSONField(
        "Xizmat hududi (bbox)", null=True, blank=True,
        help_text='Masalan: {"label": "Toshkent shahri", "min_lat": 41.16, '
                  '"max_lat": 41.42, "min_lng": 69.10, "max_lng": 69.47}. '
                  "Bo'sh bo'lsa — butun respublika bo'ylab ishlaydi.",
    )

    is_active = models.BooleanField("Faol", default=True)
    sort_order = models.IntegerField("Tartib", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Taxi xizmati"
        verbose_name_plural = "Taxi xizmatlari"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def covers_point(self, lat, lng) -> bool:
        """Nuqta xizmat hududi ichidami. Hudud kiritilmagan bo'lsa — har doim True."""
        c = self.coverage_area
        if not c:
            return True
        try:
            return (
                c["min_lat"] <= lat <= c["max_lat"]
                and c["min_lng"] <= lng <= c["max_lng"]
            )
        except (KeyError, TypeError):
            return True  # noto'g'ri to'ldirilgan bo'lsa xizmatni yashirmaymiz


class Region(models.Model):
    """Shahar tumani — masalan Toshkentdagi Yunusobod, Chilonzor, Mirobod va h.k."""

    name = models.CharField("Nomi", max_length=100)
    city = models.CharField("Shahar", max_length=100, default="Tashkent")
    center_lat = models.FloatField("Markaz kenglik")
    center_lng = models.FloatField("Markaz uzunlik")
    radius_km = models.FloatField("Radius (km)", default=3.0)
    geometry = models.JSONField("GeoJSON polygon", null=True, blank=True,
                                 help_text="OSM dan olingan haqiqiy chegaralar")
    is_active = models.BooleanField("Faol", default=True)

    class Meta:
        verbose_name = "Tuman / Rayon"
        verbose_name_plural = "Tumanlar / Rayonlar"
        ordering = ["city", "name"]
        unique_together = [("name", "city")]

    def __str__(self):
        return f"{self.name} ({self.city})"


class PriceEstimate(models.Model):
    """Narx hisob-kitobi — har bir foydalanuvchi so'rovi natijasi saqlanadi."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_estimates",
    )
    service = models.ForeignKey(
        TaxiService, on_delete=models.CASCADE, related_name="estimates"
    )

    start_lat = models.FloatField()
    start_lng = models.FloatField()
    end_lat = models.FloatField(null=True, blank=True)
    end_lng = models.FloatField(null=True, blank=True)
    start_address = models.CharField(max_length=255, blank=True)
    end_address = models.CharField(max_length=255, blank=True)

    distance_km = models.FloatField("Masofa (km)", default=0)
    duration_min = models.FloatField("Vaqt (daqiqa)", default=0)
    price_uzs = models.PositiveIntegerField("Narx (so'm)")
    surge = models.FloatField("Surge", default=1.0)

    # Bitta foydalanuvchi qidiruvi ~20 ta yozuv yaratadi (har brendga bittadan).
    # search_id ularni bitta qidiruvga bog'laydi — "nechta odam qidiryapti"
    # statistikasi yozuvlar sonini emas, UNIKAL qidiruvlarni sanashi uchun.
    # tick_stats/seed kabi sun'iy yozuvlarda NULL qoladi va qidiruv sanalmaydi.
    search_id = models.UUIDField(
        "Qidiruv ID", null=True, blank=True, db_index=True,
    )
    # Qidiruvchining barqaror kaliti: "u:<user_id>" yoki anonim uchun "ip:<ip>".
    # Talab statistikasi UNIKAL ODAMLARNI sanaydi — bitta odam 10 marta bossa
    # ham "1 kishi chaqiryapti" bo'lib qoladi (10 emas).
    searcher_key = models.CharField(
        "Qidiruvchi kaliti", max_length=64, null=True, blank=True, db_index=True,
    )
    region = models.ForeignKey(
        Region, on_delete=models.SET_NULL, null=True, blank=True
    )
    source = models.CharField(
        "Manba",
        max_length=20,
        choices=[
            ("formula", "Tarif formulasi"),
            ("api", "Real API"),
            ("scraped", "Scraping"),
        ],
        default="formula",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Narx hisob-kitobi"
        verbose_name_plural = "Narx hisob-kitoblari"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["service", "-created_at"]),
            models.Index(fields=["region", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.service.name}: {self.price_uzs:,} so'm"


class FavoriteRoute(models.Model):
    """Foydalanuvchining sevimli yo'nalishi (uy ↔ ish kabi)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_routes",
    )
    title = models.CharField("Nom", max_length=100)
    start_address = models.CharField(max_length=255)
    start_lat = models.FloatField()
    start_lng = models.FloatField()
    end_address = models.CharField(max_length=255)
    end_lat = models.FloatField()
    end_lng = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sevimli yo'nalish"
        verbose_name_plural = "Sevimli yo'nalishlar"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.phone}: {self.title}"


class DriverPanelSettings(models.Model):
    """Haydovchi paneli global sozlamalari (singleton, pk=1).

    demand_enabled — barcha haydovchilarga "talab" (Qayerda yo'lovchi ko'p)
    ma'lumotini ko'rsatish/ko'rsatmaslik. Faqat admin o'zgartiradi.
    """
    demand_enabled = models.BooleanField("Talab ma'lumoti yoqilgan", default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Haydovchi paneli sozlamasi"
        verbose_name_plural = "Haydovchi paneli sozlamalari"

    def __str__(self):
        return f"Talab: {'yoqilgan' if self.demand_enabled else 'ochirilgan'}"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class SiteSetting(models.Model):
    """Sayt global ko'rinish sozlamalari (singleton, pk=1) — admin boshqaradi.

    brand_color   — saytning asosiy (brend) rangi HEX (#RRGGBB), butun saytga qo'llanadi.
    default_theme — yangi (temasi tanlanmagan) foydalanuvchilar uchun standart rejim.
    """
    THEME_CHOICES = [("light", "Yorug'"), ("dark", "Qorong'i"), ("auto", "Avto")]

    brand_color = models.CharField(
        "Brend rangi (HEX)", max_length=7, default="#FFCC00",
        help_text="Masalan #FFCC00 — butun saytning asosiy rangi.",
    )
    default_theme = models.CharField(
        "Standart rejim", max_length=5, choices=THEME_CHOICES, default="auto",
        help_text="Foydalanuvchi o'zi tanlamaguncha ko'rinadigan kun/tun rejimi.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sayt ko'rinishi"
        verbose_name_plural = "Sayt ko'rinishi"

    def __str__(self):
        return "Sayt ko'rinishi sozlamalari"

    def save(self, *args, **kwargs):
        self.pk = 1  # singleton — doim bitta yozuv
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
