"""Asosiy provider interfeysi."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class EstimateResult:
    """Bir taxi xizmati narxining hisob-kitobi natijasi."""

    service_code: str
    price_uzs: int
    distance_km: float
    duration_min: float
    surge: float = 1.0
    source: str = "formula"  # formula | api | scraped
    raw: Optional[dict] = None
    error: Optional[str] = None

    @property
    def is_ok(self) -> bool:
        return self.error is None and self.price_uzs > 0


class BaseProvider:
    """Barcha provayderlar uchun bazaviy klass."""

    code: str = ""

    def __init__(self, service):
        self.service = service  # apps.taxi.models.TaxiService

    def fetch_estimate(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        route: dict | None = None,
    ) -> EstimateResult:
        """Narxni hisoblash. Bola klasslar override qilishi kerak.

        `route` — agar OSRM allaqachon chaqirilgan bo'lsa, masofa/vaqt qaytadan
        chaqirilmasin uchun uzatiladi.
        """
        raise NotImplementedError
