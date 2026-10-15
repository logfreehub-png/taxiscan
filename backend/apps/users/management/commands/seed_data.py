"""
Boshlang'ich ma'lumotlarni tayyorlash.

- Demo admin foydalanuvchi: +998900000000 / admin12345
- Agar fake foydalanuvchilar yo'q bo'lsa, bir nechta sintetik user yaratadi.

Idempotent: bir necha marta ishga tushirsa ham xato bermaydi, demo admin
paroli har safar to'g'rilanadi.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model

User = get_user_model()

DEMO_PHONE = "+998900000000"
DEMO_PASSWORD = "admin12345"


class Command(BaseCommand):
    help = "Demo admin va sintetik foydalanuvchilarni tayyorlaydi"

    def handle(self, *args, **opts):
        # 0) Taxi xizmatlari + tariflar + tumanlar (real Yandex narxlariga kalibrlangan)
        self.stdout.write("Taxi xizmatlari va tariflar seed qilinmoqda...")
        call_command("seed_taxi")

        # 1) Demo admin
        user, created = User.objects.get_or_create(
            phone=DEMO_PHONE,
            defaults={
                "username": DEMO_PHONE,
                "role": "admin",
                "first_name": "Demo",
                "last_name": "Admin",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "profile_completed": True,
            },
        )
        # Mavjud bo'lsa ham — to'g'ri holatga keltiramiz
        user.role = "admin"
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        if not user.username:
            user.username = DEMO_PHONE
        user.set_password(DEMO_PASSWORD)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(
                f"Demo admin yaratildi: {DEMO_PHONE} / {DEMO_PASSWORD}"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Demo admin yangilandi: {DEMO_PHONE} / {DEMO_PASSWORD}"
            ))

        # 2) Sintetik foydalanuvchilar (faqat birinchi marta)
        if User.objects.filter(username__startswith="seed_").count() == 0:
            self.stdout.write("Sintetik foydalanuvchilar yaratilmoqda...")
            call_command("seed_users", count=50)
        else:
            self.stdout.write("Sintetik foydalanuvchilar allaqachon mavjud, o'tkazib yuborildi")
