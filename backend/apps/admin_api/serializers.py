from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.billing.models import Subscription, Card, Transaction
from apps.taxi.models import PriceEstimate, FavoriteRoute

User = get_user_model()


class AdminCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ("id", "holder_name", "card_last4", "card_type",
                  "expiry_month", "expiry_year", "is_default", "created_at")


class AdminTransactionSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source="user.phone", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Transaction
        fields = ("id", "user", "user_phone", "user_name",
                  "amount_usd", "amount_uzs", "status", "status_display",
                  "card_last4", "description", "error_message",
                  "external_id", "created_at")


class AdminSubscriptionSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    days_left = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Subscription
        fields = ("id", "status", "status_display", "is_active", "days_left",
                  "started_at", "expires_at", "auto_renew", "monthly_price_usd",
                  "last_charge_at", "next_charge_at")


class AdminUserListSerializer(serializers.ModelSerializer):
    """User ro'yxati uchun qisqartirilgan serializer."""
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    subscription_status = serializers.SerializerMethodField()
    total_spent_uzs = serializers.SerializerMethodField()
    transactions_count = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    inactive_days = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "phone", "full_name", "first_name", "last_name",
                  "role", "city", "age", "gender", "has_card", "card_last4",
                  "profile_completed", "demand_access", "is_active", "avatar_url",
                  "subscription_status", "total_spent_uzs", "transactions_count",
                  "date_joined", "last_login", "last_seen",
                  "total_seconds_active", "inactive_days")

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        req = self.context.get("request")
        url = obj.avatar.url
        return req.build_absolute_uri(url) if req else url

    def get_inactive_days(self, obj):
        from django.utils import timezone
        if not obj.last_seen:
            return None
        delta = timezone.now() - obj.last_seen
        return delta.days

    def get_subscription_status(self, obj):
        sub = getattr(obj, "subscription", None)
        return sub.status if sub else None

    def get_total_spent_uzs(self, obj):
        return sum(t.amount_uzs for t in obj.transactions.filter(status="success"))

    def get_transactions_count(self, obj):
        return obj.transactions.count()


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Foydalanuvchining barcha ma'lumotlari."""
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    subscription = AdminSubscriptionSerializer(read_only=True)
    cards = AdminCardSerializer(many=True, read_only=True)
    transactions = serializers.SerializerMethodField()
    estimates_count = serializers.SerializerMethodField()
    total_spent_uzs = serializers.SerializerMethodField()
    failed_transactions = serializers.SerializerMethodField()
    activity_chart = serializers.SerializerMethodField()
    inactive_days = serializers.SerializerMethodField()
    sessions_count = serializers.SerializerMethodField()
    avg_session_seconds = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "phone", "username", "full_name", "first_name", "last_name",
                  "role", "city", "age", "date_of_birth", "gender",
                  "avatar_url", "home_lat", "home_lng",
                  "has_card", "card_last4", "profile_completed", "demand_access",
                  "is_active", "date_joined", "last_login", "last_seen",
                  "total_seconds_active", "inactive_days",
                  "sessions_count", "avg_session_seconds",
                  "subscription", "cards", "transactions", "activity_chart",
                  "estimates_count", "total_spent_uzs", "failed_transactions")

    def get_inactive_days(self, obj):
        from django.utils import timezone
        if not obj.last_seen:
            return None
        return (timezone.now() - obj.last_seen).days

    def get_sessions_count(self, obj):
        return obj.sessions.count()

    def get_avg_session_seconds(self, obj):
        sessions = obj.sessions.all()
        if not sessions:
            return 0
        total = sum(s.duration_seconds for s in sessions)
        return int(total / len(sessions))

    def get_activity_chart(self, obj):
        """Oxirgi 30 kunda kuniga nechi soniya aktiv bo'lganligi."""
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        chart = []
        for i in range(30):
            day_start = (now - timedelta(days=29 - i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            day_end = day_start + timedelta(days=1)
            day_sessions = obj.sessions.filter(
                started_at__gte=day_start, started_at__lt=day_end
            )
            seconds = sum(s.duration_seconds for s in day_sessions)
            chart.append({
                "date": day_start.date().isoformat(),
                "seconds": seconds,
                "minutes": round(seconds / 60, 1),
                "sessions": day_sessions.count(),
            })
        return chart

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        req = self.context.get("request")
        url = obj.avatar.url
        return req.build_absolute_uri(url) if req else url

    def get_transactions(self, obj):
        txns = obj.transactions.order_by("-created_at")[:50]
        return AdminTransactionSerializer(txns, many=True).data

    def get_estimates_count(self, obj):
        return obj.price_estimates.count()

    def get_total_spent_uzs(self, obj):
        return sum(t.amount_uzs for t in obj.transactions.filter(status="success"))

    def get_failed_transactions(self, obj):
        return obj.transactions.filter(status="failed").count()
