from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import timedelta
from apps.billing.models import Subscription, SubscriptionStatus, free_trial_days
from .models import Notification

User = get_user_model()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "kind", "title", "preview", "body", "is_read", "created_at")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = (
            "phone", "password", "password2", "first_name", "last_name",
            "role", "city",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Parollar mos kelmaydi"})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        # username = phone (default)
        validated_data.setdefault("username", validated_data["phone"])
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Bepul sinov muddati (settings.TAXINARX["FREE_TRIAL_DAYS"])
        Subscription.objects.create(
            user=user,
            status=SubscriptionStatus.TRIAL,
            expires_at=timezone.now() + timedelta(days=free_trial_days()),
        )
        return user


class PhoneTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Telefon raqam orqali login (username o'rniga)."""
    username_field = "phone"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["phone"] = user.phone
        return token


class UserSerializer(serializers.ModelSerializer):
    subscription = serializers.SerializerMethodField()
    age = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "phone", "first_name", "last_name", "full_name", "role", "city",
            "avatar", "avatar_url", "date_of_birth", "age", "gender",
            "profile_completed", "home_lat", "home_lng",
            "has_card", "card_last4", "subscription", "date_joined",
        )
        read_only_fields = ("id", "phone", "role", "date_joined", "subscription",
                            "age", "full_name", "avatar_url", "profile_completed")

    def get_subscription(self, obj):
        sub = getattr(obj, "subscription", None)
        if not sub:
            return None
        return {
            "status": sub.status,
            "is_active": sub.is_active,
            "days_left": sub.days_left,
            "expires_at": sub.expires_at,
            "auto_renew": sub.auto_renew,
        }

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request else url


class ChangePasswordSerializer(serializers.Serializer):
    """Joriy parolni tekshirib, yangi parolga almashtiradi."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    new_password2 = serializers.CharField(write_only=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Joriy parol noto'g'ri")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password2": "Yangi parollar mos kelmaydi"})
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "Yangi parol eskisidan farq qilishi kerak"})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class ProfileCompletionSerializer(serializers.ModelSerializer):
    """Ro'yxatdan o'tgandan keyin profile to'ldirish."""

    class Meta:
        model = User
        fields = ("first_name", "last_name", "date_of_birth", "gender", "avatar")

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.profile_completed = True
        instance.save()
        return instance
