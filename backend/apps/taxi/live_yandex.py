"""Real taksi narxi (Yandex Go, WB Taxi) — telefon servisidan (deploy/yandex_probe/server.py).

aggregate_estimates() buni OSRM bilan parallel chaqiradi. Servis o'chiq, band
yoki sekin bo'lsa None qaytadi va o'sha brend narxi formula bilan hisoblanadi.
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

# WB Taxi ekranidagi tariflar: Standard / Comfort / Comfort + (Business yo'q)
WB_TIER_BY_CODE = {
    "standard": "econom",
    "comfort": "comfort",
    "comfort_plus": "comfort_plus",
    "business": "business",
}

# provider (probe servisidagi nomi) -> TaxiService.code prefiksi va tarif xaritasi
PROVIDERS = {
    "yandex": {"prefix": YANDEX_CODE_PREFIX, "tiers": TIER_BY_CODE, "names": TIER_BY_TARIFF},
    "wb": {"prefix": "wb_taxi__", "tiers": WB_TIER_BY_CODE, "names": {}},
}


def is_enabled(provider: str = "yandex") -> bool:
    return bool(settings.YANDEX_LIVE_URL and settings.YANDEX_LIVE_KEY
                and provider in settings.YANDEX_LIVE_PROVIDERS)


def provider_of(service) -> str | None:
    """Real narxi telefondan olinadigan brend bo'lsa — provider nomi."""
    for name, meta in PROVIDERS.items():
        if service.code.startswith(meta["prefix"]):
            return name
    return None


def is_yandex_service(service) -> bool:
    return service.code.startswith(YANDEX_CODE_PREFIX)


def fetch_quote(start_lat, start_lng, end_lat, end_lng, provider="yandex") -> dict | None:
    """Servisdan real narx. Xatoda None (sababi logga yoziladi)."""
    if not is_enabled(provider):
        return None
    try:
        resp = requests.post(
            f"{settings.YANDEX_LIVE_URL}/v1/quote",
            json={
                "provider": provider,
                "start_lat": start_lat, "start_lng": start_lng,
                "end_lat": end_lat, "end_lng": end_lng,
            },
            headers={"X-Api-Key": settings.YANDEX_LIVE_KEY},
            # Telefon bitta: WB so'rovi Yandex tugashini navbatda kutadi
            timeout=(5, settings.YANDEX_LIVE_HTTP_TIMEOUT),
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Live %s servisi javob bermadi: %s", provider, exc)
        return None
    if resp.status_code != 200 or not data.get("ok"):
        logger.warning("Live %s xato %s: %s %s", provider, resp.status_code,
                       data.get("error"), data.get("message"))
        return None
    return data


def get_quote(searcher_key, start_lat, start_lng, end_lat, end_lng,
              provider="yandex") -> dict | None:
    """Telefonga bitta qidiruv uchun BIR MARTA murojaat qiladi.

    Mobil ilova har 15 soniyada /taxi/estimate/ ni qayta yuboradi. Shu
    foydalanuvchi + shu marshrut uchun olingan real narx YANDEX_LIVE_REUSE_SECONDS
    davomida qayta ishlatiladi — telefon har 15 soniyada band qilinmaydi.
    Muvaffaqiyatsiz urinish ham YANDEX_LIVE_FAIL_SECONDS ga eslab qolinadi
    (aks holda har yangilanishda telefon 30 s kutib qolardi).
    """
    if not is_enabled(provider):
        return None
    route = ",".join(f"{x:.4f}" for x in (start_lat, start_lng, end_lat, end_lng))
    key = "ylive:" + hashlib.sha1(
        f"{provider}|{searcher_key or ''}|{route}".encode()).hexdigest()
    hit = cache.get(key)
    if hit == "fail":
        return None
    if hit:
        return hit  # ML arxiviga probed_at bo'yicha bir marta yoziladi
    quote = fetch_quote(start_lat, start_lng, end_lat, end_lng, provider)
    if quote:
        cache.set(key, quote, settings.YANDEX_LIVE_REUSE_SECONDS)
    else:
        cache.set(key, "fail", settings.YANDEX_LIVE_FAIL_SECONDS)
    return quote


def prices_by_tier(quote: dict, provider: str = "yandex") -> dict[str, int]:
    """{"econom": 22000, "comfort": 25000, ...} — tanilmagan tariflar tashlab ketiladi."""
    meta = PROVIDERS[provider]
    out = {}
    for t in quote.get("tariffs") or []:
        tier = (meta["tiers"].get(t.get("code") or "")
                or meta["names"].get(str(t.get("tariff", "")).strip().lower()))
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
