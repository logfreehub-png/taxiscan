"""
Toshkent tumanlarining HAQIQIY chegaralarini Nominatim (OSM) dan olish.

Nominatim `polygon_geojson=1` to'liq tayyor GeoJSON (Polygon/MultiPolygon)
qaytaradi — Overpass'dagi kabi way bo'laklarini qo'lda ulash shart emas.

Region.geometry'ga GeoJSON saqlanadi, center_lat/lng va radius_km esa
polygon asosida qayta hisoblanadi (xaritada to'g'ri ko'rinishi uchun).
"""
import time
import math
import requests
from django.core.management.base import BaseCommand
from apps.taxi.models import Region

NOMINATIM = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "TaxiNarx/1.0 (Tashkent taxi aggregator)"}

# DB nomi -> Nominatim qidiruv so'rovlari (birinchi mos kelgani olinadi)
QUERIES = {
    # --- Toshkent SHAHAR tumanlari ---
    "Yunusobod":      ["Yunusobod tumani, Toshkent", "Yunusabad District, Tashkent"],
    "Mirzo Ulug'bek": ["Mirzo Ulug'bek tumani, Toshkent shahri", "Mirzo-Ulugbek District, Tashkent"],
    "Mirobod":        ["Mirobod tumani, Toshkent", "Mirabad District, Tashkent"],
    "Yashnobod":      ["Yashnobod tumani, Toshkent", "Yashnabad District, Tashkent"],
    "Chilonzor":      ["Chilonzor tumani, Toshkent", "Chilanzar District, Tashkent"],
    "Shayxontohur":   ["Shaykhantahur, Tashkent", "Shayxontohur tumani, Toshkent"],
    "Olmazor":        ["Olmazor tumani, Toshkent", "Almazar District, Tashkent"],
    "Sergeli":        ["Sergeli tumani, Toshkent", "Sergeli District, Tashkent"],
    "Yakkasaroy":     ["Yakkasaroy tumani, Toshkent", "Yakkasaray District, Tashkent"],
    "Bektemir":       ["Bektemir tumani, Toshkent", "Bektemir District, Tashkent"],
    "Uchtepa":        ["Uchtepa tumani, Toshkent", "Uchtepa District, Tashkent"],
    "Yangihayot":     ["Yangi Hayot tumani, Toshkent", "Yangi Hayot District, Tashkent"],
    "Yangi Toshkent (Do'stlik/Politotdel)": ["Yangi Toshkent tumani", "Yangi Toshkent Tumani, Toshkent"],
    # --- Toshkent VILOYATI tumanlari ---
    "Bekobod":        ["Bekobod tumani, Toshkent viloyati", "Bekabad District, Tashkent Region"],
    "Bo'ka":          ["Bo'ka tumani, Toshkent viloyati", "Boka District, Tashkent Region"],
    "Bo'stonliq":     ["Bo'stonliq tumani, Toshkent viloyati", "Bostanliq District, Tashkent Region"],
    "Chinoz":         ["Chinoz tumani, Toshkent viloyati", "Chinaz District, Tashkent Region"],
    "Qibray":         ["Qibray tumani, Toshkent viloyati", "Kibray District, Tashkent Region"],
    "Ohangaron":      ["Ohangaron tumani, Toshkent viloyati", "Akhangaran District, Tashkent Region"],
    "Oqqo'rg'on":     ["Oqqo'rg'on tumani, Toshkent viloyati", "Akkurgan District, Tashkent Region"],
    "Parkent":        ["Parkent tumani, Toshkent viloyati", "Parkent District, Tashkent Region"],
    "Piskent":        ["Piskent tumani, Toshkent viloyati", "Piskent District, Tashkent Region"],
    "Quyichirchiq":   ["Quyi Chirchiq tumani, Toshkent viloyati", "Quyichirchiq tumani", "Kuyichirchik District, Tashkent Region"],
    "O'rtachirchiq":  ["O'rta Chirchiq tumani, Toshkent viloyati", "O'rtachirchiq tumani", "Urtachirchik District, Tashkent Region"],
    "Yuqorichirchiq": ["Yuqori Chirchiq tumani, Toshkent viloyati", "Yuqorichirchiq tumani", "Yukorichirchik District, Tashkent Region"],
    "Yangiyo'l":      ["Yangiyo'l tumani, Toshkent viloyati", "Yangiyul District, Tashkent Region"],
    "Zangiota":       ["Zangiota tumani, Toshkent viloyati", "Zangiata District, Tashkent Region"],
    "Toshkent tumani": ["Toshkent tumani, Toshkent viloyati", "Tashkent District, Tashkent Region"],
}


