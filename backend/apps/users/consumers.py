"""Real-time bildirishnoma WebSocket consumer.

Ulanish: ws://host:8001/ws/notifications/?token=<JWT access>
Foydalanuvchi `notif_<user_id>` guruhiga qo'shiladi. Backend yangi bildirishnoma
yaratganda shu guruhga `notify.message` yuboradi va mijoz darhol oladi.
"""
import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


@database_sync_to_async
def _user_from_token(token: str):
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model
        data = AccessToken(token)
        return get_user_model().objects.get(id=data["user_id"])
    except Exception:
        return None


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        qs = parse_qs(self.scope.get("query_string", b"").decode())
        token = (qs.get("token") or [""])[0]
        self.user = await _user_from_token(token)
        if not self.user:
            await self.close()
            return
        self.group = f"notif_{self.user.id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if getattr(self, "group", None):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    # Backend channel_layer.group_send(..., {"type": "notify.message", "data": {...}})
    async def notify_message(self, event):
        await self.send(text_data=json.dumps(event["data"]))
