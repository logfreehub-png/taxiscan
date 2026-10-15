import os
import threading
import time
from django.apps import AppConfig


class TaxiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.taxi"
    verbose_name = "Taxi xizmatlari"

    def ready(self):
        # Faqat asosiy runserver jarayonida ishga tushiring (autoreload child).
        # Migrations va boshqa management buyruqlar uchun emas.
        if os.environ.get("RUN_MAIN") != "true":
            return
        if os.environ.get("TAXINARX_STATS_TICK", "1") != "1":
            return

        def _loop():
            # Boshlanishidan oldin biroz kutamiz (DB tayyor bo'lsin)
            time.sleep(5)
            from django.core.management import call_command
            while True:
                try:
                    call_command("tick_stats")
                except Exception as e:
                    print(f"[tick_stats] xato: {e}")
                time.sleep(60)

        t = threading.Thread(target=_loop, daemon=True, name="stats-tick")
        t.start()