def _queries_for(region):
    """Region uchun qidiruv so'rovlari ro'yxati."""
    if region.name in QUERIES:
        return QUERIES[region.name]
    if region.city and "viloyat" in region.city.lower():
        return [f"{region.name} tumani, Toshkent viloyati", f"{region.name} District, Tashkent Region"]
    return [f"{region.name} tumani, Toshkent"]


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _ring_area(ring):
    """Shoelace yuza (nisbiy taqqoslash uchun, daraja^2 birlikda)."""
    s = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[i + 1][0], ring[i + 1][1]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def _simplify_geometry(geom, min_area_ratio=0.2):
    """MultiPolygon'dagi mayda/uzoq bo'laklarni (eng kattaning min_area_ratio
    qismidan kichiklarini) tashlaydi. Bitta polygon qolsa — Polygon qaytadi.

    Bu Mirzo Ulug'bek kabi tumanlardagi kichik anklavlarni olib tashlab,
    xaritada toza, asosiy tuman shaklini beradi.
    """
    if not isinstance(geom, dict) or geom.get("type") != "MultiPolygon":
        return geom
    polys = geom.get("coordinates", [])
    if len(polys) <= 1:
        return geom
    areas = [(_ring_area(p[0]), p) for p in polys]
    max_area = max(a for a, _ in areas) or 1e-12
    kept = [p for a, p in areas if a >= min_area_ratio * max_area]
    if len(kept) == 1:
        return {"type": "Polygon", "coordinates": kept[0]}
    return {"type": "MultiPolygon", "coordinates": kept}


def _outer_rings(geom):
    """Polygon/MultiPolygon ichidagi barcha tashqi (outer) ringlar."""
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    return []


def _center_and_radius(geom):
    """Polygon markazi (centroid taxminiy) va qamrov radiusi (km)."""
    pts = []
    for ring in _outer_rings(geom):
        pts.extend(ring)
    if not pts:
        return None, None, None
    lng_c = sum(p[0] for p in pts) / len(pts)
    lat_c = sum(p[1] for p in pts) / len(pts)
    radius = max(_haversine(lat_c, lng_c, p[1], p[0]) for p in pts)
    return lat_c, lng_c, round(radius, 2)


def _fetch_geometry(queries):
    for q in queries:
        try:
            r = requests.get(
                NOMINATIM,
                params={
                    "q": q,
                    "format": "json",
                    "polygon_geojson": 1,
                    "limit": 5,
                    "countrycodes": "uz",
                },
                headers=HEADERS,
                timeout=25,
            )
            r.raise_for_status()
            results = r.json()
        except Exception as e:
            return None, f"so'rov xatosi: {e}"

        # Eng mosi: boundary/administrative va polygon bo'lgan natija
        for it in results:
            g = it.get("geojson") or {}
            if (
                it.get("class") == "boundary"
                and it.get("type") == "administrative"
                and g.get("type") in ("Polygon", "MultiPolygon")
            ):
                return g, it.get("display_name", q)
        time.sleep(1.2)  # Nominatim: 1 req/sek
    return None, "mos polygon topilmadi"


class Command(BaseCommand):
    help = "Toshkent tumanlari uchun haqiqiy chegaralarni Nominatim'dan oladi"

    def add_arguments(self, parser):
        parser.add_argument("--keep-center", action="store_true",
                            help="center_lat/lng va radius_km ni o'zgartirmaslik")
        parser.add_argument("--only", type=str, default=None,
                            help="Faqat bitta tuman nomi (masalan: \"Mirzo Ulug'bek\")")
        parser.add_argument("--missing", action="store_true",
                            help="Faqat geometriyasi yo'q tumanlar")

    def handle(self, *args, **opts):
        keep_center = opts["keep_center"]
        qs = Region.objects.all().order_by("city", "name")
        if opts["only"]:
            qs = qs.filter(name=opts["only"])
        if opts["missing"]:
            qs = qs.filter(geometry__isnull=True)

        ok = 0
        for region in qs:
            queries = _queries_for(region)
            self.stdout.write(f"-> [{region.city}] {region.name} ...")
            geom, info = _fetch_geometry(queries)
            time.sleep(1.2)  # har region orasida throttle

            if not geom:
                self.stdout.write(self.style.WARNING(f"   topilmadi: {info}"))
                continue

            geom = _simplify_geometry(geom)
            region.geometry = geom
            fields = ["geometry"]
            if not keep_center:
                lat_c, lng_c, radius = _center_and_radius(geom)
                if lat_c is not None:
                    region.center_lat = lat_c
                    region.center_lng = lng_c
                    region.radius_km = radius
                    fields += ["center_lat", "center_lng", "radius_km"]
            region.save(update_fields=fields)

            npts = sum(len(r) for r in _outer_rings(geom))
            ok += 1
            self.stdout.write(self.style.SUCCESS(f"   OK ({geom['type']}, {npts} nuqta)"))

        self.stdout.write(self.style.SUCCESS(f"\nTugadi — {ok} ta tuman yangilandi."))
