import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { PhoneCodeFlow, VerifySession } from "@/components/PhoneCodeFlow";
import { apiPost } from "@/lib/api/client";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [step, setStep] = useState<"phone" | "verify" | "password">("phone");
  const [phone, setPhone] = useState("+998");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<VerifySession | null>(null);
  const [verifiedCode, setVerifiedCode] = useState("");

  const firstError = (err: any, fallback: string) => {
    const data = err?.data;
    const first = (data && typeof data === "object" && Object.values(data)[0]) || fallback;
    return Array.isArray(first) ? String(first[0]) : String(first);
  };

  const sendCode = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 12) {
      setError("Telefon raqam noto'g'ri kiritildi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ session_id: string; bot_url: string; bot_username: string }>(
        "/auth/phone/send-code/",
        { phone: cleanPhone, purpose: "password_reset" },
        { auth: false }
      );
      setSession({
        sessionId: res.session_id,
        botUrl: res.bot_url,
        botUsername: res.bot_username || "TaxiScan_auth_bot",
        phone: cleanPhone,
      });
      setStep("verify");
    } catch (err: any) {
      setError(firstError(err, "Telefon raqam bo'yicha hisob topilmadi"));
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
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
          session_id: session?.sessionId,
          phone: session?.phone || phone.trim(),
          code: verifiedCode,
          new_password: newPassword,
          new_password2: newPassword2,
        },
        { auth: false }
      );
      const goLogin = () => router.replace("/(auth)/login");
      if (Platform.OS === "web") goLogin();
      else
        Alert.alert(t("auth.passwordResetSuccess"), "Endi yangi parolingiz bilan tizimga kiring.", [
          { text: t("auth.loginBtn"), onPress: goLogin },
        ]);
    } catch (err: any) {
      setError(firstError(err, "Parolni yangilashda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    step === "phone"
      ? "Telefon raqamingizni kiriting — Telegram orqali tasdiqlash kodi yuboriladi."
      : step === "verify"
      ? "Telefon raqamingizni tasdiqlang"
      : "Raqam tasdiqlandi. Yangi parol o'rnating.";
  const stepIndex = step === "phone" ? 0 : step === "verify" ? 1 : 2;

  const errorBox = error ? (
    <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
      <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (step === "phone" ? router.back() : setStep(step === "password" ? "verify" : "phone"))}
          hitSlop={10}
          style={[styles.backBtn, { backgroundColor: colors.cardAlt, borderColor: colors.line }]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
          <Text style={[styles.backTxt, { color: colors.ink }]}>{t("common.back")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <Logo size={42} />
          <Text style={[styles.tagline, { color: colors.inkMuted }]}>{t("nav.tagline")}</Text>
        </View>

        <Card padded>
          <Text style={[styles.title, { color: colors.ink }]}>{t("auth.resetPasswordTitle")}</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>{subtitle}</Text>

          <View style={styles.stepsRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.stepBar, { backgroundColor: i <= stepIndex ? colors.brand : colors.line }]}
              />
            ))}
          </View>

          {step === "phone" ? (
            <View style={{ gap: 14, marginTop: 18 }}>
              <PhoneField
                label={t("auth.phone")}
                value={phone}
                onChangePhone={(fullPhone) => {
                  setPhone(fullPhone);
                  if (error) setError(null);
                }}
              />
              {errorBox}
              <Button title="Kod olish" onPress={sendCode} loading={loading} />
            </View>
          ) : step === "verify" && session ? (
            <PhoneCodeFlow
              session={session}
              onVerified={(code) => {
                setVerifiedCode(code);
                setError(null);
                setStep("password");
              }}
              onResend={sendCode}
              onChangePhone={() => {
                setError(null);
                setStep("phone");
              }}
            />
          ) : (
            <View style={{ gap: 14, marginTop: 18 }}>
              <View style={[styles.okRow, { backgroundColor: colors.greenBg }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={{ color: colors.green, fontWeight: "800", fontSize: 13, flex: 1 }}>
                  {session?.phone} tasdiqlandi
                </Text>
              </View>
              <Field
                label={t("auth.newPassword")}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="kamida 6 ta belgi"
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
              />
              <Field
                label={t("auth.newPasswordConfirm")}
                value={newPassword2}
                onChangeText={setNewPassword2}
                secureTextEntry
                placeholder="••••••"
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
              />
              {errorBox}
              <Button title="Parolni saqlash" onPress={savePassword} loading={loading} />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 4 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  backTxt: { fontSize: 12, fontWeight: "700" },
  logoWrap: { alignItems: "center", marginBottom: 24 },
  tagline: { fontSize: 13, marginTop: 10, textAlign: "center", maxWidth: 280, lineHeight: 18 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  stepsRow: { flexDirection: "row", gap: 6, marginTop: 14 },
  stepBar: { flex: 1, height: 4, borderRadius: 2 },
  okRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12 },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
});
