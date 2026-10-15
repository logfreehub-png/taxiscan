"""Eslatma (reminder) mantig'i.

- Obuna tugashiga 5 va 2 kun qolganda eslatma (har so'rovda tekshiriladi).
- Kunlik "Taksida ketasizmi?" eslatmasi va 1 kun kirmaganlar uchun — cron orqali
  `python manage.py send_reminders` buyrug'i bilan yuboriladi.
"""
from datetime import timedelta

from django.utils import timezone

from .models import NotificationKind
from .notifications import notify, broadcast


# Qaysi kunlarda obuna eslatmasi yuboriladi
SUB_REMIND_DAYS = (5, 2)


def ensure_subscription_reminders(user):
    """Foydalanuvchi obunasi tugashiga 5/2 kun qolgan bo'lsa eslatma yaratadi (dedup bilan)."""
    sub = getattr(user, "subscription", None)
    if not sub or not sub.is_active:
        return
    days = sub.days_left
    if days in SUB_REMIND_DAYS:
        key = f"sub-expire-{days}-{sub.expires_at.date().isoformat()}"
        notify(
            user,
            title=f"Obunangizga {days} kun qoldi",
            body="Uzilishsiz davom etish uchun obunani uzaytiring.",
            kind=NotificationKind.REMINDER,
            dedup_key=key,
            sms=True,
        )


def send_daily_ride_prompt(part: str = "kun"):
    """Barcha yo'lovchilarga "Taksida ketasizmi?" eslatmasi (cron: ertalab/kechqurun).

    `part` — "ertalab" yoki "kechqurun" (dedup uchun kun + qism).
    """
    today = timezone.now().date().isoformat()
    from django.contrib.auth import get_user_model
    User = get_user_model()
    n = 0
    for u in User.objects.filter(role="passenger").iterator():
        created = notify(
            u,
            title="Taksida ketasizmi? 🚕",
            body="Eng arzon taksi narxini bir zumda solishtiring.",
            kind=NotificationKind.REMINDER,
            dedup_key=f"ride-prompt-{part}-{today}",
            sms=False,
        )
        if created:
            n += 1
    return n


def send_subscription_promo():
    """Premium (faol obuna) olmaganlarga obuna taklifi — SMS bilan."""
    today = timezone.now().date().isoformat()
    from django.contrib.auth import get_user_model
    User = get_user_model()
    n = 0
    for u in User.objects.filter(role__in=["passenger", "driver"]).select_related("subscription").iterator():
        sub = getattr(u, "subscription", None)
        if sub and sub.is_active and sub.status == "active":
            continue  # premium bor — taklif kerak emas
        created = notify(
            u,
            title="Premium obuna — oyiga $1 💎",
            body="Cheksiz solishtiring va barcha imkoniyatlardan foydalaning. Obuna olish imkoniyatlari bor!",
            kind=NotificationKind.PROMO,
            dedup_key=f"sub-promo-{today}",
            sms=True,
        )
        if created:
            n += 1
    return n


def send_inactivity_prompts():
    """1 kundan beri kirmagan foydalanuvchilarga eslatma."""
    cutoff = timezone.now() - timedelta(days=1)
    today = timezone.now().date().isoformat()
    from django.contrib.auth import get_user_model
    User = get_user_model()
    n = 0
    qs = User.objects.filter(role__in=["passenger", "driver"]).exclude(last_seen__gte=cutoff)
    for u in qs.iterator():
        created = notify(
            u,
            title="Sizni sog'indik 👋",
            body="Bugun qayergadir borasizmi? Taksi narxlarini ko'rib qo'ying.",
            kind=NotificationKind.REMINDER,
            dedup_key=f"inactive-{today}",
            sms=True,
        )
        if created:
            n += 1
    return n
