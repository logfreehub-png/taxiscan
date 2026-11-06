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
import { useTheme, radius } from "@/theme";
import { useI18n } from "@/i18n";
import { Logo } from "@/components/ui/Header";
import { Field, PhoneField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSelectModal } from "@/components/LanguageSelectModal";
import { PhoneCodeFlow, VerifySession } from "@/components/PhoneCodeFlow";
import { apiPost } from "@/lib/api/client";

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [step, setStep] = useState<"phone" | "verify" | "password">("phone");
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [session, setSession] = useState<VerifySession | null>(null);
  const [verifiedCode, setVerifiedCode] = useState("");

  const firstError = (err: any, fallback: string) => {
    const data = err?.data;
    const first = (data && typeof data === "object" && Object.values(data)[0]) || fallback;
    return Array.isArray(first) ? String(first[0]) : String(first);
  };

  // 1-qadam: Telegram tasdiqlash sessiyasini boshlash
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
        { phone: cleanPhone, purpose: "register" },
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
      setError(firstError(err, t("auth.registerError")));
    } finally {
      setLoading(false);
    }
  };

  // 3-qadam: parol o'rnatib ro'yxatdan o'tish -> login sahifasiga
  const finish = async () => {
    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (password !== password2) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost(
        "/auth/register/",
        {
          phone: session?.phone || phone.trim(),
          password,
          password2,
          role,
          first_name: "",
          last_name: "",
          city: "Tashkent",
          session_id: session?.sessionId,
        },
        { auth: false }
      );
      const goLogin = () => router.replace("/(auth)/login");
      if (Platform.OS === "web") goLogin();
      else
        Alert.alert("Tayyor!", "Ro'yxatdan muvaffaqiyatli o'tdingiz. Endi telefon va parol bilan kiring.", [
          { text: t("auth.loginBtn"), onPress: goLogin },
        ]);
    } catch (err: any) {
      setError(firstError(err, t("auth.registerError")));
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    step === "phone"
      ? "Telefon raqamingizni kiriting — Telegram orqali tasdiqlash kodi yuboriladi."
      : step === "verify"
      ? "Telefon raqamingizni tasdiqlang"
      : "Raqam tasdiqlandi. Endi parol o'rnating.";

  const stepIndex = step === "phone" ? 0 : step === "verify" ? 1 : 2;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      {/* Tepada til tanlash (ekranning eng yuqori qismida, login bilan bir xil) */}
      <View style={[styles.topLangBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => setLangModalOpen(true)}
          style={[styles.langPromptBtn, { backgroundColor: colors.cardAlt, borderColor: colors.line }]}
        >
          <Ionicons name="globe-outline" size={16} color={colors.ink} />
          <Text style={[styles.langPromptTxt, { color: colors.ink }]}>{t("lang.title")}</Text>
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
            <Text style={[styles.title, { color: colors.ink }]}>{t("auth.registerTitle")}</Text>
            <Text style={[styles.subtitle, { color: colors.inkMuted }]}>{subtitle}</Text>

            {/* Qadamlar indikatori */}
            <View style={styles.stepsRow}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[styles.stepBar, { backgroundColor: i <= stepIndex ? colors.brand : colors.line }]}
                />
              ))}
            </View>

            {step === "phone" ? (
              <>
                <View style={[styles.roleTabs, { backgroundColor: colors.cardAlt }]}>
                  {([
                    { key: "passenger", label: t("auth.rolePassenger"), icon: "person-outline" },
                    { key: "driver", label: t("auth.roleDriver"), icon: "car-outline" },
                  ] as const).map((r) => {
                    const sel = role === r.key;
                    return (
                      <Pressable
                        key={r.key}
                        onPress={() => setRole(r.key)}
                        style={[styles.roleTab, sel && { backgroundColor: colors.card }]}
                      >
                        <Ionicons name={r.icon} size={16} color={sel ? colors.ink : colors.inkMuted} />
                        <Text style={[styles.roleTxt, { color: sel ? colors.ink : colors.inkMuted }]}>
                          {r.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ gap: 14, marginTop: 16 }}>
                  <PhoneField
                    label={t("auth.phone")}
                    value={phone}
                    onChangePhone={(fullPhone) => {
                      setPhone(fullPhone);
                      if (error) setError(null);
                    }}
                  />
                  {error ? (
                    <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                      <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
                    </View>
                  ) : null}
                  <Button title="Kod olish" onPress={sendCode} loading={loading} />
                </View>
              </>
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
                  label={t("auth.password")}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="kamida 6 ta belgi"
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
                />
                <Field
                  label={t("auth.confirmPassword")}
                  value={password2}
                  onChangeText={setPassword2}
                  secureTextEntry
                  placeholder="••••••"
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
                />
                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                    <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
                  </View>
                ) : null}
                <Button title="Ro'yxatdan o'tish" onPress={finish} loading={loading} />
              </View>
            )}

            <View style={styles.footer}>
              <Text style={{ color: colors.inkMuted, fontSize: 14 }}>{t("auth.haveAccount")} </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 14 }}>
                    {t("auth.loginBtn")}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </Card>
        </ScrollView>

      <LanguageSelectModal
        visible={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        title={t("lang.title")}
        subtitle={t("lang.selectPrompt")}
      />

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
  topLangBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  langPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  langPromptTxt: {
    fontSize: 12,
    fontWeight: "700",
  },
  logoWrap: { alignItems: "center", marginBottom: 20 },
  tagline: { fontSize: 13, marginTop: 8, textAlign: "center", maxWidth: 280, lineHeight: 18 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  roleTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.md,
    marginTop: 18,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  roleTxt: { fontSize: 14, fontWeight: "800" },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  okRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12 },
  stepsRow: { flexDirection: "row", gap: 6, marginTop: 14 },
  stepBar: { flex: 1, height: 4, borderRadius: 2 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
});
