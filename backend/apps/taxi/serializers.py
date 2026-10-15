from rest_framework import serializers
from .models import TaxiService, Region, PriceEstimate, FavoriteRoute


class TaxiServiceSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = TaxiService
        fields = (
            "id", "code", "name", "brand", "tier", "color", "logo_url", "website",
            "deeplink_template", "base_fare_uzs", "per_km_uzs",
            "per_minute_uzs", "minimum_fare_uzs", "is_active", "sort_order",
        )

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        url = obj.logo.url
        return request.build_absolute_uri(url) if request else url


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ("id", "name", "city", "center_lat", "center_lng", "radius_km", "geometry")


class StopSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)
    address = serializers.CharField(required=False, allow_blank=True, max_length=255)


class EstimateRequestSerializer(serializers.Serializer):
    start_lat = serializers.FloatField(min_value=-90, max_value=90)
    start_lng = serializers.FloatField(min_value=-180, max_value=180)
    end_lat = serializers.FloatField(min_value=-90, max_value=90)
    end_lng = serializers.FloatField(min_value=-180, max_value=180)
    start_address = serializers.CharField(required=False, allow_blank=True, max_length=255)
    end_address = serializers.CharField(required=False, allow_blank=True, max_length=255)
    # Oraliq to'xtashlar (A → B → C ...) — ixtiyoriy, ko'pi bilan 3 ta
    stops = StopSerializer(many=True, required=False, default=list)

    def validate_stops(self, value):
        if len(value) > 3:
            raise serializers.ValidationError("Ko'pi bilan 3 ta oraliq to'xtash mumkin.")
        return value


class QuickLocalRequestSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)
    sample_distance_km = serializers.FloatField(default=5.0, min_value=0.5, max_value=50)


class PriceEstimateSerializer(serializers.ModelSerializer):
    service = TaxiServiceSerializer(read_only=True)
    region = RegionSerializer(read_only=True)

    class Meta:
        model = PriceEstimate
        fields = (
            "id", "service", "region",
            "start_lat", "start_lng", "end_lat", "end_lng",
            "start_address", "end_address",
            "distance_km", "duration_min", "price_uzs", "surge",
            "source", "created_at",
        )


class FavoriteRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriteRoute
        fields = (
            "id", "title",
            "start_address", "start_lat", "start_lng",
            "end_address", "end_lat", "end_lng",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
