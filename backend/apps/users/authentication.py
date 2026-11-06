"""
Qurilma sessiyasiga bog'langan JWT autentifikatsiya.

- Token ichida `sid` bo'ladi (DeviceSession.sid).
- Sessiya bekor qilingan bo'lsa (boshqa qurilmadan kirilgan / logout) — 401
  `code="session_revoked"` qaytadi va ilova foydalanuvchini chiqarib yuboradi.
- `sid`siz eski tokenlar: agar foydalanuvchida yangi tizimdagi aktiv sessiya
  bo'lsa — rad etiladi (bitta qurilma qoidasi), aks holda qabul qilinadi
  (yangilanishdan oldin kirganlar birdaniga chiqib ketmasligi uchun).
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DeviceSession

LAST_SEEN_THROTTLE = timedelta(minutes=5)


REVOKED_MSG = "Akkauntingizga boshqa qurilmadan kirildi. Bu qurilmadan chiqarildingiz."


def SessionRevoked():
    # Javob: {"detail": "...", "code": "session_revoked"} — ilova shu kod bo'yicha chiqarib yuboradi
    return exceptions.AuthenticationFailed({"detail": REVOKED_MSG, "code": "session_revoked"})


class SessionJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        sid = validated_token.get("sid")

        if not sid:
            if DeviceSession.objects.filter(user=user, revoked_at__isnull=True).exists():
                raise SessionRevoked()
            return user

        sess = DeviceSession.objects.filter(sid=sid, user=user).first()
        if not sess or sess.revoked_at is not None:
            raise SessionRevoked()

        now = timezone.now()
        if now - sess.last_seen > LAST_SEEN_THROTTLE:
            DeviceSession.objects.filter(pk=sess.pk).update(last_seen=now)
        return user


def client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def is_single_device_exempt(user) -> bool:
    """Adminlar bir nechta qurilmadan (web + telefon) ishlay oladi."""
    return bool(user.is_superuser or user.role == "admin")


def active_other_session(user, device_id: str):
    """Boshqa qurilmadagi aktiv sessiya (bo'lsa)."""
    qs = DeviceSession.objects.filter(user=user, revoked_at__isnull=True)
    if device_id:
        qs = qs.exclude(device_id=device_id)
    return qs.order_by("-last_seen").first()


def revoke_sessions(user, reason: str, exclude_device_id: str | None = None):
    qs = DeviceSession.objects.filter(user=user, revoked_at__isnull=True)
    if exclude_device_id:
        qs = qs.exclude(device_id=exclude_device_id)
    return qs.update(revoked_at=timezone.now(), revoke_reason=reason)


def issue_tokens(
    user, request, device_id: str = "", device_name: str = "",
    create_session_without_device: bool = True,
) -> dict:
    """Yangi qurilma sessiyasini ochib, shu sessiyaga bog'langan token qaytaradi.

    Shu qurilmaning (device_id) eski sessiyalari yopiladi; boshqa qurilmalarniki
    — chaqiruvchi tomonidan oldindan hal qilinadi.
    """
    device_id = (device_id or "")[:100]
    if device_id:
        # Shu qurilmadan qayta kirildi — uning eski sessiyasi kerak emas
        revoke_sessions_for_device(user, device_id)
    elif not create_session_without_device:
        # Qurilma ID'siz (masalan ro'yxatdan o'tish javobi) — sessiyasiz oddiy token
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["phone"] = user.phone
        return {"access": str(refresh.access_token), "refresh": str(refresh), "sid": None}

    sess = DeviceSession.objects.create(
        user=user,
        device_id=device_id,
        device_name=(device_name or "")[:150],
        ip_address=client_ip(request),
    )
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["phone"] = user.phone
    refresh["sid"] = str(sess.sid)
    access = refresh.access_token
    return {"access": str(access), "refresh": str(refresh), "sid": str(sess.sid)}


def revoke_sessions_for_device(user, device_id: str):
    DeviceSession.objects.filter(
        user=user, device_id=device_id, revoked_at__isnull=True
    ).update(revoked_at=timezone.now(), revoke_reason="relogin")
