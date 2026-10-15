"""
Taxi xizmatlari uchun provayderlar.

Har bir provayder bir xil interfeys (BaseProvider) ni amalga oshiradi:
fetch_estimate(start, end) -> EstimateResult

Default holatda hammasi formula asosida ishlaydi (FormulaProvider).
Real API kelganda shu fayllarni almashtirish kifoya.
"""
from .base import BaseProvider, EstimateResult
from .formula import FormulaProvider
from .yandex import YandexGoProvider, YangoProvider
from .registry import get_provider, REGISTRY

__all__ = [
    "BaseProvider",
    "EstimateResult",
    "FormulaProvider",
    "YandexGoProvider",
    "YangoProvider",
    "get_provider",
    "REGISTRY",
]
