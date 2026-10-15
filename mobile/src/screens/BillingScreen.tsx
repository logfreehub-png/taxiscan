import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Alert, Animated, Easing, ActivityIndicator, Linking, AppState, TextInput } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { apiGet, apiPost } from "@/lib/api/client";
import { useAuth } from "@/store/auth";
import { formatUzs, formatUzsShort, formatDateTime } from "@/lib/format";
import type { Subscription, Transaction, PaymeCheckout } from "@/lib/api/types";
import { useRouter } from "expo-router";
import { useI18n } from "@/i18n";

import { LanguageSwitchPill } from "@/components/LanguageSelectModal";

export function BillingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<PaymeCheckout | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [showSelectModal, setShowSelectModal] = useState(false);

  // Promo-kod (aksiya) holati
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Sparkles iconi uchun pulslanuvchi animatsiya
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const load = async () => {
    try {
      const [s, tData] = await Promise.all([
        apiGet<Subscription>("/billing/subscription/"),
        apiGet<{ results: Transaction[] }>("/billing/transactions/"),
      ]);
      setSub(s);
      setTxns(tData.results || []);
      await useAuth.getState().loadMe().catch(() => {});
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Payme ilovasiga o'tib kelgach, ilovaga qaytilganda to'lov holatini tekshirish
  useEffect(() => {
    if (!pendingOrderId) return;
    const checkStatus = async () => {
      try {
        const res = await apiGet<{ paid: boolean }>(`/billing/payme/status/?order_id=${pendingOrderId}`);
        if (res.paid) {
          setPendingOrderId(null);
          await load();
          Alert.alert(t("common.ready"), t("billing.paymentSuccess"));
        }
      } catch {
        /* ignore */
      }
    };

    const interval = setInterval(checkStatus, 3000);
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkStatus();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [pendingOrderId, t]);

  const priceUzs = sub?.monthly_price_uzs || 0;
  const isFree = priceUzs === 0 || ((sub?.discount_percent ?? 0) >= 100);

  /** Payme ilovasiga o'tib to'lash (Deep Link) */
  const openPaymeApp = async () => {
    setShowSelectModal(false);
    setBusy(true);
    try {
      const co = await apiPost<PaymeCheckout>("/billing/payme/checkout/", {});
      if (co.paid || co.amount_uzs === 0) {
        await load();
        await useAuth.getState().loadMe().catch(() => {});
        Alert.alert(t("common.ready"), co.detail || t("billing.paymentSuccess"));
        return;
      }
      setPendingOrderId(co.order_id);
      await Linking.openURL(co.checkout_url);
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.data?.detail || t("common.retry"));
    } finally {
      setBusy(false);
    }
  };

  /** Ilova ichida WebView orqali to'lash */
  const openWebView = async () => {
    setShowSelectModal(false);
    setBusy(true);
    try {
      const co = await apiPost<PaymeCheckout>("/billing/payme/checkout/", {});
      if (co.paid || co.amount_uzs === 0) {
        await load();
        await useAuth.getState().loadMe().catch(() => {});
        Alert.alert(t("common.ready"), co.detail || t("billing.paymentSuccess"));
        return;
      }
      setCheckout(co);
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.data?.detail || t("common.retry"));
    } finally {
      setBusy(false);
    }
  };

  const onPaid = () => {
    setCheckout(null);
    setPendingOrderId(null);
    load();
    Alert.alert(t("common.ready"), t("billing.paymentSuccess"));
  };

  /** Promo-kodni (aksiya) faollashtirish — bepul kun yoki chegirma */
  const redeemPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoBusy(true);
    setPromoMsg(null);
    try {
      const res = await apiPost<{ detail: string; activated?: boolean }>("/billing/promo/redeem/", { code });
      setPromoCode("");
      await load();
      await useAuth.getState().loadMe().catch(() => {});

      Alert.alert(t("common.ready"), res.detail || t("billing.promoSuccess"));
      setPromoMsg({ ok: true, text: res.detail || t("billing.promoSuccess") });
    } catch (err: any) {
      setPromoMsg({ ok: false, text: err?.data?.detail || t("billing.promoFailed") });
    } finally {
      setPromoBusy(false);
    }
  };

  const cancel = () => {
    Alert.alert(
      t("billing.cancelConfirmTitle"),
      t("billing.cancelConfirmMsg", { days: sub?.days_left || 0 }),
      [
        { text: t("billing.cancelNo"), style: "cancel" },
        {
          text: t("billing.cancelYes"),
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await apiPost("/billing/cancel/", {});
              await load();
              Alert.alert(t("common.ready"), t("billing.cancelSuccess"));
            } catch (err: any) {
              Alert.alert(t("common.error"), err?.data?.detail || t("common.error"));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header
        title={t("billing.title")}
        subtitle={priceUzs ? t("billing.premiumSubtitle", { price: formatUzs(priceUzs) }) : t("billing.subscribeTitle")}
        onBack={() => router.back()}
        right={<LanguageSwitchPill />}
      />

      <View style={[styles.premium, { backgroundColor: colors.black }]}>
        <View style={styles.premiumHead}>
          <View style={styles.premiumLabel}>
            <Ionicons name="diamond" size={16} color={colors.brand} />
            <Text style={[styles.premiumLabelTxt, { color: colors.brand }]}>
              {t("billing.subscribeTitle").toUpperCase()}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ scale: pulseScale }], opacity: pulseOpacity }}>
            <Ionicons name="sparkles" size={24} color={colors.brand} />
          </Animated.View>
        </View>
        <Text style={styles.premiumPrice}>
          {formatUzsShort(priceUzs)}
          <Text style={styles.premiumPer}>{t("billing.perMonth")}</Text>
        </Text>
        <Text style={styles.premiumSub}>{t("billing.safePay")}</Text>

        {sub ? (
          <View style={styles.subBox}>
            <SubRow label={t("billing.status")} value={sub.status_display} />
            <SubRow label={t("billing.left")} value={t("billing.daysLeft", { days: sub.days_left })} />
            <SubRow label={t("billing.expiresAt")} value={formatDateTime(sub.expires_at)} />
            <SubRow
              label={t("billing.nextCharge")}
              value={sub.auto_renew ? t("billing.autoRenewActive") : t("billing.autoRenewOff")}
            />
          </View>
        ) : null}

        {/* To'lash — Bitta tugma */}
        {(!sub || !sub.is_active || sub.days_left <= 3) ? (
          <Button
            title={isFree ? t("billing.activateFreeBtn") : t("billing.payBtn", { amount: formatUzs(priceUzs) })}
            onPress={() => {
              if (isFree) {
                openWebView();
              } else {
                setShowSelectModal(true);
              }
            }}
            loading={busy}
            style={{ marginTop: 16 }}
          />
        ) : (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              {t("billing.activeBadge", { days: sub.days_left })}
            </Text>
          </View>
        )}
        {sub?.auto_renew ? (
          <Pressable onPress={cancel} style={styles.cancelBtn}>
            <Ionicons name="close-circle-outline" size={15} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 13 }}>
              {t("billing.cancelNextPayment")}
            </Text>
          </Pressable>
        ) : sub?.is_active && !sub?.auto_renew ? (
          <View style={styles.autoRenewOffBox}>
            <Ionicons name="shield-outline" size={15} color="rgba(255,255,255,0.6)" />
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" }}>
              {t("billing.nextCharge")}: {t("billing.autoRenewOff")}
            </Text>
          </View>
        ) : null}

        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={15} color="rgba(255,255,255,0.6)" style={{ marginTop: 1 }} />
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, flex: 1, lineHeight: 16 }}>
            {t("billing.nextChargeNotice")}
          </Text>
        </View>

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark" size={14} color={colors.brand} />
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
            {t("billing.secureNotice")}
          </Text>
        </View>
      </View>

      {/* Promo-kod (aksiya) */}
      <Card padded>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ionicons name="gift-outline" size={18} color={colors.brandDark} />
          <Text style={[styles.blockTitle, { color: colors.ink }]}>{t("billing.promoCode")}</Text>
        </View>
        <Text style={{ color: colors.inkMuted, fontSize: 12, marginBottom: 10 }}>
          {t("billing.promoSubtitle")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={promoCode}
            onChangeText={(txt) => setPromoCode(txt.toUpperCase())}
            placeholder={t("billing.promoPlaceholder")}
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="characters"
            style={[styles.promoInput, { backgroundColor: colors.cardAlt, borderColor: colors.line, color: colors.ink }]}
          />
          <Pressable
            onPress={redeemPromo}
            disabled={promoBusy || !promoCode.trim()}
            style={[styles.promoBtn, { backgroundColor: colors.brand, opacity: promoBusy || !promoCode.trim() ? 0.6 : 1 }]}
          >
            {promoBusy ? (
              <ActivityIndicator size="small" color="#0F1216" />
            ) : (
              <Text style={{ color: "#0F1216", fontWeight: "900", fontSize: 14 }}>{t("billing.activate")}</Text>
            )}
          </Pressable>
        </View>
        {promoMsg ? (
          <View style={[styles.promoMsg, { backgroundColor: promoMsg.ok ? colors.greenBg : colors.redBg }]}>
            <Ionicons
              name={promoMsg.ok ? "checkmark-circle" : "close-circle"}
              size={16}
              color={promoMsg.ok ? colors.green : colors.red}
            />
            <Text style={{ color: promoMsg.ok ? colors.green : colors.red, fontSize: 12, flex: 1 }}>
              {promoMsg.text}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card padded>
        <Text style={[styles.blockTitle, { color: colors.ink, marginBottom: 12 }]}>
          {t("billing.history")}
        </Text>
        {txns.length === 0 ? (
          <Text style={{ color: colors.inkMuted, fontSize: 13, textAlign: "center", paddingVertical: 14 }}>
            {t("billing.noHistory")}
          </Text>
        ) : (
          txns.map((txn) => {
            const icon =
              txn.status === "success" ? "checkmark-circle" : txn.status === "failed" ? "close-circle" : "time";
            const color =
              txn.status === "success" ? colors.green : txn.status === "failed" ? colors.red : colors.orange;
            return (
              <View key={txn.id} style={[styles.txn, { borderBottomColor: colors.line }]}>
                <Ionicons name={icon as any} size={20} color={color} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }} numberOfLines={1}>
                    {txn.description}
                  </Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 11, marginTop: 1 }}>
                    {formatDateTime(txn.created_at)} · {txn.status_display}
                  </Text>
                  {txn.error_message ? (
                    <Text style={{ color: colors.red, fontSize: 11, marginTop: 1 }}>{txn.error_message}</Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 14 }}>
                  {formatUzs(txn.amount_uzs)}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      {/* To'lov usulini tanlash modali */}
      <SelectPaymentModal
        visible={showSelectModal}
        amountUzs={priceUzs}
        onClose={() => setShowSelectModal(false)}
        onPaymeApp={openPaymeApp}
        onWebView={openWebView}
      />

      <PaymeModal
        checkout={checkout}
        onClose={() => { setCheckout(null); load(); }}
        onPaid={onPaid}
      />
    </Screen>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.subRow}>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

/** Payme checkout oynasi — WebView ochiq turganda backend'dan to'lov holati so'rab turiladi. */
function PaymeModal({
  checkout,
  onClose,
  onPaid,
}: {
  checkout: PaymeCheckout | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!checkout) return;
    const timer = setInterval(async () => {
      try {
        const s = await apiGet<{ paid: boolean }>(
          `/billing/payme/status/?order_id=${checkout.order_id}`
        );
        if (s.paid) {
          clearInterval(timer);
          onPaid();
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [checkout]);

  return (
    <Modal visible={!!checkout} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={[styles.paymeHead, { borderBottomColor: colors.line }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="card" size={20} color={colors.ink} />
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
              Payme — {checkout ? formatUzs(checkout.amount_uzs) : ""}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        {checkout ? (
          <WebView
            source={{ uri: checkout.checkout_url }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webLoading}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={{ color: colors.inkMuted, marginTop: 12, fontSize: 13 }}>
                  {t("billing.loadingPayme")}
                </Text>
              </View>
            )}
            onNavigationStateChange={async (navState) => {
              if (navState.url && (navState.url.includes("success") || navState.url.includes("taxiscan"))) {
                try {
                  const s = await apiGet<{ paid: boolean }>(
                    `/billing/payme/status/?order_id=${checkout.order_id}`
                  );
                  if (s.paid) {
                    onPaid();
                  }
                } catch {
                  /* ignore */
                }
              }
            }}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

/** To'lov usullarini tanlash modali (Payme, Click, Paynet) */
function SelectPaymentModal({
  visible,
  amountUzs,
  onClose,
  onPaymeApp,
  onWebView,
}: {
  visible: boolean;
  amountUzs: number;
  onClose: () => void;
  onPaymeApp: () => void;
  onWebView: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.methodModalContent, { backgroundColor: colors.black, paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalIndicator} />
          
          <View style={styles.methodModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodModalTitle}>{t("billing.choosePaymentMethod")}</Text>
              <Text style={styles.methodModalSub}>
                {t("billing.planPrice")} <Text style={{ color: "#fff", fontWeight: "900" }}>{formatUzs(amountUzs)}</Text>
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* 1. Payme — Active */}
          <Pressable onPress={onPaymeApp} style={styles.paymeActiveCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.methodIconBox, { backgroundColor: "#00CCCC" }]}>
                <Ionicons name="card" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Payme</Text>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeTxt}>{t("billing.activeLabel")}</Text>
                  </View>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 }}>
                  {t("billing.paymeInstant")}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <View style={styles.paymeActionBtnPrimary}>
                <Ionicons name="card-outline" size={16} color="#000" />
                <Text style={{ color: "#000", fontWeight: "900", fontSize: 14 }}>
                  {t("billing.payNow")}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* 2. Click — Disabled */}
          <View style={styles.disabledCard}>
            <View style={[styles.methodIconBox, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
              <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.3)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "800", fontSize: 15 }}>Click</Text>
              <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 1 }}>{t("billing.clickDesc")}</Text>
            </View>
            <View style={styles.comingBadge}>
              <Text style={styles.comingBadgeTxt}>{t("billing.soonLabel")}</Text>
            </View>
          </View>

          {/* 3. Paynet — Disabled */}
          <View style={styles.disabledCard}>
            <View style={[styles.methodIconBox, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
              <Ionicons name="cash-outline" size={22} color="rgba(255,255,255,0.3)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "800", fontSize: 15 }}>Paynet</Text>
              <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 1 }}>{t("billing.paynetDesc")}</Text>
            </View>
            <View style={styles.comingBadge}>
              <Text style={styles.comingBadgeTxt}>{t("billing.soonLabel")}</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  premium: { borderRadius: radius.lg, padding: 18 },
  premiumHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  premiumLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  premiumLabelTxt: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  premiumPrice: { color: "#fff", fontSize: 40, fontWeight: "900", marginTop: 8 },
  premiumPer: { fontSize: 18, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  premiumSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  subBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  subRow: { flexDirection: "row", justifyContent: "space-between" },
  activeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 6,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  autoRenewOffBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  blockTitle: { fontSize: 15, fontWeight: "800" },
  promoInput: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  promoBtn: {
    paddingHorizontal: 16,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  promoMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: radius.md,
  },
  secure: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paymeHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  webFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  methodModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 8,
  },
  methodModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  methodModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  methodModalSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  paymeActiveCard: {
    backgroundColor: "rgba(0, 204, 204, 0.12)",
    borderColor: "#00CCCC",
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 14,
  },
  disabledCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    opacity: 0.6,
  },
  methodIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    backgroundColor: "#00CCCC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeTxt: {
    color: "#000",
    fontSize: 9,
    fontWeight: "900",
  },
  comingBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingBadgeTxt: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "800",
  },
  paymeActionBtnPrimary: {
    backgroundColor: "#00CCCC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  paymeActionBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
});
