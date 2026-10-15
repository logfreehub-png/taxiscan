from django.contrib import admin
from .models import Subscription, Transaction, Card, PromoCode, PromoRedemption


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "expires_at", "auto_renew", "monthly_price_usd", "last_charge_at")
    list_filter = ("status", "auto_renew")
    search_fields = ("user__phone",)
    readonly_fields = ("started_at",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "amount_usd", "amount_uzs", "status", "card_last4", "description")
    list_filter = ("status", "created_at")
    search_fields = ("user__phone", "external_id", "description")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ("user", "card_type", "card_last4", "is_default", "expiry_month", "expiry_year", "created_at")
    list_filter = ("card_type", "is_default")
    search_fields = ("user__phone", "card_last4")


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "reward_type", "free_days", "discount_percent", "audience", "used_count", "max_uses", "valid_until", "is_active", "status")
    list_filter = ("reward_type", "audience", "is_active")
    search_fields = ("code", "description")
    readonly_fields = ("used_count", "created_at")


@admin.register(PromoRedemption)
class PromoRedemptionAdmin(admin.ModelAdmin):
    list_display = ("user", "promo", "status", "benefit_label", "free_days_granted", "discount_percent_granted", "redeemed_at")
    list_filter = ("status", "redeemed_at")
    search_fields = ("user__phone", "promo__code")
    readonly_fields = ("redeemed_at",)
