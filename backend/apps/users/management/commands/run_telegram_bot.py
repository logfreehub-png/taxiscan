from django.core.management.base import BaseCommand
from apps.users.telegram_bot import start_bot_polling


class Command(BaseCommand):
    help = "TaxiScan Telegram tasdiqlash botini ishga tushirish (polling rejimida)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Telegram bot ishga tushmoqda..."))
        try:
            start_bot_polling()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Telegram bot to'xtatildi."))
