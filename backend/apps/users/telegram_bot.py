import logging
import random
import re
import time
import requests
from django.conf import settings
from django.utils import timezone
from .models import PhoneVerification, PhoneVerificationPurpose

logger = logging.getLogger(__name__)

BOT_TOKEN = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
BOT_USERNAME = getattr(settings, "TELEGRAM_BOT_USERNAME", "TaxiScan_auth_bot")
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"


def normalize_phone(phone: str) -> str:
    """Telefon raqamni xalqaro standart formatga keltiradi (+998901234567)."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("998"):
        return f"+{digits}"
    elif len(digits) == 9:
        return f"+998{digits}"
    return f"+{digits}" if not phone.startswith("+") else phone


def send_telegram_message(chat_id: int, text: str, reply_markup=None) -> bool:
    """Telegram bot orqali xabar yuborish."""
    url = f"{API_URL}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        resp = requests.post(url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"Telegram sendMessage xatosi: {e}")
        return False


def handle_telegram_update(update: dict):
    """Bitta Telegram update'ni qayta ishlash."""
    message = update.get("message")
    if not message:
        return

    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from", {})
    user_id = from_user.get("id")
    username = from_user.get("username", "")
    text = (message.get("text") or "").strip()
    contact = message.get("contact")

    # 1. Kontakt ulashilganda
    if contact:
        contact_phone = normalize_phone(contact.get("phone_number", ""))
        contact_user_id = contact.get("user_id")

        # Telegram o'z raqamini yuborganini tekshirish (xavfsizlik uchun)
        if contact_user_id and contact_user_id != user_id:
            send_telegram_message(
                chat_id,
                "⚠️ <b>Iltimos, faqat o'zingizning telefon raqamingizni ulashing!</b>\n"
                "Boshqa shaxsning kontaktini qabul qilib bo'lmaydi.",
            )
            return

        # Ushbu telefon raqam uchun tasdiqlanmagan eng so'nggi sessiyani qidiramiz
        now = timezone.now()
        pv = (
            PhoneVerification.objects.filter(
                phone=contact_phone,
                is_verified=False,
                expires_at__gt=now,
            )
            .order_by("-created_at")
            .first()
        )

        if not pv:
            # Agar mavjud sessiya bo'lmasa, yangi tasdiqlash sessiyasi yaratamiz
            code = f"{random.randint(100000, 999999)}"
            pv = PhoneVerification.objects.create(
                phone=contact_phone,
                code=code,
                purpose=PhoneVerificationPurpose.REGISTER,
                telegram_user_id=user_id,
                telegram_username=username,
                is_verified=True,
                verified_at=now,
                expires_at=now + timezone.timedelta(minutes=15),
            )
        else:
            pv.is_verified = True
            pv.verified_at = now
            pv.telegram_user_id = user_id
            pv.telegram_username = username
            pv.save(update_fields=["is_verified", "verified_at", "telegram_user_id", "telegram_username"])

        reply_markup = {"remove_keyboard": True}
        msg = (
            "✅ <b>Telefon raqamingiz muvaffaqiyatli tasdiqlandi!</b>\n\n"
            f"Sizning TaxiScan tasdiqlash kodingiz:\n"
            f"👉 <code>{pv.code}</code> 👈\n\n"
            "📲 <i>Ilovaga qayting — tizim avtomatik tasdiqlaydi yoki yuqoridagi kodni kiriting.</i>"
        )
        send_telegram_message(chat_id, msg, reply_markup=reply_markup)
        return

    # 2. /start buyrug'i kelganda
    if text.startswith("/start"):
        session_code = text.replace("/start", "").strip()
        # Agar start auth_<session_id> bo'lsa
        if session_code.startswith("auth_"):
            session_code = session_code.replace("auth_", "").strip()

        welcome_text = (
            "🚕 <b>TaxiScan — Toshkent taksi xizmatlari</b>\n\n"
            "Assalomu alaykum! Ilovada telefon raqamingizni tasdiqlash uchun "
            "pastdagi <b>«📱 Telefon raqamni ulashish»</b> tugmasini bosing:"
        )

        reply_markup = {
            "keyboard": [
                [
                    {
                        "text": "📱 Telefon raqamni ulashish",
                        "request_contact": True,
                    }
                ]
            ],
            "resize_keyboard": True,
            "one_time_keyboard": True,
        }
        send_telegram_message(chat_id, welcome_text, reply_markup=reply_markup)
        return

    # 3. Boshqa har qanday xabarga raqamni ulashish tugmasini taklif qilamiz
    default_text = (
        "Telefon raqamingizni tasdiqlash uchun pastdagi "
        "<b>«📱 Telefon raqamni ulashish»</b> tugmasini bosing:"
    )
    reply_markup = {
        "keyboard": [
            [
                {
                    "text": "📱 Telefon raqamni ulashish",
                    "request_contact": True,
                }
            ]
        ],
        "resize_keyboard": True,
        "one_time_keyboard": True,
    }
    send_telegram_message(chat_id, default_text, reply_markup=reply_markup)


def start_bot_polling():
    """Telegram bot long-polling sikli (getUpdates)."""
    offset = 0
    logger.info("TaxiScan Telegram Bot ishga tushdi...")
    print(f"[*] TaxiScan Telegram Bot (@{BOT_USERNAME}) tinglashni boshladi...")

    while True:
        try:
            url = f"{API_URL}/getUpdates"
            params = {"offset": offset, "timeout": 25}
            resp = requests.get(url, params=params, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    for update in data.get("result", []):
                        offset = update["update_id"] + 1
                        try:
                            handle_telegram_update(update)
                        except Exception as ex:
                            logger.error(f"Update qayta ishlashda xatolik: {ex}")
            elif resp.status_code == 409:
                # Boshqa instance ishlayapti, biroz kutamiz
                time.sleep(5)
            else:
                time.sleep(2)
        except requests.exceptions.RequestException:
            time.sleep(3)
        except Exception as e:
            logger.error(f"Bot polling xatosi: {e}")
            time.sleep(3)
