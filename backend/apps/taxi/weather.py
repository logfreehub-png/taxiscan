"""Toshkent real-vaqt ob-havosi → narx surge'iga ta'sir.

Manba: Open-Meteo (https://open-meteo.com) — BEPUL, API kalit talab qilmaydi.
Yomg'ir/qor/momaqaldiroq, jazirama issiq yoki qattiq sovuq taksi talabini
oshiradi → surge ko'tariladi (real Yandex "molniya" sabablariga o'xshash).

Natija 10 daqiqaga keshlanadi — har narx so'rovida qayta so'ramaydi.
"""
import time
import logging
import requests

logger = logging.getLogger(__name__)

# Toshkent markazi
_LAT, _LNG = 41.3111, 69.2797
_TTL = 600  # 10 daqiqa kesh
_CACHE = {"ts": 0.0, "data": None}

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def _fetch() -> dict:
    params = {
        "latitude": _LAT,
        "longitude": _LNG,
        "current": "temperature_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m",
        "timezone": "Asia/Tashkent",
    }
    resp = requests.get(OPEN_METEO_URL, params=params, timeout=5)
    resp.raise_for_status()
    return resp.json().get("current", {}) or {}


def get_weather() -> dict:
    """Joriy Toshkent ob-havosi (keshlangan). Xatolikda eski kesh yoki {}."""
    now = time.time()
    if _CACHE["data"] is not None and now - _CACHE["ts"] < _TTL:
        return _CACHE["data"]
    try:
        data = _fetch()
        _CACHE["data"] = data
        _CACHE["ts"] = now
    except Exception as exc:
        logger.warning("Ob-havo olinmadi (%s) — surge'ga ta'sir qilmaydi", exc)
        if _CACHE["data"] is None:
            _CACHE["data"] = {}
    return _CACHE["data"]


def weather_surge() -> tuple[float, str | None, dict]:
    """Ob-havoga qarab surge qo'shimchasi.

    Qaytaradi: (boost, sabab_matni, info).
      boost — 0.0 .. 0.50 oralig'idagi qo'shimcha koeffitsient
      sabab — odam o'qiy oladigan izoh (yoki None)
    """
    w = get_weather()
    if not w:
        return 0.0, None, {}

    code = w.get("weather_code")
    temp = w.get("temperature_2m")
    precip = w.get("precipitation") or 0
    snow = w.get("snowfall") or 0
    wind = w.get("wind_speed_10m") or 0

    boost = 0.0
    reasons: list[str] = []

    # — Yog'ingarchilik (WMO weather_code) —
    if (snow and snow > 0) or code in (71, 73, 75, 77, 85, 86):
        boost += 0.35
        reasons.append("Qor yog'yapti")
    elif code in (95, 96, 99):
        boost += 0.40
        reasons.append("Momaqaldiroq")
    elif code in (65, 81, 82) or precip >= 2.5:
        boost += 0.28
        reasons.append("Kuchli yomg'ir")
    elif code in (61, 63, 80) or precip >= 0.5:
        boost += 0.18
        reasons.append("Yomg'ir")
    elif code in (51, 53, 55, 56, 57, 66, 67) or precip > 0:
        boost += 0.10
        reasons.append("Mayda yomg'ir")

    # — Harorat (kun isishi / sovuq) —
    if temp is not None:
        if temp >= 40:
            boost += 0.18
            reasons.append("Jazirama issiq")
        elif temp >= 36:
            boost += 0.10
            reasons.append("Issiq havo")
        elif temp <= -8:
            boost += 0.18
            reasons.append("Qattiq sovuq")
        elif temp <= 0:
            boost += 0.08
            reasons.append("Sovuq havo")

    # — Kuchli shamol —
    if wind and wind >= 40:
        boost += 0.08
        reasons.append("Kuchli shamol")

    boost = round(min(boost, 0.50), 3)  # ob-havo hissasi cheklangan
    reason = ", ".join(reasons) if reasons else None
    info = {
        "temp_c": temp,
        "weather_code": code,
        "precip_mm": precip,
        "snow_cm": snow,
        "wind_kmh": wind,
    }
    return boost, reason, info
