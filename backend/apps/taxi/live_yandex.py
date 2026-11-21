"""Yandex Go real narxi — telefon servisidan (deploy/yandex_probe/server.py).

aggregate_estimates() buni OSRM bilan parallel chaqiradi. Servis o'chiq, band
yoki sekin bo'lsa None qaytadi va Yandex narxi formula bilan hisoblanadi.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Yandex ilovasidagi tarif nomi -> TaxiService.tier
TIER_BY_TARIFF = {
    "start": "econom",
    "ekonom": "econom",
    "econom": "econom",
    "komfort": "comfort",
    "comfort": "comfort",
    "komfort+": "comfort_plus",
    "comfort+": "comfort_plus",
    "biznes": "business",
    "business": "business",
}

YANDEX_CODE_PREFIX = "yandex_go__"


def is_enabled() -> bool:
    return bool(settings.YANDEX_LIVE_URL and settings.YANDEX_LIVE_KEY)


def is_yandex_service(service) -> bool:
    return service.code.startswith(YANDEX_CODE_PREFIX)


def fetch_quote(start_lat, start_lng, end_lat, end_lng) -> dict | None:
    """Servisdan real narx. Xatoda None (sababi logga yoziladi)."""
    if not is_enabled():
        return None
    try:
        resp = requests.post(
            f"{settings.YANDEX_LIVE_URL}/v1/quote",
            json={
                "start_lat": start_lat, "start_lng": start_lng,
                "end_lat": end_lat, "end_lng": end_lng,
            },
            headers={"X-Api-Key": settings.YANDEX_LIVE_KEY},
            timeout=(5, settings.YANDEX_LIVE_TIMEOUT),
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Yandex live servisi javob bermadi: %s", exc)
        return None
    if resp.status_code != 200 or not data.get("ok"):
        logger.warning("Yandex live xato %s: %s %s", resp.status_code,
                       data.get("error"), data.get("message"))
        return None
    return data


def prices_by_tier(quote: dict) -> dict[str, int]:
    """{"econom": 22000, "comfort": 25000, ...} — tanilmagan tariflar tashlab ketiladi."""
    out = {}
    for t in quote.get("tariffs") or []:
        tier = TIER_BY_TARIFF.get(str(t.get("tariff", "")).strip().lower())
        price = t.get("price")
        if tier and isinstance(price, int) and price > 0 and tier not in out:
            out[tier] = price
    return out


def final_tier_prices(live_prices: dict[str, int],
                      formula_prices: dict[str, int]) -> dict[str, tuple[int, str]]:
    """Yandex tariflari uchun yakuniy narx: {tier: (narx, source)}.

    * ekrandan o'qilgan tarif -> (real narx, "live")
    * o'qilmagan tarif -> formula × (real/formula o'rtacha nisbati), "live_est"
      — aks holda formuladagi Business real Start'dan arzon chiqib qolishi mumkin.
    Real narx umuman bo'lmasa — bo'sh dict (formula o'zgarmaydi).
    """
    if not live_prices:
        return {}
    ratios = sorted(
        live_prices[t] / formula_prices[t]
        for t in live_prices if formula_prices.get(t)
    )
    ratio = ratios[len(ratios) // 2] if ratios else None
    out = {}
    for tier, f_price in formula_prices.items():
        if tier in live_prices:
            out[tier] = (live_prices[tier], "live")
        elif ratio:
            out[tier] = (int(round(f_price * ratio / 100) * 100), "live_est")
    return out
