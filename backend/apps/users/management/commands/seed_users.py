"""
Sintetik foydalanuvchilarni yaratish (admin paneldagi statistika uchun).
Hammasi uchun parol: nimadir1

Har xil holatlar:
- 40% to'liq malumotli (profile_completed=True, ism+familiya+yosh+jins)
- 30% qisman to'liq (faqat ism+familiya)
- 30% to'liq emas (faqat telefon)
- Har xil aktivlik darajalari (oxirgi 1-30 kun ichida)
- Ba'zilarda kartalar va tranzaksiyalar bor
"""
import os
import random
from datetime import timedelta, date
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from apps.users.models import UserSession
from apps.billing.models import Subscription, SubscriptionStatus, Card, Transaction, TransactionStatus

User = get_user_model()

FIRST_NAMES_M = ["Ali", "Aziz", "Bobur", "Dilshod", "Elyor", "Farrux", "Hasan", "Jasur",
                 "Kamol", "Malik", "Nodir", "Otabek", "Rustam", "Sardor", "Sherzod",
                 "Temur", "Umid", "Vali", "Yusuf", "Zafar", "Bekzod", "Olim", "Sanjar"]
FIRST_NAMES_F = ["Aziza", "Dilnoza", "Elnora", "Gulnoza", "Iroda", "Kamola", "Madina",
                 "Nilufar", "Oygul", "Rayhona", "Sevara", "Shahnoza", "Yulduz", "Zarina",
                 "Charos", "Dilfuza", "Mahliyo", "Nargiza", "Sabina"]
LAST_NAMES = ["Karimov", "Tursunov", "Rahimov", "Yusupov", "Saidov", "Ergashev",
              "Nazarov", "Toshev", "Mirzayev", "Aliyev", "Hamidov", "Ismoilov",
              "Olimov", "Shukurov", "Latifov", "Mahmudov", "Salimov", "Yuldoshev",
              "Mansurov", "Komilov", "Pulatov", "Sharipov", "Toshpolatov"]

CITIES = ["Tashkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg'ona"]

CARD_TYPES = ["uzcard", "humo", "visa", "mastercard"]


def random_phone(used):
    """+998 9X XXX XX XX format, used set ichida bo'lmagan."""
    while True:
        p = f"+998{random.choice(['90','91','93','94','97','98','99','88'])}{random.randint(1000000, 9999999)}"
        if p not in used:
            used.add(p)
            return p


def random_dob(min_age=18, max_age=55):
    today = date.today()
    age = random.randint(min_age, max_age)
    year = today.year - age
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return date(year, month, day)


def create_random_sessions(user, days_back, sessions_per_day=(1, 4)):
    """Foydalanuvchi uchun sun'iy sessiyalar yaratish."""
    now = timezone.now()
    total_secs = 0
    for d in range(days_back):
        day = now - timedelta(days=d, hours=random.randint(0, 23), minutes=random.randint(0, 59))
        if random.random() < 0.6:  # 60% kun aktiv
            for _ in range(random.randint(*sessions_per_day)):
                duration = random.randint(60, 1800)  # 1-30 daqiqa
                sess_time = day - timedelta(hours=random.randint(0, 5))
                UserSession.objects.create(
                    user=user,
                    started_at=sess_time,
                    last_heartbeat=sess_time + timedelta(seconds=duration),
                    duration_seconds=duration,
                    ip_address="127.0.0.1",
                    user_agent="seed",
                )
                total_secs += duration
    user.total_seconds_active = total_secs
    if user.sessions.exists():
        user.last_seen = user.sessions.order_by("-last_heartbeat").first().last_heartbeat
    user.save(update_fields=["total_seconds_active", "last_seen"])


