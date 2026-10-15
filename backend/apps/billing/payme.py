"""Payme Merchant API (JSON-RPC) integratsiyasi.

Payme o'zi bizga so'rov yuboradi: CheckPerformTransaction, CreateTransaction,
PerformTransaction, CancelTransaction, CheckTransaction, GetStatement.
Biz faqat JSON-RPC formatida javob qaytaramiz. To'lov formasi — Payme'ning
standart checkout oynasi (karta ilovada kiritilmaydi).

Hujjat: https://developer.help.paycom.uz/metody-merchant-api/
"""
import base64
import time

from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Subscription,
    Transaction,
    TransactionStatus,
    PaymeState,
)

# Tranzaksiya yaratilgach to'lash uchun maksimal vaqt (Payme standarti — 12 soat)
PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000


def now_ms() -> int:
    return int(time.time() * 1000)


def checkout_url(order_id: int, amount_uzs: int) -> str:
    """Payme checkout havolasini yasaydi (summa tiyinda yuboriladi)."""
    params = f"m={settings.PAYME_MERCHANT_ID};ac.order_id={order_id};a={amount_uzs * 100};l=uz"
    encoded = base64.b64encode(params.encode()).decode()
    return f"{settings.PAYME_CHECKOUT_URL}/{encoded}"


class PaymeError(Exception):
    def __init__(self, code: int, message: str, data: str | None = None):
        self.code = code
        self.message = message
        self.data = data


# Payme xato kodlari
ERR_AUTH = -32504
ERR_METHOD_NOT_FOUND = -32601
ERR_INVALID_AMOUNT = -31001
ERR_TXN_NOT_FOUND = -31003
ERR_CANNOT_PERFORM = -31008
ERR_ORDER_NOT_FOUND = -31050  # account xatolari oralig'i: -31050..-31099


