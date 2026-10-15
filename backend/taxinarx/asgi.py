import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "taxinarx.settings")

from django.core.asgi import get_asgi_application

# Django'ni avval ishga tushiramiz (app registry tayyor bo'lishi uchun)
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter

from apps.users.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(websocket_urlpatterns),
})
