import math
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


def free_trial_days() -> int:
    """Ro'yxatdan o'tgandagi bepul sinov muddati (kun)."""
    return int(settings.TAXINARX.get("FREE_TRIAL_DAYS", 1))


def subscription_price_uzs(user) -> int:
    """Foydalanuvchi roliga qarab oylik obuna narxi (so'mda).

    Yo'lovchi — 9 999 so'm, haydovchi — 49 999 so'm (settings.TAXINARX'dan).
    """
    prices = settings.TAXINARX.get("SUBSCRIPTION_PRICE_UZS", {})
    role = getattr(user, "role", "passenger")
    return int(prices.get(role, prices.get("passenger", 9999)))


class SubscriptionStatus(models.TextChoices):
    TRIAL = "trial", "Sinov muddati"
    ACTIVE = "active", "Faol"
    EXPIRED = "expired", "Muddati tugagan"
    CANCELED = "canceled", "Bekor qilingan"


class Subscription(models.Model):
    """Foydalanuvchi obunasi — oylik, narx rolga bog'liq (yo'lovchi/haydovchi)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    status = models.CharField(
        "Holat",
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL,
    )
    started_at = models.DateTimeField("Boshlangan", auto_now_add=True)
    expires_at = models.DateTimeField("Tugaydi")
    auto_renew = models.BooleanField("Avtomatik yangilanish", default=True)
    monthly_price_usd = models.DecimalField(
        "Oylik narx ($)", max_digits=6, decimal_places=2, default=1.00
    )
    last_charge_at = models.DateTimeField("Oxirgi to'lov", null=True, blank=True)
    next_charge_at = models.DateTimeField("Keyingi to'lov", null=True, blank=True)
    # Promo-kod orqali kelgan keyingi to'lovga chegirma (%) — bir marta qo'llanadi
    discount_percent = models.PositiveIntegerField("Keyingi to'lov chegirmasi (%)", default=0)

    class Meta:
        verbose_name = "Obuna"
        verbose_name_plural = "Obunalar"

    def __str__(self):
        return f"{self.user.phone} — {self.get_status_display()}"

    @property
    def is_active(self):
        if self.status == SubscriptionStatus.CANCELED:
            return False
        return self.expires_at > timezone.now()

    @property
    def monthly_price_uzs(self) -> int:
        return subscription_price_uzs(self.user)

    @property
    def days_left(self):
        # Yuqoriga yaxlitlanadi: 1 kunlik sinov butun kun davomida "1 kun" ko'rinadi
        # (aks holda 23s 59m qolganda "0 kun" chiqib qolardi).
        seconds = (self.expires_at - timezone.now()).total_seconds()
        if seconds <= 0:
            return 0
        return math.ceil(seconds / 86400)

    def extend(self, days=30):
        base = max(self.expires_at, timezone.now())
        self.expires_at = base + timedelta(days=days)
        self.next_charge_at = self.expires_at
        self.last_charge_at = timezone.now()
        self.status = SubscriptionStatus.ACTIVE
        self.save()


class TransactionStatus(models.TextChoices):
    PENDING = "pending", "Kutilmoqda"
    SUCCESS = "success", "Muvaffaqiyatli"
    FAILED = "failed", "Muvaffaqiyatsiz"
    REFUNDED = "refunded", "Qaytarilgan"


class PaymeState(models.IntegerChoices):
    """Payme Merchant API tranzaksiya holatlari."""
    INITIAL = 0, "Yaratilmagan"
    CREATED = 1, "Yaratilgan"
    PERFORMED = 2, "To'langan"
    CANCELLED = -1, "Bekor qilingan"
    CANCELLED_AFTER_PERFORM = -2, "To'langach qaytarilgan"


class Transaction(models.Model):
    """To'lov yozuvi (order). Payme Merchant API orqali to'lanadi."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    amount_usd = models.DecimalField("Summa ($)", max_digits=6, decimal_places=2)
    amount_uzs = models.PositiveIntegerField("Summa (so'm)", default=0)
    status = models.CharField(
        "Holat",
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING,
    )
    card_last4 = models.CharField("Karta oxiri", max_length=4, blank=True)
    description = models.CharField("Izoh", max_length=255, blank=True)
    error_message = models.CharField("Xato xabari", max_length=255, blank=True)
    external_id = models.CharField("Tashqi ID", max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Payme Merchant API maydonlari
    payme_id = models.CharField("Payme tranzaksiya ID", max_length=64, blank=True, db_index=True)
    payme_state = models.SmallIntegerField(
        "Payme holati", choices=PaymeState.choices, default=PaymeState.INITIAL
    )
    payme_create_time = models.BigIntegerField("Payme yaratilgan (ms)", default=0)
    payme_perform_time = models.BigIntegerField("Payme to'langan (ms)", default=0)
    payme_cancel_time = models.BigIntegerField("Payme bekor qilingan (ms)", default=0)
    cancel_reason = models.SmallIntegerField("Bekor qilish sababi", null=True, blank=True)

    class Meta:
        verbose_name = "Tranzaksiya"
        verbose_name_plural = "Tranzaksiyalar"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.phone} ${self.amount_usd} ({self.get_status_display()})"