class Command(BaseCommand):
    help = "Sintetik foydalanuvchilar yaratish (passenger va driver)"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=50)
        parser.add_argument("--clear", action="store_true", help="Mavjud fake user'larni o'chirish")
        parser.add_argument("--password", type=str, default="nimadir1")

    def handle(self, *args, **opts):
        count = opts["count"]
        password = opts["password"]

        if opts["clear"]:
            # Faqat seed orqali yaratilganlarni o'chirish (username "seed_" bilan boshlanadi)
            n = User.objects.filter(username__startswith="seed_").delete()[0]
            self.stdout.write(f"Eski seed user'lar o'chirildi: {n}")

        used_phones = set(User.objects.values_list("phone", flat=True))
        created = 0

        with transaction.atomic():
            for i in range(count):
                phone = random_phone(used_phones)
                role = random.choices(["passenger", "driver"], weights=[70, 30])[0]
                gender = random.choice(["male", "female"])
                fn = random.choice(FIRST_NAMES_M if gender == "male" else FIRST_NAMES_F)
                ln = random.choice(LAST_NAMES) + ("a" if gender == "female" else "")

                # Profile holati: 40% to'liq, 30% qisman, 30% bo'sh
                profile_state = random.choices(
                    ["full", "partial", "empty"], weights=[40, 30, 30]
                )[0]

                user = User(
                    phone=phone,
                    username=f"seed_{phone.replace('+', '')}_{i}",
                    role=role,
                    city=random.choice(CITIES),
                )

                if profile_state == "full":
                    user.first_name = fn
                    user.last_name = ln
                    user.date_of_birth = random_dob()
                    user.gender = gender
                    user.profile_completed = True
                elif profile_state == "partial":
                    user.first_name = fn
                    user.last_name = ln
                    user.profile_completed = False
                else:
                    user.profile_completed = False

                # Yaratilgan vaqt: oxirgi 60 kun ichida tasodifiy
                days_ago = random.randint(0, 60)
                user.date_joined = timezone.now() - timedelta(days=days_ago)
                user.set_password(password)
                user.save()

                # Subscription
                if profile_state != "empty" and random.random() < 0.7:
                    if random.random() < 0.4:
                        # Aktiv obuna
                        Subscription.objects.create(
                            user=user,
                            status=SubscriptionStatus.ACTIVE,
                            started_at=user.date_joined,
                            expires_at=timezone.now() + timedelta(days=random.randint(1, 30)),
                            auto_renew=True,
                        )
                    else:
                        # Trial
                        trial_end = user.date_joined + timedelta(days=7)
                        Subscription.objects.create(
                            user=user,
                            status=SubscriptionStatus.TRIAL if trial_end > timezone.now() else SubscriptionStatus.EXPIRED,
                            started_at=user.date_joined,
                            expires_at=trial_end,
                            auto_renew=False,
                        )

                # Karta (60% to'liq profile'da)
                if profile_state == "full" and random.random() < 0.6:
                    ct = random.choice(CARD_TYPES)
                    last4 = f"{random.randint(0, 9999):04d}"
                    Card.objects.create(
                        user=user,
                        card_type=ct,
                        holder_name=f"{fn.upper()} {ln.upper()}",
                        card_last4=last4,
                        expiry_month=random.randint(1, 12),
                        expiry_year=random.randint(2026, 2030),
                        is_default=True,
                        token=f"tok_{random.randint(10000, 99999)}",
                    )
                    user.has_card = True
                    user.card_last4 = last4
                    user.save(update_fields=["has_card", "card_last4"])

                    # Tranzaksiyalar
                    for _ in range(random.randint(0, 8)):
                        status = random.choices(
                            ["success", "failed", "pending", "refunded"],
                            weights=[75, 15, 5, 5],
                        )[0]
                        Transaction.objects.create(
                            user=user,
                            amount_usd=1.00,
                            amount_uzs=12500,
                            status=status,
                            card_last4=last4,
                            description="Oylik obuna" if status == "success" else "To'lov urinishi",
                            error_message="Mablag' yetarli emas" if status == "failed" else "",
                            external_id=f"txn_{random.randint(100000, 999999)}",
                            created_at=user.date_joined + timedelta(
                                days=random.randint(0, max(1, days_ago))
                            ),
                        )

                # Sessiyalar - tasodifiy aktivlik (profile to'liq bo'lganlar ko'p kiradi)
                if profile_state == "full":
                    create_random_sessions(user, days_back=min(30, days_ago + 1),
                                           sessions_per_day=(1, 5))
                elif profile_state == "partial":
                    create_random_sessions(user, days_back=min(14, days_ago + 1),
                                           sessions_per_day=(1, 2))
                # 'empty' uchun sessiya yo'q

                created += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n{created} ta sintetik foydalanuvchi yaratildi"
        ))
        self.stdout.write(f"Hammasining paroli: {password}")
        self.stdout.write("Telefonlarini admin paneldan ko'rishingiz mumkin")