class PaymeWebhookView(APIView):
    """Payme'dan keladigan barcha JSON-RPC so'rovlar uchun yagona endpoint."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        rpc_id = payload.get("id")

        if not self._check_auth(request):
            return self._error(rpc_id, ERR_AUTH, "Avtorizatsiya xatosi")

        method = payload.get("method") or ""
        params = payload.get("params") or {}

        handlers = {
            "CheckPerformTransaction": self._check_perform,
            "CreateTransaction": self._create,
            "PerformTransaction": self._perform,
            "CancelTransaction": self._cancel,
            "CheckTransaction": self._check,
            "GetStatement": self._statement,
        }
        handler = handlers.get(method)
        if handler is None:
            return self._error(rpc_id, ERR_METHOD_NOT_FOUND, f"Metod topilmadi: {method}")

        try:
            result = handler(params)
        except PaymeError as e:
            return self._error(rpc_id, e.code, e.message, e.data)

        return Response({"jsonrpc": "2.0", "id": rpc_id, "result": result})

    # ---------- yordamchilar ----------

    def _check_auth(self, request) -> bool:
        """Authorization: Basic base64('Paycom:KEY') — prod va test kalitlar."""
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header.startswith("Basic "):
            return False
        try:
            decoded = base64.b64decode(header[6:]).decode()
        except Exception:
            return False
        valid_keys = {k for k in (settings.PAYME_KEY, settings.PAYME_TEST_KEY) if k}
        return any(decoded == f"Paycom:{key}" for key in valid_keys)

    def _error(self, rpc_id, code, message, data=None):
        err = {"code": code, "message": {"uz": message, "ru": message, "en": message}}
        if data:
            err["data"] = data
        return Response({"jsonrpc": "2.0", "id": rpc_id, "error": err})

    def _get_order(self, params) -> Transaction:
        """account.order_id bo'yicha buyurtmani topish va summani tekshirish."""
        account = params.get("account") or {}
        order_id = account.get("order_id")
        try:
            txn = Transaction.objects.get(id=int(order_id))
        except (Transaction.DoesNotExist, TypeError, ValueError):
            raise PaymeError(ERR_ORDER_NOT_FOUND, "Buyurtma topilmadi", "order_id")
        if params.get("amount") != txn.amount_uzs * 100:
            raise PaymeError(ERR_INVALID_AMOUNT, "Noto'g'ri summa")
        return txn

    def _get_by_payme_id(self, params) -> Transaction:
        try:
            return Transaction.objects.get(payme_id=params.get("id"))
        except Transaction.DoesNotExist:
            raise PaymeError(ERR_TXN_NOT_FOUND, "Tranzaksiya topilmadi")

    @staticmethod
    def _get_detail(txn: Transaction) -> dict:
        title = f"TaxiScan obunasi ({txn.amount_uzs} so'm)"
        return {
            "receipt_type": 0,
            "items": [
                {
                    "title": title,
                    "price": txn.amount_uzs * 100,
                    "count": 1,
                    "code": "10802001001000000",
                    "package_code": "1236069",
                    "units": "1236069",
                    "vat_percent": 0,
                }
            ],
        }

    def _txn_result(self, txn: Transaction) -> dict:
        res = {
            "create_time": txn.payme_create_time,
            "perform_time": txn.payme_perform_time,
            "cancel_time": txn.payme_cancel_time,
            "transaction": str(txn.id),
            "state": txn.payme_state,
            "reason": txn.cancel_reason,
        }
        if txn.payme_state in (PaymeState.CREATED, PaymeState.PERFORMED):
            res["detail"] = self._get_detail(txn)
        return res

    # ---------- JSON-RPC metodlar ----------

    def _check_perform(self, params):
        txn = self._get_order(params)
        if txn.payme_state == PaymeState.PERFORMED:
            raise PaymeError(ERR_ORDER_NOT_FOUND, "Buyurtma allaqachon to'langan", "order_id")
        return {
            "allow": True,
            "detail": self._get_detail(txn),
        }

    def _create(self, params):
        payme_id = params.get("id")

        # Idempotentlik: shu payme_id bilan tranzaksiya bo'lsa — holatini qaytaramiz
        existing = Transaction.objects.filter(payme_id=payme_id).first()
        if existing:
            if existing.payme_state != PaymeState.CREATED:
                raise PaymeError(ERR_CANNOT_PERFORM, "Tranzaksiya yaroqsiz holatda")
            if now_ms() - existing.payme_create_time > PAYME_TIMEOUT_MS:
                existing.payme_state = PaymeState.CANCELLED
                existing.payme_cancel_time = now_ms()
                existing.cancel_reason = 4  # timeout
                existing.status = TransactionStatus.FAILED
                existing.save()
                raise PaymeError(ERR_CANNOT_PERFORM, "Tranzaksiya muddati o'tgan")
            return self._txn_result(existing)

        txn = self._get_order(params)
        # Bitta buyurtmaga faqat bitta faol Payme tranzaksiyasi bo'lishi mumkin
        if txn.payme_id and txn.payme_id != payme_id:
            raise PaymeError(ERR_ORDER_NOT_FOUND, "Buyurtma boshqa tranzaksiyada band", "order_id")
        if txn.status != TransactionStatus.PENDING:
            raise PaymeError(ERR_CANNOT_PERFORM, "Buyurtma to'lovga tayyor emas")

        txn.payme_id = payme_id
        txn.payme_state = PaymeState.CREATED
        txn.payme_create_time = now_ms()
        txn.external_id = f"payme_{payme_id}"
        txn.save()
        return self._txn_result(txn)

    def _perform(self, params):
        txn = self._get_by_payme_id(params)

        if txn.payme_state == PaymeState.PERFORMED:
            return self._txn_result(txn)  # idempotent
        if txn.payme_state != PaymeState.CREATED:
            raise PaymeError(ERR_CANNOT_PERFORM, "Tranzaksiya yaroqsiz holatda")
        if now_ms() - txn.payme_create_time > PAYME_TIMEOUT_MS:
            txn.payme_state = PaymeState.CANCELLED
            txn.payme_cancel_time = now_ms()
            txn.cancel_reason = 4
            txn.status = TransactionStatus.FAILED
            txn.save()
            raise PaymeError(ERR_CANNOT_PERFORM, "Tranzaksiya muddati o'tgan")

        txn.payme_state = PaymeState.PERFORMED
        txn.payme_perform_time = now_ms()
        txn.status = TransactionStatus.SUCCESS
        txn.save()

        # Obunani uzaytirish
        sub = txn.subscription
        if sub is None:
            sub, _ = Subscription.objects.get_or_create(
                user=txn.user,
                defaults={"expires_at": timezone.now()},
            )
            txn.subscription = sub
            txn.save(update_fields=["subscription"])
        period = settings.TAXINARX.get("SUBSCRIPTION_PERIOD_DAYS", 30)
        sub.extend(days=period)
        if sub.discount_percent:
            sub.discount_percent = 0  # promo chegirma ishlatildi
            sub.save(update_fields=["discount_percent"])

        return self._txn_result(txn)

    def _cancel(self, params):
        txn = self._get_by_payme_id(params)
        reason = params.get("reason")

        if txn.payme_state == PaymeState.CREATED:
            txn.payme_state = PaymeState.CANCELLED
            txn.status = TransactionStatus.FAILED
        elif txn.payme_state == PaymeState.PERFORMED:
            # To'lov qaytarildi — berilgan kunlarni obunadan olib tashlaymiz
            txn.payme_state = PaymeState.CANCELLED_AFTER_PERFORM
            txn.status = TransactionStatus.REFUNDED
            sub = txn.subscription
            if sub:
                period = settings.TAXINARX.get("SUBSCRIPTION_PERIOD_DAYS", 30)
                sub.expires_at = sub.expires_at - timedelta(days=period)
                sub.next_charge_at = sub.expires_at
                sub.save(update_fields=["expires_at", "next_charge_at"])
        elif txn.payme_state in (PaymeState.CANCELLED, PaymeState.CANCELLED_AFTER_PERFORM):
            return self._txn_result(txn)  # idempotent
        else:
            raise PaymeError(ERR_CANNOT_PERFORM, "Tranzaksiya yaroqsiz holatda")

        txn.payme_cancel_time = now_ms()
        txn.cancel_reason = reason
        txn.save()
        return self._txn_result(txn)

    def _check(self, params):
        txn = self._get_by_payme_id(params)
        return self._txn_result(txn)

    def _statement(self, params):
        frm = params.get("from") or 0
        to = params.get("to") or now_ms()
        txns = Transaction.objects.filter(
            payme_create_time__gte=frm,
            payme_create_time__lte=to,
        ).exclude(payme_id="")
        return {
            "transactions": [
                {
                    "id": t.payme_id,
                    "time": t.payme_create_time,
                    "amount": t.amount_uzs * 100,
                    "account": {"order_id": str(t.id)},
                    "create_time": t.payme_create_time,
                    "perform_time": t.payme_perform_time,
                    "cancel_time": t.payme_cancel_time,
                    "transaction": str(t.id),
                    "state": t.payme_state,
                    "reason": t.cancel_reason,
                }
                for t in txns
            ]
        }
