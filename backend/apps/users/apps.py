from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = "Foydalanuvchilar"

    def ready(self):
        # Python 3.14 + Django 5.1 admin (template Context) mosligini tuzatish
        from .py314_compat import apply as apply_py314_compat
        apply_py314_compat()

        import os
        import sys
        import threading
        # Faqat runserver ishlayotganda va asosiy child processda botni orqa fonda yurgizish
        if "runserver" in sys.argv and os.environ.get("RUN_MAIN") == "true":
            try:
                from .telegram_bot import start_bot_polling
                t = threading.Thread(target=start_bot_polling, daemon=True, name="TelegramBotPolling")
                t.start()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Telegram botni ishga tushirib bo'lmadi: %s", e)
