from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    DRIVER = "driver", "Haydovchi"
    PASSENGER = "passenger", "Yo'lovchi"
    ADMIN = "admin", "Administrator"


class Gender(models.TextChoices):
    MALE = "male", "Erkak"
    FEMALE = "female", "Ayol"


class User(AbstractUser):
    """TaxiNarx foydalanuvchisi — haydovchi yoki yo'lovchi."""

    phone = models.CharField("Telefon raqam", max_length=20, unique=True)
    role = models.CharField(
        "Rol",
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PASSENGER,
    )
    avatar = models.ImageField(
        "Avatar", upload_to="avatars/", null=True, blank=True
    )
    date_of_birth = models.DateField("Tug'ilgan kun", null=True, blank=True)
    gender = models.CharField(
        "Jinsi", max_length=10, choices=Gender.choices, blank=True, default=""
    )
    profile_completed = models.BooleanField("Profil to'ldirilgan", default=False)
    city = models.CharField("Shahar", max_length=100, default="Tashkent")
    home_lat = models.FloatField("Uy kenglik", null=True, blank=True)
    home_lng = models.FloatField("Uy uzunlik", null=True, blank=True)
    has_card = models.BooleanField("Karta ulangan", default=False)
    card_last4 = models.CharField("Karta oxirgi 4 raqami", max_length=4, blank=True)
    # Telefon push-bildirishnomasi uchun Expo push token
    expo_push_token = models.CharField("Expo push token", max_length=255, blank=True)
    # Haydovchiga "talab" (demand) ma'lumotini ko'rsatish:
    #   inherit = global sozlamaga bo'ysunadi, on = doim ko'rsatish, off = ko'rsatmaslik
    demand_access = models.CharField(
        "Talab ma'lumoti ruxsati",
        max_length=10,
        choices=[("inherit", "Global sozlama"), ("on", "Yoqilgan"), ("off", "O'chirilgan")],
        default="inherit",
    )
    last_seen = models.DateTimeField("Oxirgi aktivlik", null=True, blank=True, db_index=True)
    total_seconds_active = models.PositiveIntegerField("Jami aktiv soniyalar", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

    def __str__(self):
        return f"{self.phone} ({self.get_role_display()})"

    @property
    def is_driver(self):
        return self.role == UserRole.DRIVER

    @property
    def is_passenger(self):
        return self.role == UserRole.PASSENGER

    @property
    def is_admin_role(self):
        return self.role == UserRole.ADMIN or self.is_superuser

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @property
    def full_name(self):
        name = f"{self.first_name or ''} {self.last_name or ''}".strip()
        return name or self.phone


class UserSession(models.Model):
    """Foydalanuvchining bitta aktiv sessiyasi.

    Har request middleware'da last_heartbeat yangilanadi.
    Agar 5 daqiqadan ko'p tinch tursa - keyingi request yangi sessiya boshlaydi.
    """
    user = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="sessions"
    )
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    last_heartbeat = models.DateTimeField(auto_now=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Sessiya"
        verbose_name_plural = "Sessiyalar"
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["user", "-started_at"])]

    def __str__(self):
        return f"{self.user.phone}: {self.duration_seconds}s"


class NotificationKind(models.TextChoices):
    INFO = "info", "Ma'lumot"
    NEWS = "news", "Yangilik"
    REMINDER = "reminder", "Eslatma"
    PROMO = "promo", "Aksiya"
    ADMIN = "admin", "Admin xabari"


class NotificationBatch(models.Model):
    """Admin yuborgan bitta xabar partiyasi — statistika uchun (kimga, nechta o'qildi)."""
    title = models.CharField(max_length=160)
    preview = models.CharField(max_length=200, blank=True)  # mini tavsif
    body = models.TextField(blank=True)  # to'liq tavsif
    kind = models.CharField(max_length=12, default=NotificationKind.ADMIN)
    target = models.CharField(max_length=20, default="all")  # all|passengers|drivers|user
    sms = models.BooleanField(default=False)
    total = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True, related_name="sent_batches"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Xabar partiyasi"
        verbose_name_plural = "Xabar partiyalari"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.total})"


class Notification(models.Model):
    """Foydalanuvchiga bitta bildirishnoma (in-app + ixtiyoriy SMS).

    Broadcast (hammaga) — har bir foydalanuvchi uchun alohida qator yaratiladi.
    `dedup_key` — bir xil eslatma takror yaratilmasligi uchun (cron uchun).
    """
    user = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="notifications"
    )
    batch = models.ForeignKey(
        "NotificationBatch", on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications"
    )
    kind = models.CharField(max_length=12, choices=NotificationKind.choices, default=NotificationKind.INFO)
    title = models.CharField(max_length=160)
    preview = models.CharField(max_length=200, blank=True)  # mini tavsif (qisqa)
    body = models.TextField(blank=True)  # to'liq tavsif
    is_read = models.BooleanField(default=False, db_index=True)
    sent_sms = models.BooleanField(default=False)
    dedup_key = models.CharField(max_length=120, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Bildirishnoma"
        verbose_name_plural = "Bildirishnomalar"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.user.phone}: {self.title}"
