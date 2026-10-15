"""Provayderlar reestri — service.code bo'yicha to'g'ri klassni qaytaradi."""
from .formula import FormulaProvider
from .yandex import YandexGoProvider, YangoProvider


REGISTRY = {
    "yandex_go": YandexGoProvider,
    "yango": YangoProvider,
    # MyTaxi, Uzum, ON Taxi — hozircha formula
    "mytaxi": FormulaProvider,
    "uzum_taxi": FormulaProvider,
    "on_taxi": FormulaProvider,
}


def get_provider(service):
    """TaxiService obyektidan kerakli provayderni topadi."""
    cls = REGISTRY.get(service.code, FormulaProvider)
    return cls(service)
