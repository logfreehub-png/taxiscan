"""
Tashqi tekin xizmatlar bilan ishlash:
- OSRM (router.project-osrm.org) — real masofa va vaqt
- Nominatim (nominatim.openstreetmap.org) — geocoding va reverse-geocoding

Ikkalasi ham FREE va API key talab qilmaydi, lekin rate limit bor.
Production'da o'z OSRM/Nominatim instance'ini ishga tushirish kerak.
"""
import re
import requests
import logging
from collections import Counter
from functools import lru_cache
from django.conf import settings
from .providers.formula import (
    haversine_km, estimate_duration_min, traffic_adjusted_duration,
)

logger = logging.getLogger(__name__)

OSRM_BASE = "https://router.project-osrm.org"
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
YANDEX_GEOCODE_BASE = "https://geocode-maps.yandex.ru/1.x/"
USER_AGENT = "TaxiNarx/1.0 (taxi price aggregator for Tashkent)"


def _yandex_key():
    return getattr(settings, "YANDEX_GEOCODER_KEY", "") or ""


def _yandex_lang():
    return getattr(settings, "YANDEX_GEOCODER_LANG", "ru_RU") or "ru_RU"



def _osrm_route(coords, alternatives=0):
    """OSRM ga so'rov — coords = [(lng, lat), (lng, lat), ...]."""
    coords_str = ";".join(f"{lng},{lat}" for lng, lat in coords)
    url = f"{OSRM_BASE}/route/v1/driving/{coords_str}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "alternatives": str(alternatives),
        "steps": "false",
    }
    resp = requests.get(url, params=params, timeout=8, headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    return resp.json().get("routes", [])


def _route_signature(geometry):
    """Yo'lni dedup qilish uchun unikal signature."""
    if not geometry or "coordinates" not in geometry:
        return None
    coords = geometry["coordinates"]
    if len(coords) < 2:
        return None
    # Birinchi, o'rta va oxirgi nuqtani signature sifatida ishlatamiz
    mid = coords[len(coords) // 2]
    return (round(mid[0], 3), round(mid[1], 3), len(coords))


def _waypoint_route(start_lat, start_lng, end_lat, end_lng, waypoints):
    """A → (oraliq nuqtalar) → B yo'lini hisoblaydi — bitta yo'l qaytaradi.

    waypoints = [(lat, lng), ...] — boshlanish va manzil orasidagi to'xtashlar.
    OSRM bir nechta nuqta orqali o'tuvchi yo'lni qo'llab-quvvatlaydi.
    """
    coords = [(start_lng, start_lat)]
    coords += [(w[1], w[0]) for w in waypoints]
    coords.append((end_lng, end_lat))
    try:
        routes = _osrm_route(coords, alternatives=0)
        if not routes:
            raise ValueError("OSRM bo'sh javob")
        r = routes[0]
        free_flow_min = r["duration"] / 60
        return [{
            "label": "1-yo'l",
            "distance_km": round(r["distance"] / 1000, 2),
            "duration_min": traffic_adjusted_duration(free_flow_min),
            "geometry": r.get("geometry"),
            "source": "osrm",
        }]
    except Exception as exc:
        logger.warning("Waypoint route xato (%s), haversine fallback", exc)
        # Har bir segment uchun havodan masofa yig'indisi
        pts = [(start_lat, start_lng)] + list(waypoints) + [(end_lat, end_lng)]
        total = 0.0
        line = []
        for i in range(len(pts) - 1):
            total += haversine_km(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
            line.append([pts[i][1], pts[i][0]])
        line.append([pts[-1][1], pts[-1][0]])
        km = round(total * 1.32, 2)
        return [{
            "label": "1-yo'l",
            "distance_km": km,
            "duration_min": traffic_adjusted_duration(estimate_duration_min(km)),
            "geometry": {"type": "LineString", "coordinates": line},
            "source": "fallback",
        }]


def get_routes(start_lat, start_lng, end_lat, end_lng,
               min_routes=2, max_routes=4, max_distance_ratio=1.35,
               waypoints=None):
    """Yaqin yo'llarni qaytaradi (kamida min_routes, ko'pi bilan max_routes).

    Agar `waypoints` (oraliq to'xtashlar) berilsa — A→...→B bo'yicha bitta
    yo'l qaytaradi (alternativ yo'llarsiz, chunki to'xtashlar tartibi muhim).

    Strategiya (waypoints'siz):
    1) OSRM dan tabiiy alternativlarni olamiz (eng ko'pi 3)
    2) Eng qisqa yo'lga nisbatan max_distance_ratio dan uzunroqlarini tashlaymiz
    3) Agar yaqin yo'llar min_routes dan kam bo'lsa — eng qisqaroq detour bilan
       to'ldirishga harakat qilamiz (faqat distance_ratio chegarasiga sig'sa)
    """
    if waypoints:
        return _waypoint_route(start_lat, start_lng, end_lat, end_lng, waypoints)
    try:
        # 1) OSRM dan tabiiy alternativlar
        routes = _osrm_route(
            [(start_lng, start_lat), (end_lng, end_lat)], alternatives=3
        )
        if not routes:
            raise ValueError("OSRM bo'sh javob qaytardi")

        seen = set()
        unique = []
        for r in routes:
            sig = _route_signature(r.get("geometry"))
            if sig and sig not in seen:
                seen.add(sig)
                unique.append(r)

        if not unique:
            raise ValueError("Hech qanday unikal yo'l yo'q")

        # 2) Filter: faqat eng qisqaga yaqin TABIIY yo'llar.
        # MUHIM: sun'iy detour (perpendikulyar via-nuqta) qo'shMAYMIZ — u yo'lni
        # noto'g'ri/mantiqsiz ko'chalardan o'tkazardi. Faqat OSRM bergan haqiqiy
        # alternativlar ko'rsatiladi (1 ta bo'lsa 1 ta — lekin doim to'g'ri yo'ldan).
        unique.sort(key=lambda r: r.get("distance", 0))
        shortest = unique[0]["distance"]
        max_allowed = shortest * max_distance_ratio
        nearby = [r for r in unique if r["distance"] <= max_allowed]

        # 3) Tartiblash va max_routes ta tanlash
        nearby.sort(key=lambda r: r.get("distance", 0))
        chosen = nearby[:max_routes]

        out = []
        for i, route in enumerate(chosen):
            # OSRM free-flow vaqtni beradi — joriy soatdagi real tirbandlikka moslaymiz
            free_flow_min = route["duration"] / 60
            out.append({
                "label": f"{i+1}-yo'l",
                "distance_km": round(route["distance"] / 1000, 2),
                "duration_min": traffic_adjusted_duration(free_flow_min),
                "geometry": route.get("geometry"),
                "source": "osrm",
            })
        return out

    except Exception as exc:
        logger.warning("OSRM routes xatolik (%s), formula bilan fallback", exc)
        air = haversine_km(start_lat, start_lng, end_lat, end_lng)
        km = round(air * 1.32, 2)
        return [{
            "label": "1-yo'l",
            "distance_km": km,
            "duration_min": traffic_adjusted_duration(estimate_duration_min(km)),
            "geometry": {
                "type": "LineString",
                "coordinates": [[start_lng, start_lat], [end_lng, end_lat]],
            },
            "source": "fallback",
        }]


def get_route(start_lat, start_lng, end_lat, end_lng):
    """Bir asosiy yo'lni qaytaradi — eski API bilan moslik uchun."""
    return get_routes(start_lat, start_lng, end_lat, end_lng, min_routes=1, max_routes=1)[0]


# ——— Manzilni Yandex/Google uslubida QISQA ko'rsatish ———
# Maqsad: "1, Katartal Street, Chilonzor-11, Chilanzar, ..." kabi xom display_name
# o'rniga "Nom, Katartal ko'chasi, 1" + "Chilonzor tumani" ko'rinishi.

# OSM/Yandex turli tillarda qaytaradigan tuman nomlari -> bitta o'zbekcha ko'rinish
_DISTRICT_UZ = {
    "chilanzar": "Chilonzor", "чиланзарский": "Chilonzor", "чиланзар": "Chilonzor",
    "yunusabad": "Yunusobod", "юнусабадский": "Yunusobod", "юнусабад": "Yunusobod",
    "mirzo ulugbek": "Mirzo Ulug'bek", "mirzo-ulugbek": "Mirzo Ulug'bek",
    "мирзо-улугбекский": "Mirzo Ulug'bek", "мирзо улугбек": "Mirzo Ulug'bek",
    "mirabad": "Mirobod", "мирабадский": "Mirobod", "мирабад": "Mirobod",
    "yakkasaray": "Yakkasaroy", "яккасарайский": "Yakkasaroy", "яккасарай": "Yakkasaroy",
    "shaykhantaur": "Shayxontohur", "shayhontohur": "Shayxontohur",
    "shaykhantakhur": "Shayxontohur", "шайхантахурский": "Shayxontohur",
    "шайхантахур": "Shayxontohur",
    "almazar": "Olmazor", "алмазарский": "Olmazor", "алмазар": "Olmazor",
    "учтепинский": "Uchtepa", "учтепа": "Uchtepa",
    "yashnabad": "Yashnobod", "яшнабадский": "Yashnobod", "яшнабад": "Yashnobod",
    "сергелийский": "Sergeli", "сергели": "Sergeli",
    "бектемирский": "Bektemir", "бектемир": "Bektemir",
    "янгихаётский": "Yangihayot", "янгихаёт": "Yangihayot",
    # O'zbek-kirill yozuvidagi variantlar (ғ->г, ҳ->х normalizatsiyadan keyin)
    "чилонзор": "Chilonzor", "юнусобод": "Yunusobod", "миробод": "Mirobod",
    "яккасарой": "Yakkasaroy", "шайхонтохур": "Shayxontohur", "олмазор": "Olmazor",
    "яшнобод": "Yashnobod",
}

# Kirill -> o'zbek-lotin transliteratsiya (ruscha/kirillcha nomlarni bir xil yozuvga keltirish)
_CYR2LAT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "'", "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "ў": "o'", "қ": "q", "ғ": "g'", "ҳ": "h",
}


def _translit(s):
    """Kirillcha matnni o'zbek-lotinga o'giradi; lotincha matn o'zgarmaydi."""
    if not s or not re.search(r"[а-яёўқғҳА-ЯЁЎҚҒҲ]", s):
        return s or ""
    out = []
    for ch in s:
        lo = ch.lower()
        rep = _CYR2LAT.get(lo)
        if rep is None:
            out.append(ch)
        elif ch != lo:
            out.append(rep[:1].upper() + rep[1:])
        else:
            out.append(rep)
    return "".join(out)


def _district_uz(raw):
    """Tuman nomini o'zbekcha bitta ko'rinishga keltiradi (suffikssiz, masalan 'Chilonzor')."""
    if not raw:
        return ""
    s = re.sub(r"\s*(tumani|tuman|district|тумани|туман|райони|район)\.?\s*$", "", raw.strip(), flags=re.I)
    key = s.lower().replace("ʻ", "'").replace("’", "'")
    key = key.replace("ғ", "г").replace("ў", "у").replace("қ", "к").replace("ҳ", "х")
    return _DISTRICT_UZ.get(key, _translit(s))


def _street_uz(road):
    """'Katartal Street' / 'улица Катартал' -> 'Katartal ko'chasi' (qisqa, mahalliy ko'rinish)."""
    if not road:
        return ""
    r = re.sub(r"\s+", " ", road).strip()
    # Allaqachon o'zbekcha bo'lsa tegmaymiz
    if re.search(r"ko[''ʻ’`]?cha|prospekti|xiyobon|maydon", r, flags=re.I):
        return r
    # "2-я улица Катартал" kabi o'rtada kelgan "улица"
    m = re.match(r"^(.+?)\s+(?:улица|ул\.)\s+(.+)$", r, flags=re.I)
    if m:
        return _translit(f"{m.group(2)} {m.group(1)}") + " ko'chasi"
    for pat, suffix in (
        (r"^(?:улица|ул\.)\s+(.+)$", " ko'chasi"),
        (r"^(.+?)\s+(?:улица|ул\.)$", " ko'chasi"),
        (r"^(.+?)\s+(?:street|st\.)$", " ko'chasi"),
        (r"^(?:проспект|просп\.)\s+(.+)$", " prospekti"),
        (r"^(.+?)\s+(?:проспект|prospect|avenue|ave\.?)$", " prospekti"),
    ):
        m = re.match(pat, r, flags=re.I)
        if m:
            return _translit(m.group(1)) + suffix
    return _translit(r)


def _compose_result(name, road, house, district, city, fallback):
    """Qidiruv natijasini Yandex/Google'dagi kabi qisqa label + detail qilib yig'adi.

    label  — asosiy qator: "Nom, Katartal ko'chasi, 1" yoki "Katartal ko'chasi, 1"
    detail — ikkinchi qator: "Chilonzor tumani" (Toshkentdan tashqarida shahar ham)
    """
    name = _translit(name)
    city = _translit(city)
    street = _street_uz(road)
    street_part = f"{street}, {house}" if street and house else (street or "")
    district = _district_uz(district)

    if name and street_part:
        label = f"{name}, {street_part}"
    elif name:
        label = name
    elif street_part:
        label = street_part
    else:
        label = ", ".join(p.strip() for p in (fallback or "").split(",")[:2]).strip()

    detail = []
    if district and district.lower() != (name or "").lower():
        detail.append(f"{district} tumani")
    if (
        city
        and city.lower() != (name or "").lower()
        and not re.search(r"tashkent|toshkent|ташкент", city, flags=re.I)
    ):
        detail.append(city)
    return {
        "name": name or "",
        "street": street_part,
        "district": district,
        "label": label,
        "detail": ", ".join(detail),
    }


def _number_branches(results):
    """Bir xil nomli joy 2+ marta chiqsa — "Nom 1-filiali (Tuman)" deb raqamlaymiz,
    ko'cha/uy esa detail qatorida qoladi. Aynan bir xil yozuvlar oldin tushirib qoldiriladi."""
    seen = set()
    unique = []
    for r in results:
        key = (r["label"], r.get("detail", ""))
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)

    counts = Counter(r["name"].lower() for r in unique if r.get("name"))
    idx = {}
    for r in unique:
        nm = (r.get("name") or "").lower()
        if nm and counts[nm] >= 2:
            idx[nm] = idx.get(nm, 0) + 1
            label = f"{r['name']} {idx[nm]}-filiali"
            if r.get("district"):
                label += f" ({r['district']})"
            r["label"] = label
            r["detail"] = ", ".join(x for x in (r.get("street"), r.get("detail")) if x)
        # Yordamchi kalitlar javobga chiqmaydi
        r.pop("name", None)
        r.pop("street", None)
        r.pop("district", None)
    return unique


def _yandex_reverse(lat, lng):
    """Koordinatadan joy nomini olish (Yandex Geocoder)."""
    resp = requests.get(
        YANDEX_GEOCODE_BASE,
        params={
            "apikey": _yandex_key(),
            "format": "json",
            "geocode": f"{lng},{lat}",  # Yandex: "uzunlik,kenglik"
            "lang": _yandex_lang(),
            "results": 1,
            "kind": "house",
        },
        timeout=5,
        headers={"User-Agent": USER_AGENT},
    )
    resp.raise_for_status()
    members = (
        resp.json()
        .get("response", {})
        .get("GeoObjectCollection", {})
        .get("featureMember", [])
    )
    if not members:
        raise ValueError("Yandex bo'sh javob")
    obj = members[0]["GeoObject"]
    meta = obj.get("metaDataProperty", {}).get("GeocoderMetaData", {})
    # `name` — qisqa nom (ko'cha + uy), `text` — to'liq manzil
    label = meta.get("text") or obj.get("name") or f"{lat:.4f}, {lng:.4f}"
    short = obj.get("name") or label
    # Ruscha/kirillcha nomni o'zbekchaga o'girish: "улица Сайилгох, 35/2" -> "Sayilgox ko'chasi, 35/2"
    parts = [p.strip() for p in short.split(",") if p.strip()]
    if parts:
        parts[0] = _street_uz(parts[0]) or _translit(parts[0])
        parts[1:] = [_translit(p) for p in parts[1:]]
        short = ", ".join(p for p in parts if p)
    return {"label": short or f"{lat:.4f}, {lng:.4f}", "full": _translit(label), "address": {}}


def _yandex_search(query, city="Tashkent"):
    """Manzil bo'yicha qidirish (Yandex Geocoder)."""
    full_q = query if city.lower() in query.lower() else f"{city}, {query}"
    resp = requests.get(
        YANDEX_GEOCODE_BASE,
        params={
            "apikey": _yandex_key(),
            "format": "json",
            "geocode": full_q,
            "lang": _yandex_lang(),
            "results": 8,
        },
        timeout=5,
        headers={"User-Agent": USER_AGENT},
    )
    resp.raise_for_status()
    members = (
        resp.json()
        .get("response", {})
        .get("GeoObjectCollection", {})
        .get("featureMember", [])
    )
    results = []
    for m in members:
        obj = m["GeoObject"]
        try:
            lng_s, lat_s = obj["Point"]["pos"].split()
        except (KeyError, ValueError):
            continue
        meta = obj.get("metaDataProperty", {}).get("GeocoderMetaData", {})
        kind = meta.get("kind", "")
        comps = meta.get("Address", {}).get("Components", []) or []

        def comp(k):
            return next((c.get("name", "") for c in comps if c.get("kind") == k), "")

        # Manzil turidagi natijada (uy/ko'cha) obj.name allaqachon "ko'cha, uy" bo'ladi —
        # POI/tuman/mahalla bo'lsa esa obj.name asosiy nom sifatida ishlatiladi
        # (aks holda label "Узбекистан, Ташкент" kabi umumiy matnga tushib qoladi).
        name = obj.get("name", "") if kind not in ("house", "street") else ""
        fmt = _compose_result(
            name=name,
            road=comp("street"),
            house=comp("house"),
            district=comp("district"),
            city=comp("locality"),
            fallback=meta.get("text") or obj.get("name", ""),
        )
        fmt.update({
            "lat": float(lat_s),
            "lng": float(lng_s),
            "type": kind,
            "importance": 0,
        })
        results.append(fmt)
    return _number_branches(results)


def reverse_geocode(lat, lng):
    """Koordinatadan joy nomini olish — Yandex (kalit bo'lsa) yoki Nominatim."""
    if _yandex_key():
        try:
            return _yandex_reverse(lat, lng)
        except Exception as exc:
            logger.warning("Yandex reverse xatolik (%s), Nominatim'ga o'tildi", exc)
    try:
        resp = requests.get(
            f"{NOMINATIM_BASE}/reverse",
            params={
                "lat": lat,
                "lon": lng,
                "format": "json",
                "accept-language": "uz,ru,en",
                "zoom": 18,  # 18 — bino darajasi, uy raqami ham keladi
                "addressdetails": 1,
            },
            timeout=5,
            headers={"User-Agent": USER_AGENT},
        )
        resp.raise_for_status()
        data = resp.json()
        addr = data.get("address", {})

        # Qisqa, Yandex/Google uslubida: "Katartal ko'chasi, 1, Chilonzor tumani"
        parts = []
        road = _street_uz(addr.get("road") or addr.get("pedestrian") or "")
        house = addr.get("house_number") or ""
        if road:
            parts.append(f"{road}, {house}" if house else road)
        elif house:
            # Ko'cha topilmasa kvartal/mahalla + uy raqami ("Chilonzor-9, 13/1")
            loc = _translit(addr.get("neighbourhood") or addr.get("locality") or "")
            if loc:
                parts.append(f"{loc}, {house}")

        squash = lambda s: re.sub(r"\W+", "", s.lower())
        base = squash(parts[0]) if parts else ""

        # Mahalla/kvartal — birinchi qatorda chiqmagan bo'lsa
        hood = _translit(addr.get("neighbourhood") or addr.get("locality") or addr.get("suburb") or "")
        if hood and squash(hood) not in base:
            parts.append(hood)

        # Tuman
        district = _district_uz(addr.get("city_district") or addr.get("county") or "")
        if district:
            parts.append(f"{district} tumani")
        else:
            city = addr.get("city") or addr.get("town") or addr.get("village") or ""
            if city:
                parts.append(_translit(city))

        label = ", ".join(parts[:3]) if parts else data.get("display_name", "")
        return {
            "label": label or f"{lat:.4f}, {lng:.4f}",
            "full": data.get("display_name", ""),
            "address": addr,
        }
    except Exception as exc:
        logger.warning("Nominatim reverse xatolik: %s", exc)
        return {"label": f"{lat:.4f}, {lng:.4f}", "full": "", "address": {}}


def search_address(query, city="Tashkent"):
    """Manzil bo'yicha qidirish — Yandex (kalit bo'lsa) yoki Nominatim."""
    if _yandex_key():
        try:
            res = _yandex_search(query, city=city)
            if res:
                return res
        except Exception as exc:
            logger.warning("Yandex search xatolik (%s), Nominatim'ga o'tildi", exc)
    try:
        full_q = f"{query}, {city}, Uzbekistan" if city not in query else query
        resp = requests.get(
            f"{NOMINATIM_BASE}/search",
            params={
                "q": full_q,
                "format": "json",
                "accept-language": "uz,ru,en",
                "limit": 8,
                "countrycodes": "uz",
                "addressdetails": 1,
                "namedetails": 1,
            },
            timeout=5,
            headers={"User-Agent": USER_AGENT},
        )
        resp.raise_for_status()
        results = []
        for item in resp.json():
            addr = item.get("address") or {}
            fmt = _compose_result(
                name=item.get("name") or (item.get("namedetails") or {}).get("name") or "",
                road=addr.get("road") or addr.get("pedestrian") or addr.get("residential") or "",
                house=addr.get("house_number") or "",
                district=addr.get("city_district") or addr.get("county") or addr.get("suburb") or "",
                city=addr.get("city") or addr.get("town") or addr.get("village") or "",
                fallback=item.get("display_name", ""),
            )
            fmt.update({
                "lat": float(item["lat"]),
                "lng": float(item["lon"]),
                "type": item.get("type", ""),
                "importance": item.get("importance", 0),
            })
            results.append(fmt)
        return _number_branches(results)
    except Exception as exc:
        logger.warning("Nominatim search xatolik: %s", exc)
        return []
