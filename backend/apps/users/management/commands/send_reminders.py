"""Eslatmalarni yuborish — cron orqali chaqiriladi.

Misollar (Windows Task Scheduler yoki Linux cron):
  # Ertalab 08:00
  python manage.py send_reminders --ride ertalab
  # Kechqurun 18:00
  python manage.py send_reminders --ride kechqurun
  # Har kuni 1 marta — faolsizlik + obuna eslatmalari
  python manage.py send_reminders --inactivity --subscriptions
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.users import reminders

User = get_user_model()


class Command(BaseCommand):
    help = "Foydalanuvchilarga eslatma bildirishnomalarini yuboradi"

    def add_arguments(self, parser):
        parser.add_argument("--ride", type=str, default="", help="ertalab|kechqurun — taksi eslatmasi")
        parser.add_argument("--inactivity", action="store_true", help="1 kun kirmaganlarga eslatma")
        parser.add_argument("--subscriptions", action="store_true", help="Obuna tugashi eslatmalari")
        parser.add_argument("--promo", action="store_true", help="Premium olmaganlarga obuna taklifi")

    def handle(self, *args, **opts):
        if opts["ride"]:
            n = reminders.send_daily_ride_prompt(opts["ride"])
            self.stdout.write(self.style.SUCCESS(f"Taksi eslatmasi: {n} ta yuborildi"))
        if opts["inactivity"]:
            n = reminders.send_inactivity_prompts()
            self.stdout.write(self.style.SUCCESS(f"Faolsizlik eslatmasi: {n} ta yuborildi"))
        if opts["promo"]:
            n = reminders.send_subscription_promo()
            self.stdout.write(self.style.SUCCESS(f"Obuna taklifi: {n} ta yuborildi"))
        if opts["subscriptions"]:
            n = 0
            for u in User.objects.select_related("subscription").iterator():
                before = u.notifications.count()
                reminders.ensure_subscription_reminders(u)
                if u.notifications.count() > before:
                    n += 1
            self.stdout.write(self.style.SUCCESS(f"Obuna eslatmasi: {n} ta yuborildi"))
        if not (opts["ride"] or opts["inactivity"] or opts["subscriptions"] or opts["promo"]):
            self.stdout.write("Hech narsa tanlanmadi. --ride / --inactivity / --subscriptions / --promo bering.")
