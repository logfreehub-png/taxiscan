from django import forms
from django.contrib import admin
from .models import TaxiService, Region, PriceEstimate, FavoriteRoute, SiteSetting


@admin.register(TaxiService)
class TaxiServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "base_fare_uzs", "per_km_uzs", "per_minute_uzs", "minimum_fare_uzs", "is_active", "sort_order")
    list_editable = ("base_fare_uzs", "per_km_uzs", "per_minute_uzs", "minimum_fare_uzs", "is_active", "sort_order")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    prepopulated_fields = {"code": ("name",)}


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "center_lat", "center_lng", "radius_km", "is_active")
    list_editable = ("radius_km", "is_active")
    list_filter = ("city", "is_active")
    search_fields = ("name", "city")


@admin.register(PriceEstimate)
class PriceEstimateAdmin(admin.ModelAdmin):
    list_display = ("created_at", "service", "user", "price_uzs", "distance_km", "duration_min", "surge", "region", "source")
    list_filter = ("service", "region", "source", "created_at")
    search_fields = ("user__phone", "start_address", "end_address")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)


@admin.register(FavoriteRoute)
class FavoriteRouteAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "start_address", "end_address", "created_at")
    search_fields = ("user__phone", "title", "start_address", "end_address")
    list_filter = ("created_at",)


class SiteSettingForm(forms.ModelForm):
    class Meta:
        model = SiteSetting
        fields = "__all__"
        widgets = {
            # Brauzer rang tanlash (color picker) widjeti
            "brand_color": forms.TextInput(attrs={"type": "color", "style": "height:40px;width:80px;padding:2px;"}),
        }


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    """Sayt ko'rinishi — singleton (bitta yozuv). Admin brend rangi + kun/tun ni boshqaradi."""
    form = SiteSettingForm
    list_display = ("__str__", "brand_color", "default_theme", "updated_at")
    readonly_fields = ("updated_at",)

    def has_add_permission(self, request):
        # Faqat bitta yozuv bo'lsin
        return not SiteSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
