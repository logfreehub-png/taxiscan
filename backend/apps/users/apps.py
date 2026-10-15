from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = "Foydalanuvchilar"

    def ready(self):
        # Python 3.14 + Django 5.1 admin (template Context) mosligini tuzatish
        from .py314_compat import apply as apply_py314_compat
        apply_py314_compat()
