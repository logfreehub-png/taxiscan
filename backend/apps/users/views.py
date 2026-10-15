import random

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .serializers import (
    RegisterSerializer,
    PhoneTokenObtainPairSerializer,
    UserSerializer,
    ProfileCompletionSerializer,
    ChangePasswordSerializer,
    NotificationSerializer,
)
from .models import Notification
from . import reminders as reminder_utils

User = get_user_model()


class NotificationListView(generics.ListAPIView):
    """Foydalanuvchining bildirishnomalari. So'rovda eslatmalar yangilanadi."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # oddiy massiv qaytaramiz (sahifalashsiz)

    def get_queryset(self):
        # Har so'rovda foydalanuvchiga tegishli dinamik eslatmalarni (obuna tugashi) tekshiramiz
        try:
            reminder_utils.ensure_subscription_reminders(self.request.user)
        except Exception:
            pass
        return Notification.objects.filter(user=self.request.user)[:50]


class NotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            reminder_utils.ensure_subscription_reminders(request.user)
        except Exception:
            pass
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread": count})


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids")
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if ids:
            qs = qs.filter(id__in=ids)
        updated = qs.update(is_read=True)
        return Response({"marked": updated})


class PushTokenView(APIView):
    """Mobil ilova Expo push tokenini saqlaydi (telefon bildirishnomasi uchun)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        if not token:
            return Response({"detail": "Token kerak"}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.expo_push_token != token:
            request.user.expo_push_token = token
            request.user.save(update_fields=["expo_push_token"])
        return Response({"detail": "Saqlandi"})


class ChangePasswordView(generics.GenericAPIView):
    """Joriy parolni tekshirib, yangi parolni o'rnatadi."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Parol muvaffaqiyatli o'zgartirildi"}, status=status.HTTP_200_OK)


def _pwreset_key(user_id):
    return f"pwreset:{user_id}"


def _mask_email(email):
    name, _, domain = email.partition("@")
    if not domain:
        return email
    return f"{name[:2]}***@{domain}"


def _mask_phone(phone):
    return f"{phone[:5]}****{phone[-2:]}" if len(phone) > 7 else phone


class PasswordResetRequestView(APIView):
    """Parolni o'zgartirish uchun email yoki telefon raqamiga tasdiqlash kodi yuboradi.

    Kod 10 daqiqa amal qiladi. Email mavjud bo'lsa email orqali, aks holda telefon
    orqali yuboriladi (telefon uchun SMS-provayder ulanishi kerak).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        code = f"{random.randint(0, 999999):06d}"
        cache.set(_pwreset_key(user.id), code, timeout=600)

        if user.email:
            channel, sent_to = "email", _mask_email(user.email)
            try:
                send_mail(
                    subject="TaxiNarx — parolni o'zgartirish kodi",
                    message=f"Sizning tasdiqlash kodingiz: {code}\nKod 10 daqiqa amal qiladi.",
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@taxinarx.uz"),
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception:
                pass
        else:
            channel, sent_to = "phone", _mask_phone(user.phone)
            # SMS-provayder ulanmagan — kodni konsolga yozamiz (dev)
            print(f"[PWRESET] {user.phone} uchun kod: {code}")

        resp = {"detail": "Tasdiqlash kodi yuborildi", "channel": channel, "sent_to": sent_to}
        # Faqat DEBUG rejimida kodni qaytaramiz (sinov uchun)
        if settings.DEBUG:
            resp["debug_code"] = code
        return Response(resp)


class PasswordResetConfirmView(APIView):
    """Yuborilgan kodni tekshirib, yangi parolni o'rnatadi."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        code = str(request.data.get("code", "")).strip()
        new_password = request.data.get("new_password", "")
        new_password2 = request.data.get("new_password2", "")

        saved = cache.get(_pwreset_key(user.id))
        if not saved:
            return Response({"detail": "Kod muddati tugagan. Qaytadan so'rang."}, status=status.HTTP_400_BAD_REQUEST)
        if code != saved:
            return Response({"code": "Kod noto'g'ri"}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({"new_password": "Parol kamida 6 ta belgidan iborat bo'lsin"}, status=status.HTTP_400_BAD_REQUEST)
        if new_password != new_password2:
            return Response({"new_password2": "Parollar mos kelmaydi"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        cache.delete(_pwreset_key(user.id))
        return Response({"detail": "Parol muvaffaqiyatli o'zgartirildi"})


def _normalize_phone(raw):
    """Kiritilgan telefon raqamni bazadagi formatga yaqinlashtiradi (+998XXXXXXXXX)."""
    if not raw:
        return ""
    raw = str(raw).strip()
    has_plus = raw.startswith("+")
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""
    return ("+" + digits) if has_plus else digits


def _find_user_by_phone(phone):
    """Telefon raqam bo'yicha foydalanuvchini topadi (+ bilan yoki +siz)."""
    if not phone:
        return None
    candidates = {phone}
    if phone.startswith("+"):
        candidates.add(phone[1:])
    else:
        candidates.add("+" + phone)
    return User.objects.filter(phone__in=list(candidates)).first()


class DeleteAccountLookupView(APIView):
    """Telefon raqam bo'yicha hisobni qidiradi (o'chirishdan oldingi 1-qadam)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get("phone"))
        if not phone:
            return Response({"detail": "Telefon raqam kiriting"}, status=status.HTTP_400_BAD_REQUEST)
        user = _find_user_by_phone(phone)
        if not user:
            return Response({"found": False})
        return Response({
            "found": True,
            "full_name": user.full_name,
            "phone": _mask_phone(user.phone),
            "role": user.get_role_display(),
        })


class DeleteAccountVerifyView(APIView):
    """Parolni tekshiradi (o'chirishdan oldingi 2-qadam)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get("phone"))
        password = request.data.get("password") or ""
        user = _find_user_by_phone(phone)
        if not user or not user.check_password(password):
            return Response({"valid": False, "detail": "Parol noto'g'ri"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"valid": True})


class DeleteAccountConfirmView(APIView):
    """Parolni qayta tekshirib, hisobni butunlay o'chiradi (yakuniy qadam)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get("phone"))
        password = request.data.get("password") or ""
        user = _find_user_by_phone(phone)
        if not user or not user.check_password(password):
            return Response({"detail": "Parol noto'g'ri"}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({"detail": "Hisobingiz butunlay o'chirildi"}, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["phone"] = user.phone

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = PhoneTokenObtainPairSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class ProfileCompletionView(generics.UpdateAPIView):
    """Ro'yxatdan o'tgandan keyin foydalanuvchi profilini to'ldiradi yoki o'tkazib yuboradi."""
    serializer_class = ProfileCompletionSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class SimpleRegisterView(generics.CreateAPIView):
    """Telefon + parol bilan tezkor ro'yxatdan o'tish (profile keyin to'ldiriladi)."""
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        # Faqat phone, password, role majburiy
        data = {
            "phone": request.data.get("phone"),
            "password": request.data.get("password"),
            "password2": request.data.get("password2") or request.data.get("password"),
            "role": request.data.get("role", "passenger"),
            "first_name": request.data.get("first_name", ""),
            "last_name": request.data.get("last_name", ""),
            "city": request.data.get("city", "Tashkent"),
        }
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["phone"] = user.phone

        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "needs_profile": not user.profile_completed,
            },
            status=status.HTTP_201_CREATED,
        )