class Card(models.Model):
    """Foydalanuvchi kartasi (UzCard / Humo)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cards",
    )
    holder_name = models.CharField("Karta egasi", max_length=100)
    card_last4 = models.CharField("Oxirgi 4 raqam", max_length=4)
    expiry_month = models.PositiveSmallIntegerField("Oy")
    expiry_year = models.PositiveSmallIntegerField("Yil")
    card_type = models.CharField(
        "Karta turi",
        max_length=20,
        choices=[("uzcard", "UzCard"), ("humo", "Humo"), ("visa", "Visa"), ("mastercard", "MasterCard")],
        default="uzcard",
    )
    is_default = models.BooleanField("Asosiy", default=True)
    token = models.CharField(
        "Token",
        max_length=255,
        blank=True,
        help_text="To'lov tizimidan kelgan saqlangan token",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Karta"
        verbose_name_plural = "Kartalar"
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.card_type.upper()} •••• {self.card_last4}"


class PromoCode(models.Model):
    """Admin yaratadigan promo-kod. Yo'lovchi/haydovchi kiritib chegirma oladi.

    Hozircha asosiy mukofot — obunaga BEPUL kunlar qo'shish (free_days).
    """

    AUDIENCE = [
        ("all", "Hammaga"),
        ("passenger", "Yo'lovchilarga"),
        ("driver", "Haydovchilarga"),
    ]
    REWARD = [
        ("free_days", "Bepul kunlar"),
        ("discount", "Obunaga chegirma (%)"),
    ]

    code = models.CharField("Kod", max_length=32, unique=True)
    description = models.CharField("Izoh", max_length=200, blank=True)
    reward_type = models.CharField("Mukofot turi", max_length=12, choices=REWARD, default="free_days")
    free_days = models.PositiveIntegerField("Bepul kunlar", default=7,
                                            help_text="Obunaga qo'shiladigan kunlar (free_days turi uchun)")
    discount_percent = models.PositiveIntegerField("Chegirma (%)", default=0,
                                                   help_text="Keyingi obuna to'loviga chegirma (discount turi uchun)")
    audience = models.CharField("Kimga", max_length=12, choices=AUDIENCE, default="all")
    max_uses = models.PositiveIntegerField("Maksimal foydalanish (0 = cheksiz)", default=0)
    used_count = models.PositiveIntegerField("Ishlatilgan", default=0)
    valid_until = models.DateTimeField("Amal qilish muddati", null=True, blank=True)
    is_active = models.BooleanField("Faol", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Promo-kod"
        verbose_name_plural = "Promo-kodlar"
        ordering = ["-created_at"]

    def __str__(self):
        if self.reward_type == "discount":
            return f"{self.code} (-{self.discount_percent}%)"
        return f"{self.code} (+{self.free_days} kun)"

    def save(self, *args, **kwargs):
        self.code = (self.code or "").strip().upper()
        super().save(*args, **kwargs)

    @property
    def status(self):
        """Kod holati: active / expired / used_up / disabled."""
        if not self.is_active:
            return "disabled"
        if self.valid_until and self.valid_until < timezone.now():
            return "expired"
        if self.max_uses and self.used_count >= self.max_uses:
            return "used_up"
        return "active"

    def check_usable(self, user):
        """(ok, sabab) — kodni shu foydalanuvchi ishlata oladimi."""
        st = self.status
        if st != "active":
            reasons = {
                "disabled": "Bu promo-kod o'chirilgan.",
                "expired": "Promo-kod muddati tugagan.",
                "used_up": "Promo-kod limiti tugagan.",
            }
            return False, reasons.get(st, "Promo-kod yaroqsiz.")
        role = getattr(user, "role", None)
        if self.audience == "passenger" and role != "passenger":
            return False, "Bu kod faqat yo'lovchilar uchun."
        if self.audience == "driver" and role != "driver":
            return False, "Bu kod faqat haydovchilar uchun."
        if PromoRedemption.objects.filter(promo=self, user=user).exists():
            return False, "Siz bu kodni allaqachon ishlatgansiz."
        return True, ""


class PromoRedemption(models.Model):
    """Foydalanuvchi promo-kodni ishlatgani yozuvi (status bilan)."""

    STATUS = [
        ("applied", "Qo'llandi"),
        ("expired", "Muddati tugagan"),
        ("invalid", "Yaroqsiz"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="promo_redemptions"
    )
    promo = models.ForeignKey(PromoCode, on_delete=models.CASCADE, related_name="redemptions")
    status = models.CharField(max_length=12, choices=STATUS, default="applied")
    free_days_granted = models.PositiveIntegerField("Berilgan bepul kunlar", default=0)
    discount_percent_granted = models.PositiveIntegerField("Berilgan chegirma (%)", default=0)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    @property
    def benefit_label(self) -> str:
        """Admin uchun qisqa izoh: nima berilgani (tekin/chegirma/qancha)."""
        if self.free_days_granted:
            return f"+{self.free_days_granted} kun bepul"
        if self.discount_percent_granted:
            return f"{self.discount_percent_granted}% chegirma"
        return "—"

    class Meta:
        verbose_name = "Promo-kod ishlatilishi"
        verbose_name_plural = "Promo-kod ishlatilishlari"
        ordering = ["-redeemed_at"]
        unique_together = [("user", "promo")]

    def __str__(self):
        return f"{self.user.phone} — {self.promo.code} ({self.get_status_display()})"
