from django.core.management.base import BaseCommand
from apps.taxi.services import cleanup_old_estimates


class Command(BaseCommand):
    help = "1 kundan (24 soat) eski taxi narx zaproslarini bazadan tozalash (PriceEstimate)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=1,
            help="Necha kundan eski zaproslar o'chirilsin (standart: 1 kun)",
        )

    def handle(self, *args, **options):
        days = options.get("days", 1)
        deleted = cleanup_old_estimates(retention_days=days)
        self.stdout.write(
            self.style.SUCCESS(
                f"Muvaffaqiyatli: {days} kundan eski {deleted} ta zapros bazadan tozalandi."
            )
        )
