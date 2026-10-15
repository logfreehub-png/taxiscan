from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.billing.models import Transaction, Subscription, Card
from apps.taxi.models import PriceEstimate, DriverPanelSettings
from apps.taxi import demand as taxi_demand
from apps.users import notifications as notif_utils
from apps.users.models import NotificationKind, NotificationBatch, Notification

from .permissions import IsAdminRole
from .serializers import (
    AdminUserListSerializer,
    AdminUserDetailSerializer,
    AdminTransactionSerializer,
)

User = get_user_model()


class StandardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class DashboardView(APIView):
    """Bosh statistika — daromad, foydalanuvchilar, so'rovlar."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        now = timezone.now()
        d7 = now - timedelta(days=7)
        d30 = now - timedelta(days=30)
        d1 = now - timedelta(days=1)

        users_total = User.objects.count()
        passengers = User.objects.filter(role="passenger").count()
        drivers = User.objects.filter(role="driver").count()
        users_new_7 = User.objects.filter(date_joined__gte=d7).count()
        users_new_30 = User.objects.filter(date_joined__gte=d30).count()
        never_logged_in = User.objects.filter(last_login__isnull=True, role__in=["passenger", "driver"]).count()
        profile_incomplete = User.objects.filter(profile_completed=False, role__in=["passenger", "driver"]).count()
        active_subs = Subscription.objects.filter(status="active").count()
        trial_subs = Subscription.objects.filter(status="trial").count()

        # Daromad
        all_success = Transaction.objects.filter(status="success")
        rev_total_uzs = all_success.aggregate(s=Sum("amount_uzs"))["s"] or 0
        rev_7_uzs = all_success.filter(created_at__gte=d7).aggregate(s=Sum("amount_uzs"))["s"] or 0
        rev_30_uzs = all_success.filter(created_at__gte=d30).aggregate(s=Sum("amount_uzs"))["s"] or 0
        rev_today_uzs = all_success.filter(created_at__gte=d1).aggregate(s=Sum("amount_uzs"))["s"] or 0
        rev_total_usd = float(all_success.aggregate(s=Sum("amount_usd"))["s"] or 0)

        # Tranzaksiya statistikasi
        txn_stats = {
            "total": Transaction.objects.count(),
            "success": Transaction.objects.filter(status="success").count(),
            "failed": Transaction.objects.filter(status="failed").count(),
            "pending": Transaction.objects.filter(status="pending").count(),
            "refunded": Transaction.objects.filter(status="refunded").count(),
        }

        # So'rovlar
        estimates_total = PriceEstimate.objects.count()
        estimates_7 = PriceEstimate.objects.filter(created_at__gte=d7).count()
        estimates_30 = PriceEstimate.objects.filter(created_at__gte=d30).count()

        # Kunlik daromad (oxirgi 30 kun)
        daily_revenue = []
        for i in range(30):
            day_start = (now - timedelta(days=29 - i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_rev = all_success.filter(
                created_at__gte=day_start, created_at__lt=day_end
            ).aggregate(s=Sum("amount_uzs"))["s"] or 0
            day_users = User.objects.filter(
                date_joined__gte=day_start, date_joined__lt=day_end
            ).count()
            daily_revenue.append({
                "date": day_start.date().isoformat(),
                "revenue_uzs": int(day_rev),
                "new_users": day_users,
            })

        return Response({
            "users": {
                "total": users_total,
                "passengers": passengers,
                "drivers": drivers,
                "new_7d": users_new_7,
                "new_30d": users_new_30,
                "never_logged_in": never_logged_in,
                "profile_incomplete": profile_incomplete,
            },
            "subscriptions": {
                "active": active_subs,
                "trial": trial_subs,
            },
            "revenue": {
                "total_uzs": int(rev_total_uzs),
                "total_usd": rev_total_usd,
                "today_uzs": int(rev_today_uzs),
                "last_7d_uzs": int(rev_7_uzs),
                "last_30d_uzs": int(rev_30_uzs),
            },
            "transactions": txn_stats,
            "estimates": {
                "total": estimates_total,
                "last_7d": estimates_7,
                "last_30d": estimates_30,
            },
            "daily_chart": daily_revenue,
        })


class UserListView(generics.ListAPIView):
    """Yo'lovchilar yoki haydovchilar ro'yxati — filter va pagination bilan.

    Filterlar:
      - role: passenger|driver|admin
      - completed: true|false (profile_completed)
      - inactive_days: int (last_seen N kun oldin yoki yo'q)
      - q: qidiruv (phone, name)
      - sort: date_joined | last_seen | total_seconds_active
    """
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAdminRole]
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = User.objects.select_related("subscription").prefetch_related("transactions")
        params = self.request.query_params

        role = params.get("role")
        if role in ("passenger", "driver", "admin"):
            qs = qs.filter(role=role)
        else:
            qs = qs.exclude(role="admin")

        completed = params.get("completed")
        if completed == "true":
            qs = qs.filter(profile_completed=True)
        elif completed == "false":
            qs = qs.filter(profile_completed=False)

        inactive_days = params.get("inactive_days")
        if inactive_days:
            try:
                d = int(inactive_days)
                cutoff = timezone.now() - timedelta(days=d)
                qs = qs.filter(Q(last_seen__lt=cutoff) | Q(last_seen__isnull=True))
            except ValueError:
                pass

        never_logged_in = params.get("never_logged_in")
        if never_logged_in == "true":
            qs = qs.filter(last_login__isnull=True)

        search = params.get("q")
        if search:
            qs = qs.filter(
                Q(phone__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        sort = params.get("sort", "-date_joined")
        allowed_sort = {"-date_joined", "date_joined", "-last_seen", "last_seen",
                        "-total_seconds_active", "total_seconds_active"}
        if sort in allowed_sort:
            qs = qs.order_by(sort)
        else:
            qs = qs.order_by("-date_joined")

        return qs


class UserDetailView(generics.RetrieveUpdateAPIView):
    """Bitta foydalanuvchining barcha ma'lumotlari (PATCH: demand_access, is_active)."""
    serializer_class = AdminUserDetailSerializer
    permission_classes = [IsAdminRole]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return User.objects.select_related("subscription").prefetch_related("cards", "transactions")


class DriverPanelSettingsView(APIView):
    """Haydovchi paneli global sozlamasi — talab ma'lumotini yoqish/o'chirish."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        s = DriverPanelSettings.get_solo()
        return Response({"demand_enabled": s.demand_enabled, "updated_at": s.updated_at})

    def patch(self, request):
        s = DriverPanelSettings.get_solo()
        val = request.data.get("demand_enabled")
        if val is not None:
            s.demand_enabled = bool(val)
            s.save(update_fields=["demand_enabled", "updated_at"])
        return Response({"demand_enabled": s.demand_enabled, "updated_at": s.updated_at})


class AdminDemandView(APIView):
    """Admin uchun talab statistikasi — "Qayerda yo'lovchi ko'p"."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response({
            "window": taxi_demand.WINDOW_LABEL,
            "totals": taxi_demand.system_totals(),
            "regions": taxi_demand.build_overview(),
        })


