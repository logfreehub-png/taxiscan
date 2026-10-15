from django.urls import path
from .views import DailyStatsView, RegionStatsView, TimeSeriesView, HourlyStatsView, HourlyByBrandView

urlpatterns = [
    path("daily/", DailyStatsView.as_view(), name="stats-daily"),
    path("regions/", RegionStatsView.as_view(), name="stats-regions"),
    path("time-series/", TimeSeriesView.as_view(), name="stats-time-series"),
    path("hourly/", HourlyStatsView.as_view(), name="stats-hourly"),
    path("hourly-by-brand/", HourlyByBrandView.as_view(), name="stats-hourly-by-brand"),
]
