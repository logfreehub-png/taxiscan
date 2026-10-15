"""Bildirishnoma, SMS va push yuborish yordamchilari.

- In-app bildirishnoma: doim yaratiladi (Notification).
- SMS: `send_sms` — hozircha konsolga (provayder ulash joyi tayyor).
- Push (telefon, ilova yopiq bo'lsa): `send_push` — Expo push API orqali.
"""
import json
import logging
import urllib.request

from django.contrib.auth import get_user_model

from .models import Notification, NotificationKind

logger = logging.getLogger("taxinarx.notify")
User = get_user_model()

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def ws_push(user_id, payload):
    """Yangi bildirishnomani foydalanuvchining WebSocket guruhiga real-time yuboradi."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f"notif_{user_id}", {"type": "notify.message", "data": payload}
        )
    except Exception as e:  # noqa
        logger.warning("WS push xato: %s", e)


def _payload(obj_or_dict):
    o = obj_or_dict
    if isinstance(o, dict):
        return o
    return {
        "id": o.id,
        "kind": o.kind,
        "title": o.title,
        "preview": o.preview,
        "body": o.body,
        "is_read": o.is_read,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def send_sms(phone: str, text: str) -> bool:
    """SMS yuboradi. Hozircha konsolga yozadi (provayder ulanmagan).

    Provayder (Eskiz/Play Mobile) ulansa shu yerga API chaqiruvini qo'shing.
    """
    logger.info("[SMS] %s -> %s", phone, text)
    print(f"[SMS] {phone}: {text}")
    return True


def send_push(token: str, title: str, body: str) -> bool:
    """Expo push API orqali telefon bildirishnomasini yuboradi (ilova yopiq bo'lsa ham)."""
    if not token:
        return False
    try:
        payload = json.dumps({
            "to": token, "title": title, "body": body, "sound": "default", "priority": "high",
        }).encode()
        req = urllib.request.Request(
            EXPO_PUSH_URL, data=payload,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        urllib.request.urlopen(req, timeout=8).read()
        return True
    except Exception as e:  # noqa
        logger.warning("Push yuborilmadi: %s", e)
        return False


def _sms_text(title, preview, body):
    parts = [title, preview or body]
    return ". ".join([p for p in parts if p]).strip()


def notify(user, title, preview="", body="", kind=NotificationKind.INFO, dedup_key="", sms=False, push=True, batch=None):
    """Bitta foydalanuvchiga bildirishnoma yaratadi (ixtiyoriy SMS + push)."""
    if dedup_key and Notification.objects.filter(user=user, dedup_key=dedup_key).exists():
        return None
    sent = False
    if sms and getattr(user, "phone", None):
        sent = send_sms(user.phone, _sms_text(title, preview, body))
    if push and getattr(user, "expo_push_token", ""):
        send_push(user.expo_push_token, title, preview or body)
    obj = Notification.objects.create(
        user=user, title=title, preview=preview, body=body, kind=kind,
        dedup_key=dedup_key, sent_sms=sent, batch=batch,
    )
    ws_push(user.id, _payload(obj))  # real-time
    return obj


def broadcast(title, preview="", body="", kind=NotificationKind.ADMIN, roles=None, sms=False, push=True, batch=None):
    """Barcha (yoki tanlangan rollardagi) foydalanuvchilarga bildirishnoma yuboradi."""
    qs = User.objects.all()
    if roles:
        qs = qs.filter(role__in=roles)
    objs = []
    for u in qs.iterator():
        if sms and u.phone:
            send_sms(u.phone, _sms_text(title, preview, body))
        if push and getattr(u, "expo_push_token", ""):
            send_push(u.expo_push_token, title, preview or body)
        objs.append(Notification(user=u, title=title, preview=preview, body=body, kind=kind, sent_sms=sms, batch=batch))
    created = Notification.objects.bulk_create(objs, batch_size=500)
    # Real-time: har bir foydalanuvchiga WS orqali yuboramiz
    for o in created:
        ws_push(o.user_id, _payload(o))
    return len(objs)