class SendNotificationView(APIView):
    """Admin xabar yuboradi — hammaga (broadcast) yoki bitta foydalanuvchiga.

    Body: { title, body, kind?, sms?, target: "all"|"passengers"|"drivers"|"user", user_id? }
    """
    permission_classes = [IsAdminRole]

    def post(self, request):
        title = (request.data.get("title") or "").strip()
        preview = (request.data.get("preview") or "").strip()
        body = (request.data.get("body") or "").strip()
        kind = request.data.get("kind") or NotificationKind.ADMIN
        sms = bool(request.data.get("sms"))
        target = request.data.get("target") or "all"
        user_id = request.data.get("user_id")

        if not title:
            return Response({"detail": "Sarlavha kiriting"}, status=status.HTTP_400_BAD_REQUEST)

        batch = NotificationBatch.objects.create(
            title=title, preview=preview, body=body, kind=kind, target=target, sms=sms, created_by=request.user,
        )

        if target == "user":
            if not user_id:
                batch.delete()
                return Response({"detail": "Foydalanuvchi tanlang"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                u = User.objects.get(id=user_id)
            except User.DoesNotExist:
                batch.delete()
                return Response({"detail": "Foydalanuvchi topilmadi"}, status=status.HTTP_404_NOT_FOUND)
            notif_utils.notify(u, title=title, preview=preview, body=body, kind=kind, sms=sms, batch=batch)
            count = 1
        else:
            roles = None
            if target == "passengers":
                roles = ["passenger"]
            elif target == "drivers":
                roles = ["driver"]
            count = notif_utils.broadcast(title=title, preview=preview, body=body, kind=kind, roles=roles, sms=sms, batch=batch)

        batch.total = count
        batch.save(update_fields=["total"])
        return Response({"detail": f"{count} ta foydalanuvchiga yuborildi", "count": count})


class NotificationBatchDeleteView(APIView):
    """Admin yuborilgan xabar partiyasini (va unga tegishli bildirishnomalarni) o'chiradi."""
    permission_classes = [IsAdminRole]

    def delete(self, request, pk):
        try:
            b = NotificationBatch.objects.get(id=pk)
        except NotificationBatch.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=status.HTTP_404_NOT_FOUND)
        Notification.objects.filter(batch=b).delete()
        b.delete()
        return Response({"detail": "O'chirildi"})


class NotificationBatchListView(APIView):
    """Admin yuborgan xabarlar tarixi — har biri uchun: nechtaga yuborildi, nechta o'qildi."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        out = []
        for b in NotificationBatch.objects.all()[:50]:
            read = Notification.objects.filter(batch=b, is_read=True).count()
            out.append({
                "id": b.id,
                "title": b.title,
                "preview": b.preview,
                "body": b.body,
                "kind": b.kind,
                "target": b.target,
                "sms": b.sms,
                "total": b.total,
                "read": read,
                "unread": max(0, b.total - read),
                "created_at": b.created_at.isoformat(),
            })
        return Response({"results": out})


class TransactionListView(generics.ListAPIView):
    """Barcha tranzaksiyalar — filterlash bilan."""
    serializer_class = AdminTransactionSerializer
    permission_classes = [IsAdminRole]
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Transaction.objects.select_related("user").all()
        status = self.request.query_params.get("status")
        if status in ("success", "failed", "pending", "refunded"):
            qs = qs.filter(status=status)
        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        search = self.request.query_params.get("q")
        if search:
            qs = qs.filter(
                Q(user__phone__icontains=search) |
                Q(external_id__icontains=search) |
                Q(card_last4__icontains=search) |
                Q(description__icontains=search)
            )
        return qs.order_by("-created_at")
