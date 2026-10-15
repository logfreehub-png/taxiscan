from django.contrib import admin
from .models import DailyServiceStat


@admin.register(DailyServiceStat)
class DailyServiceStatAdmin(admin.ModelAdmin):
    list_display = ("date", "service", "region", "avg_price_uzs", "min_price_uzs", "max_price_uzs", "request_count", "cheapest_count")
    list_filter = ("date", "service", "region")
    date_hierarchy = "date"
