import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { Logo } from "@/components/ui/Header";
import { Field, PhoneField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { apiPost } from "@/lib/api/client";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [phone, setPhone] = useState("+998");
  const [step, setStep] = useState<"phone" | "new_password" | "done">("phone");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telegram bot verification modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifySession, setVerifySession] = useState<{
    sessionId: string;
    botUrl: string;
    botUsername: string;
    phone: string;
  } | null>(null);

  const handleRequestCode = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 9) {
      setError("Telefon raqam noto'g'ri kiritildi");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{
        session_id: string;
        bot_url: string;
        bot_username: string;
      }>(
        "/auth/phone/send-code/",
        { phone: cleanPhone, purpose: "password_reset" },
        { auth: false }
      );

      setVerifySession({
        sessionId: res.session_id,
        botUrl: res.bot_url,
        botUsername: res.bot_username || "TaxiScan_auth_bot",
        phone: cleanPhone,
      });
      setVerifyModalOpen(true);
    } catch (err: any) {
      const data = err?.data;
      const first =
        (data && typeof data === "object" && Object.values(data)[0]) ||
        "Telefon raqam bo'yicha hisob topilmadi";
      setError(Array.isArray(first) ? first[0] : String(first));
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = (sessionId: string) => {
    setVerifyModalOpen(false);
    setStep("new_password");
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (newPassword !== newPassword2) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiPost(
        "/auth/password-reset/phone-confirm/",
        {
          session_id: verifySession?.sessionId,
          phone: verifySession?.phone || phone.trim(),
          new_password: newPassword,
          new_password2: newPassword2,
        },
        { auth: false }
      );

      setStep("done");
    } catch (err: any) {
      const data = err?.data;
      const first =
        (data && typeof data === "object" && Object.values(data)[0]) ||
        "Parolni yangilashda xatolik yuz berdi";
      setError(Array.isArray(first) ? first[0] : String(first));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      {/* Top Bar with Back Button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.backBtn, { backgroundColor: colors.cardAlt, borderColor: colors.line }]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
          <Text style={[styles.backTxt, { color: colors.ink }]}>{t("common.back")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.logoWrap}>
            <Logo size={42} />
            <Text style={[styles.tagline, { color: colors.inkMuted }]}>
              {t("nav.tagline")}
            </Text>
          </View>

          <Card padded>
            <Text style={[styles.title, { color: colors.ink }]}>
              {t("auth.resetPasswordTitle")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
              {step === "new_password"
                ? "Yangi parolingizni kiriting"
                : t("auth.resetPasswordSubtitle")}
            </Text>

            {step === "phone" ? (
              <View style={{ gap: 14, marginTop: 18 }}>
                <PhoneField
                  label={t("auth.phone")}
                  value={phone}
                  onChangePhone={(fullPhone) => setPhone(fullPhone)}
                />

                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                    <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
                  </View>
                ) : null}

                <Button
                  title="Tasdiqlash kodini olish"
                  onPress={handleRequestCode}
                  loading={loading}
                />
              </View>
            ) : step === "new_password" ? (
              <View style={{ gap: 14, marginTop: 18 }}>
                <Field
                  label={t("auth.newPassword")}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
                />
                <Field
                  label={t("auth.newPasswordConfirm")}
                  value={newPassword2}
                  onChangeText={setNewPassword2}
                  secureTextEntry
                  placeholder="••••••••"
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
                />

                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                    <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
                  </View>
                ) : null}

                <Button
                  title="Parolni saqlash"
                  onPress={handleSetNewPassword}
                  loading={loading}
                />
              </View>
            ) : (
              <View style={styles.doneWrap}>
                <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                <Text style={[styles.doneTitle, { color: colors.ink }]}>
                  {t("auth.passwordResetSuccess")}
                </Text>
                <Text style={[styles.doneSub, { color: colors.inkMuted }]}>
                  Endi yangi parolingiz bilan tizimga kirishingiz mumkin.
                </Text>
                <Button
                  title={t("auth.loginBtn")}
                  onPress={() => router.replace("/(auth)/login")}
                  style={{ width: "100%", marginTop: 16 }}
                />
              </View>
            )}

            <View style={styles.footer}>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 14 }}>
                    {t("common.back")} — {t("auth.loginBtn")}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </Card>
        </ScrollView>

      {verifySession ? (
        <PhoneVerificationModal
          visible={verifyModalOpen}
          phone={verifySession.phone}
          sessionId={verifySession.sessionId}
          botUrl={verifySession.botUrl}
          botUsername={verifySession.botUsername}
          onClose={() => setVerifyModalOpen(false)}
          onVerified={handleVerified}
          onResend={handleRequestCode}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  backTxt: {
    fontSize: 12,
    fontWeight: "700",
  },
  logoWrap: { alignItems: "center", marginBottom: 24 },
  tagline: { fontSize: 13, marginTop: 10, textAlign: "center", maxWidth: 280, lineHeight: 18 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  doneWrap: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  doneSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
