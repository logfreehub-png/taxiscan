from rest_framework import serializers
from .models import Subscription, Transaction, Card, PromoCode, PromoRedemption


class SubscriptionSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    days_left = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    monthly_price_uzs = serializers.SerializerMethodField()
    base_price_uzs = serializers.IntegerField(source="monthly_price_uzs", read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id", "status", "status_display", "is_active", "days_left",
            "started_at", "expires_at", "auto_renew",
            "monthly_price_usd", "monthly_price_uzs", "base_price_uzs",
            "last_charge_at", "next_charge_at", "discount_percent",
        )
        read_only_fields = ("id", "started_at", "monthly_price_usd")

    def get_monthly_price_uzs(self, obj):
        base = obj.monthly_price_uzs
        disc = obj.discount_percent or 0
        if disc > 0:
            return max(0, int(base * (100 - disc) / 100))
        return base


class TransactionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Transaction
        fields = (
            "id", "amount_usd", "amount_uzs", "status", "status_display",
            "card_last4", "description", "error_message",
            "external_id", "created_at",
        )
        read_only_fields = fields


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = (
            "id", "holder_name", "card_last4", "expiry_month", "expiry_year",
            "card_type", "is_default", "created_at",
        )
        read_only_fields = ("id", "created_at")


class AddCardSerializer(serializers.Serializer):
    """Karta qo'shish uchun foydalanuvchi yuboradigan ma'lumotlar."""
    card_number = serializers.CharField(min_length=12, max_length=19)
    holder_name = serializers.CharField(max_length=100)
    expiry_month = serializers.IntegerField(min_value=1, max_value=12)
    expiry_year = serializers.IntegerField(min_value=2020, max_value=2099)
    cvv = serializers.CharField(min_length=3, max_length=4, write_only=True, required=False, allow_blank=True)
    card_type = serializers.ChoiceField(
        choices=["uzcard", "humo", "visa", "mastercard"], default="uzcard"
    )

    def validate(self, data):
        # Visa/MasterCard uchun CVV majburiy
        if data.get("card_type") in ("visa", "mastercard") and not data.get("cvv"):
            raise serializers.ValidationError({"cvv": "Visa/MasterCard uchun CVV majburiy"})
        return data

    def validate_card_number(self, value):
        cleaned = value.replace(" ", "").replace("-", "")
        if not cleaned.isdigit():
            raise serializers.ValidationError("Karta raqami faqat raqamlardan iborat bo'lishi kerak")
        return cleaned


class PromoCodeSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    audience_display = serializers.CharField(source="get_audience_display", read_only=True)

    class Meta:
        model = PromoCode
        fields = (
            "id", "code", "description", "reward_type", "free_days", "discount_percent",
            "audience", "audience_display", "max_uses", "used_count", "valid_until",
            "is_active", "status", "created_at",
        )
        read_only_fields = ("id", "used_count", "status", "created_at")


class PromoRedemptionSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source="promo.code", read_only=True)
    description = serializers.CharField(source="promo.description", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PromoRedemption
        fields = (
            "id", "code", "description", "status", "status_display",
            "free_days_granted", "redeemed_at",
        )
        read_only_fields = fields
