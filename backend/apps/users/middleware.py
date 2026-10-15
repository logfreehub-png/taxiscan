"""
Foydalanuvchi aktivligini kuzatish.
- Har request'da `last_seen` yangilanadi.
- Agar oxirgi sessiyadan 5 daqiqadan kam vaqt o'tgan bo'lsa - o'sha sessiya davom ettiriladi.
- Aks holda yangi sessiya boshlanadi.
"""
from datetime import timedelta
from django.utils import timezone

# Heartbeat oralig'i - bu vaqt ichida bo'lgan so'rovlar bitta sessiya hisoblanadi
SESSION_GAP_SECONDS = 5 * 60  # 5 daqiqa


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class ActivityTrackingMiddleware:
    """Authenticated user'lar uchun last_seen va sessiya kuzatuvi."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            user = getattr(request, "user", None)
            if user and user.is_authenticated:
                self._track(user, request)
        except Exception:
            # Aktivlik kuzatuvida xato — asosiy oqimni buzmaymiz
            pass
        return response

    def _track(self, user, request):
        from .models import UserSession  # local import - migration paytida muammoga tushmaslik uchun

        now = timezone.now()
        recent_cutoff = now - timedelta(seconds=SESSION_GAP_SECONDS)

        # Aktiv sessiya bormi (oxirgi heartbeat'i yaqinda)?
        sess = (
            UserSession.objects
            .filter(user=user, last_heartbeat__gte=recent_cutoff)
            .order_by("-last_heartbeat")
            .first()
        )

        if sess:
            # Sessiya davom etmoqda - heartbeat va duration yangilash
            old_heartbeat = sess.last_heartbeat
            sess.last_heartbeat = now
            delta = (now - old_heartbeat).total_seconds()
            sess.duration_seconds += int(max(0, min(delta, SESSION_GAP_SECONDS)))
            sess.save(update_fields=["last_heartbeat", "duration_seconds"])

            # Userning umumiy aktivligi
            user.total_seconds_active += int(max(0, min(delta, SESSION_GAP_SECONDS)))
            user.last_seen = now
            user.save(update_fields=["total_seconds_active", "last_seen"])
        else:
            # Yangi sessiya
            UserSession.objects.create(
                user=user,
                duration_seconds=0,
                ip_address=_client_ip(request),
                user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
            )
            user.last_seen = now
            user.save(update_fields=["last_seen"])
