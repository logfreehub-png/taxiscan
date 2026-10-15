"""Mavjud bepul-sinov (trial) obunalarni yangi muddatga qisqartirish.

Ilgari trial 7 kun berilardi. Endi FREE_TRIAL_DAYS (1 kun). Bu buyruq FAQAT
status='trial' obunalarni yangilaydi: expires_at = started_at + FREE_TRIAL_DAYS.
To'lov qilgan (active/expired/canceled) obunalarga TEGMAYDI.

Ishlatish:
    python manage.py set_trial_1day            # o'zgarishni ko'rsatadi (dry-run)
    python manage.py set_trial_1day --apply    # haqiqatan yozadi
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.billing.models import Subscription, SubscriptionStatus, free_trial_days


class Command(BaseCommand):
    help = "Mavjud trial obunalarni FREE_TRIAL_DAYS (1 kun) muddatiga qisqartiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Haqiqatan yozish. Berilmasa faqat ko'rsatadi (dry-run).",
        )

    def handle(self, *args, **options):
        days = free_trial_days()
        apply = options["apply"]
        now = timezone.now()

        trials = Subscription.objects.filter(status=SubscriptionStatus.TRIAL)
        total = trials.count()
        self.stdout.write(f"Trial obunalar: {total} ta. Yangi muddat: {days} kun.")

        changed = 0
        for sub in trials:
            new_expires = sub.started_at + timedelta(days=days)
            if abs((sub.expires_at - new_expires).total_seconds()) < 1:
                continue  # allaqachon to'g'ri
            changed += 1
            state = "MUDDATI TUGAGAN" if new_expires <= now else "faol"
            self.stdout.write(
                f"  #{sub.id} {sub.user.phone}: "
                f"{sub.expires_at:%Y-%m-%d %H:%M} -> {new_expires:%Y-%m-%d %H:%M} ({state})"
            )
            if apply:
                sub.expires_at = new_expires
                sub.save(update_fields=["expires_at"])

        if apply:
            self.stdout.write(self.style.SUCCESS(f"Bajarildi: {changed} ta obuna yangilandi."))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY-RUN: {changed} ta o'zgaradi. Yozish uchun: "
                    f"python manage.py set_trial_1day --apply"
                )
            )
