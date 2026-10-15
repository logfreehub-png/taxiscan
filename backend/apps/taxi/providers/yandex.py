"""
Yandex Go va Yango provayderlari.

DIQQAT: Bu klasslar real Yandex API ga ulanish uchun shabloni ko'rsatadi.
Haqiqiy auth token yo'q paytda ular FormulaProvider ga fall back qiladi.
Yandex B2B partnerlik orqali shartnomadan keyin auth yoqing.
"""
import os
import requests
import logging
from .base import EstimateResult
from .formula import FormulaProvider, haversine_km, estimate_duration_min, current_surge

logger = logging.getLogger(__name__)


class _YandexLikeProvider(FormulaProvider):
    """Yandex stack uchun umumiy logika (Yandex Go va Yango)."""

    api_base: str = ""
    auth_env_var: str = ""
    user_agent: str = ""

    def fetch_estimate(self, start_lat, start_lng, end_lat, end_lng, route=None):
        token = os.environ.get(self.auth_env_var)
        if not token:
            # Token yo'q — formula bilan ishlaymiz (route bo'lsa undan)
            return super().fetch_estimate(start_lat, start_lng, end_lat, end_lng, route)

        try:
            payload = {
                "route": [
                    [start_lng, start_lat],
                    [end_lng, end_lat],
                ],
                "format_currency": True,
                "selected_class": "econom",
                "supports_explicit_antisurge": True,
            }
            headers = {
                "Authorization": f"Bearer {token}",
                "User-Agent": self.user_agent,
                "Content-Type": "application/json",
            }
            resp = requests.post(
                f"{self.api_base}/3.0/routestats",
                json=payload,
                headers=headers,
                timeout=8,
            )
            resp.raise_for_status()
            data = resp.json()

            level = (data.get("service_levels") or [{}])[0]
            price_uzs = int(level.get("price_raw") or 0)
            if not price_uzs:
                raise ValueError("Yandex API narxni qaytarmadi")

            distance_km = round(haversine_km(start_lat, start_lng, end_lat, end_lng) * 1.32, 2)
            duration_min = round(estimate_duration_min(distance_km), 1)

            return EstimateResult(
                service_code=self.service.code,
                price_uzs=price_uzs,
                distance_km=distance_km,
                duration_min=duration_min,
                surge=current_surge(),
                source="api",
                raw=data,
            )
        except Exception as exc:
            logger.warning("Yandex API xatolik (%s), formula ga o'tildi: %s", self.service.code, exc)
            return super().fetch_estimate(start_lat, start_lng, end_lat, end_lng, route)


class YandexGoProvider(_YandexLikeProvider):
    code = "yandex_go"
    api_base = "https://taxi.yandex.ru"
    auth_env_var = "YANDEX_GO_TOKEN"
    user_agent = "yandex-taxi/4.99.0.123456 Android/13"


class YangoProvider(_YandexLikeProvider):
    code = "yango"
    api_base = "https://taxi.yandex.com"
    auth_env_var = "YANGO_TOKEN"
    user_agent = "yango/4.99.0.123456 Android/13"
