import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { shadow } from "@/theme/shadow";
import { useI18n } from "@/i18n";
import { apiGet, apiPost } from "@/lib/api/client";

interface Props {
  visible: boolean;
  phone: string;
  sessionId: string;
  botUrl?: string;
  botUsername?: string;
  onClose: () => void;
  onVerified: (sessionId: string) => void;
  onResend?: () => Promise<void>;
}

export function PhoneVerificationModal({
  visible,
  phone,
  sessionId,
  botUrl,
  botUsername = "TaxiScan_auth_bot",
  onClose,
  onVerified,
  onResend,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [code, setCode] = useState("");
  const [submittingCode, setSubmittingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Telegram pulsatsiya animatsiyasi
  useEffect(() => {
    if (visible && !verifiedSuccess) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, verifiedSuccess]);

  // Taymer hisobi
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [visible, countdown]);

  // Telegram bot orqali tasdiqlanganini tekshiruvchi Polling
  useEffect(() => {
    if (!visible || !sessionId || verifiedSuccess) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await apiGet<{ verified: boolean }>(
          `/auth/phone/check-status/?session_id=${sessionId}`,
          { auth: false }
        );
        if (res && res.verified) {
          setVerifiedSuccess(true);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onVerified(sessionId);
          }, 800);
        }
      } catch {
        // Polling xatoliklarini e'tiborsiz qoldiramiz
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, 2000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [visible, sessionId, verifiedSuccess]);

  const handleOpenTelegram = async () => {
    const targetUrl = botUrl || `https://t.me/${botUsername}?start=auth_${sessionId}`;
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(`https://t.me/${botUsername}`);
      }
    } catch {
      await Linking.openURL(`https://t.me/${botUsername}`);
    }
  };

  const handleVerifyManualCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setError("Iltimos, 6 xonali kodni kiriting");
      return;
    }

    setSubmittingCode(true);
    setError(null);
    try {
      const res = await apiPost<{ verified: boolean }>(
        "/auth/phone/verify-code/",
        { session_id: sessionId, code: trimmed, phone },
        { auth: false }
      );
      if (res && res.verified) {
        setVerifiedSuccess(true);
        setTimeout(() => {
          onVerified(sessionId);
        }, 600);
      }
    } catch (err: any) {
      setError(err?.data?.detail || t("auth.codeInvalid") || "Tasdiqlash kodi noto'g'ri");
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !onResend) return;
    setCanResend(false);
    setCountdown(60);
    setError(null);
    setCode("");
    try {
      await onResend();
    } catch {
      setError("Kodni qayta yuborib bo'lmadi");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.line,
                  paddingBottom: Math.max(insets.bottom + 16, 24),
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleWrap}>
                  <Text style={[styles.title, { color: colors.ink }]}>
                    {t("auth.verifyTitle")}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
                    {phone} raqamiga tasdiqlash
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={[styles.closeBtn, { backgroundColor: colors.cardAlt }]}
                >
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>

              {verifiedSuccess ? (
                /* Muvaffaqiyat holati */
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                  <Text style={[styles.successTitle, { color: colors.ink }]}>
                    {t("auth.verifiedSuccess")}
                  </Text>
                  <Text style={[styles.successSubtitle, { color: colors.inkMuted }]}>
                    Iltimos, kuting... Tizimga ulanmoqda
                  </Text>
                  <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 12 }} />
                </View>
              ) : (
                /* Tasdiqlash bloklari */
                <View style={styles.content}>
                  {/* Telegram Bot Card */}
                  <View style={[styles.telegramCard, { backgroundColor: "#0088cc10", borderColor: "#0088cc40" }]}>
                    <View style={styles.tgHeader}>
                      <View style={styles.tgIconWrap}>
                        <Ionicons name="paper-plane" size={20} color="#0088cc" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tgTitle}>Telegram Bot orqali 1-tugmada</Text>
                        <Text style={styles.tgSub}>@{botUsername} botida kontakt ulashing</Text>
                      </View>
                    </View>

                    <Animated.View style={{ transform: [{ scale: pulseAnim }], width: "100%" }}>
                      <Pressable
                        onPress={handleOpenTelegram}
                        style={({ pressed }) => [
                          styles.tgButton,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.tgButtonTxt}>Telegram botni ochish</Text>
                      </Pressable>
                    </Animated.View>

                    {/* Bot Polling Indicator */}
                    <View style={styles.pollingWrap}>
                      <ActivityIndicator size="small" color="#0088cc" />
                      <Text style={[styles.pollingTxt, { color: colors.inkMuted }]}>
                        {t("auth.waitingForBot")}
                      </Text>
                    </View>
                  </View>

                  {/* Or Divider */}
                  <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
                    <Text style={[styles.dividerTxt, { color: colors.inkMuted }]}>
                      {t("auth.orEnterCode")}
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
                  </View>

                  {/* Manual Code Input */}
                  <View style={styles.codeRow}>
                    <TextInput
                      value={code}
                      onChangeText={(val) => {
                        setCode(val.replace(/\D/g, "").slice(0, 6));
                        if (error) setError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder={t("auth.verifyCodePlaceholder")}
                      placeholderTextColor={colors.inkMuted}
                      style={[
                        styles.codeInput,
                        {
                          backgroundColor: colors.cardAlt,
                          borderColor: error ? colors.red : colors.line,
                          color: colors.ink,
                        },
                        Platform.OS === "web" && ({ outlineStyle: "none" } as any),
                      ]}
                    />

                    <Pressable
                      onPress={handleVerifyManualCode}
                      disabled={submittingCode || code.length < 6}
                      style={({ pressed }) => [
                        styles.verifyBtn,
                        {
                          backgroundColor:
                            code.length === 6 ? colors.brandDark || "#D97706" : colors.line,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      {submittingCode ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.verifyBtnTxt}>{t("auth.verifyBtn")}</Text>
                      )}
                    </Pressable>
                  </View>

                  {/* Error Box */}
                  {error ? (
                    <View style={[styles.errorBox, { backgroundColor: colors.redBg || "#FEE2E2" }]}>
                      <Ionicons name="alert-circle" size={16} color={colors.red || "#EF4444"} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.red || "#EF4444", fontSize: 13, fontWeight: "600", flex: 1 }}>
                        {error}
                      </Text>
                    </View>
                  ) : null}

                  {/* Resend Footer */}
                  <View style={styles.footerRow}>
                    {canResend ? (
                      <Pressable onPress={handleResend}>
                        <Text style={[styles.resendTxt, { color: colors.brandDark || "#D97706" }]}>
                          Kodni qayta yuborish
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={[styles.countdownTxt, { color: colors.inkMuted }]}>
                        Qayta yuborish: {countdown} soniya
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  keyboardWrap: {
    width: "100%",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: "600",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: 14,
  },
  telegramCard: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  tgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tgIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0088cc20",
    alignItems: "center",
    justifyContent: "center",
  },
  tgTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0088cc",
  },
  tgSub: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  tgButton: {
    backgroundColor: "#0088cc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: radius.sm,
    elevation: 4,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0px 4px 6px rgba(0, 136, 204, 0.3)" } as any)
      : {
          ...shadow({ color: "#0088cc", opacity: 0.3, radius: 6, offsetY: 4 }),
        }),
  },
  tgButtonTxt: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  pollingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 4,
  },
  pollingTxt: {
    fontSize: 12,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerTxt: {
    fontSize: 12,
    marginHorizontal: 10,
    fontWeight: "600",
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
  },
  codeInput: {
    flex: 1,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
  },
  verifyBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnTxt: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerRow: {
    alignItems: "center",
    marginTop: 4,
  },
  resendTxt: {
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  countdownTxt: {
    fontSize: 13,
    fontWeight: "600",
  },
  successBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
});
