from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from apps.billing.models import Subscription, PromoRedemption, Transaction
from .models import User


class SubscriptionInline(admin.StackedInline):
    """Foydalanuvchi obunasi — holati, muddati, chegirmasi."""
    model = Subscription
    extra = 0
    can_delete = False
    readonly_fields = ("started_at", "last_charge_at")
    fields = ("status", "expires_at", "auto_renew", "discount_percent", "started_at", "last_charge_at")


class PromoRedemptionInline(admin.TabularInline):
    """Foydalanuvchi ishlatgan promo-kodlar — tekinmi/chegirmami, qancha."""
    model = PromoRedemption
    extra = 0
    can_delete = False
    readonly_fields = ("promo", "status", "benefit_label", "free_days_granted", "discount_percent_granted", "redeemed_at")
    fields = ("promo", "status", "benefit_label", "free_days_granted", "discount_percent_granted", "redeemed_at")

    def has_add_permission(self, request, obj=None):
        return False


class TransactionInline(admin.TabularInline):
    """Foydalanuvchi to'lovlari — summa, holat, izoh."""
    model = Transaction
    extra = 0
    can_delete = False
    readonly_fields = ("created_at", "amount_uzs", "status", "payme_state", "description")
    fields = ("created_at", "amount_uzs", "status", "payme_state", "description")
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    inlines = [SubscriptionInline, PromoRedemptionInline, TransactionInline]
    list_display = ("phone", "username", "first_name", "role", "city", "has_card", "is_active", "date_joined")
    list_filter = ("role", "city", "has_card", "is_active", "is_staff")
    search_fields = ("phone", "username", "first_name", "last_name")
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("phone", "username", "password")}),
        ("Shaxsiy", {"fields": ("first_name", "last_name", "avatar", "city")}),
        ("Rol", {"fields": ("role", "home_lat", "home_lng")}),
        ("To'lov", {"fields": ("has_card", "card_last4")}),
        ("Huquqlar", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Sanalar", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("phone", "username", "password1", "password2", "role"),
        }),
    )
