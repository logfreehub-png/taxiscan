"""Yandex Go real narxi — telefon servisidan (deploy/yandex_probe/server.py).

aggregate_estimates() buni OSRM bilan parallel chaqiradi. Servis o'chiq, band
yoki sekin bo'lsa None qaytadi va Yandex narxi formula bilan hisoblanadi.
"""
import hashlib
import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Probe servisi beradigan kanonik kod -> TaxiService.tier
TIER_BY_CODE = {
    "start": "econom",
    "comfort": "comfort",
    "comfort_plus": "comfort_plus",
    "business": "business",
}
# Zaxira: kod kelmasa, tarif nomi bo'yicha (ilova tili uz / en / ru bo'lishi mumkin)
TIER_BY_TARIFF = {
    "start": "econom", "старт": "econom", "ekonom": "econom", "econom": "econom",
    "komfort": "comfort", "comfort": "comfort", "комфорт": "comfort",
    "komfort+": "comfort_plus", "comfort+": "comfort_plus", "комфорт+": "comfort_plus",
    "biznes": "business", "business": "business", "бизнес": "business",
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


def get_quote(searcher_key, start_lat, start_lng, end_lat, end_lng) -> dict | None:
    """Telefonga bitta qidiruv uchun BIR MARTA murojaat qiladi.

    Mobil ilova har 15 soniyada /taxi/estimate/ ni qayta yuboradi. Shu
    foydalanuvchi + shu marshrut uchun olingan real narx YANDEX_LIVE_REUSE_SECONDS
    davomida qayta ishlatiladi — telefon har 15 soniyada band qilinmaydi.
    Muvaffaqiyatsiz urinish ham YANDEX_LIVE_FAIL_SECONDS ga eslab qolinadi
    (aks holda har yangilanishda telefon 30 s kutib qolardi).
    """
    if not is_enabled():
        return None
    route = ",".join(f"{x:.4f}" for x in (start_lat, start_lng, end_lat, end_lng))
    key = "ylive:" + hashlib.sha1(f"{searcher_key or ''}|{route}".encode()).hexdigest()
    hit = cache.get(key)
    if hit == "fail":
        return None
    if hit:
        return {**hit, "cached": True}  # ML arxiviga qayta yozilmaydi
    quote = fetch_quote(start_lat, start_lng, end_lat, end_lng)
    if quote:
        cache.set(key, quote, settings.YANDEX_LIVE_REUSE_SECONDS)
    else:
        cache.set(key, "fail", settings.YANDEX_LIVE_FAIL_SECONDS)
    return quote


def prices_by_tier(quote: dict) -> dict[str, int]:
    """{"econom": 22000, "comfort": 25000, ...} — tanilmagan tariflar tashlab ketiladi."""
    out = {}
    for t in quote.get("tariffs") or []:
        tier = (TIER_BY_CODE.get(t.get("code") or "")
                or TIER_BY_TARIFF.get(str(t.get("tariff", "")).strip().lower()))
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
