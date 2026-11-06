import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, Linking, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "@/theme";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/OtpInput";
import { useAuth, type ForceLoginSession } from "@/store/auth";
import type { User } from "@/lib/api/types";

interface Props {
  visible: boolean;
  phone: string;
  password: string;
  deviceName?: string;
  onClose: () => void;
  onLoggedIn: (user: User) => void;
}

/**
 * Akkaunt boshqa qurilmada ochiq bo'lsa:
 *  1) "ask"  — "Boshqa qurilmadan kirgansiz. U qurilmani chiqarib yuborasizmi?"
 *  2) "code" — Telegramga kelgan 6 xonali kodni kiritish
 *  3) "done" — "Qurilma chiqarib yuborildi" → kirish
 */
export function OtherDeviceModal({ visible, phone, password, deviceName, onClose, onLoggedIn }: Props) {
  const { colors } = useTheme();
  const forceLoginRequest = useAuth((s) => s.forceLoginRequest);
  const forceLoginConfirm = useAuth((s) => s.forceLoginConfirm);

  const [step, setStep] = useState<"ask" | "code" | "done">("ask");
  const [session, setSession] = useState<ForceLoginSession | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loggedUser, setLoggedUser] = useState<User | null>(null);

  useEffect(() => {
    if (visible) {
      setStep("ask");
      setSession(null);
      setCode("");
      setError(null);
      setLoggedUser(null);
    }
  }, [visible]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await forceLoginRequest(phone, password);
      setSession(s);
      setCode("");
      setCountdown(60);
      setStep("code");
      if (!s.sent) {
        // Telegram akkaunt hali ulanmagan — botni ochib raqam ulashish kerak
        Linking.openURL(s.bot_url).catch(() => {});
      }
    } catch (err: any) {
      setError(err?.data?.detail || "Kod yuborib bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!session || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const u = await forceLoginConfirm(phone, password, session.session_id, code);
      setLoggedUser(u);
      setStep("done");
    } catch (err: any) {
      setError(err?.data?.detail || "Tasdiqlash kodi noto'g'ri");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error ? (
    <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
      <Ionicons name="alert-circle" size={16} color={colors.red} />
      <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600", flex: 1 }}>{error}</Text>
    </View>
  ) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={step === "done" ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
          {step === "ask" ? (
            <>
              <View style={[styles.iconWrap, { backgroundColor: colors.orangeBg }]}>
                <Ionicons name="phone-portrait-outline" size={30} color={colors.orange} />
              </View>
              <Text style={[styles.title, { color: colors.ink }]}>Siz boshqa qurilmadan kirgansiz</Text>
              <Text style={[styles.sub, { color: colors.inkMuted }]}>
                Akkauntingiz hozir {deviceName ? `«${deviceName}»` : "boshqa qurilma"}da ochiq. U qurilmani
                chiqarib yuborib, shu telefondan kirmoqchimisiz?
              </Text>
              <Text style={[styles.note, { color: colors.inkMuted }]}>
                Tasdiqlash kodi Telegram'ga yuboriladi.
              </Text>
              {errorBox}
              <View style={{ gap: 10, marginTop: 6, alignSelf: "stretch" }}>
                <Button title="Ha, chiqarib yuborish" onPress={requestCode} loading={busy} />
                <Button title="Yo'q, bekor qilish" variant="outline" onPress={onClose} disabled={busy} />
              </View>
            </>
          ) : step === "code" ? (
            <>
              <View style={[styles.iconWrap, { backgroundColor: "#0088cc22" }]}>
                <Ionicons name="paper-plane" size={28} color="#0088cc" />
              </View>
              <Text style={[styles.title, { color: colors.ink }]}>Telegram'dagi kodni kiriting</Text>
              <Text style={[styles.sub, { color: colors.inkMuted }]}>
                {session?.sent
                  ? `@${session.bot_username} botiga 6 xonali kod yuborildi.`
                  : `@${session?.bot_username} botini oching va «📱 Telefon raqamni ulashish» tugmasini bosing — bot kod yuboradi.`}
              </Text>
              <View style={{ alignSelf: "stretch", marginTop: 4 }}>
                <OtpInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (error) setError(null);
                  }}
                  error={!!error}
                />
              </View>
              {errorBox}
              <View style={{ gap: 10, alignSelf: "stretch" }}>
                <Button title="Tasdiqlash" onPress={confirm} loading={busy} disabled={code.length < 6} />
                <View style={styles.rowBetween}>
                  <Pressable onPress={() => session && Linking.openURL(session.bot_url)} hitSlop={8}>
                    <Text style={[styles.link, { color: "#0088cc" }]}>Telegramni ochish</Text>
                  </Pressable>
                  {countdown > 0 ? (
                    <Text style={{ color: colors.inkMuted, fontSize: 13, fontWeight: "600" }}>
                      Qayta yuborish: {countdown}s
                    </Text>
                  ) : (
                    <Pressable onPress={requestCode} hitSlop={8} disabled={busy}>
                      <Text style={[styles.link, { color: colors.brandDark }]}>Kodni qayta yuborish</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={onClose} hitSlop={8} style={{ alignSelf: "center", marginTop: 4 }}>
                  <Text style={[styles.link, { color: colors.inkMuted }]}>Bekor qilish</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.iconWrap, { backgroundColor: colors.greenBg }]}>
                <Ionicons name="checkmark-circle" size={34} color={colors.green} />
              </View>
              <Text style={[styles.title, { color: colors.ink }]}>Qurilma chiqarib yuborildi</Text>
              <Text style={[styles.sub, { color: colors.inkMuted }]}>
                Eski qurilmadagi akkaunt yopildi. Endi shu telefondan foydalanishingiz mumkin.
              </Text>
              {busy ? <ActivityIndicator color={colors.brand} /> : null}
              <Button
                title="Kirish"
                onPress={() => loggedUser && onLoggedIn(loggedUser)}
                style={{ alignSelf: "stretch", marginTop: 6 }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontWeight: "900", textAlign: "center" },
  sub: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  note: { fontSize: 12, textAlign: "center" },
  errorBox: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { fontSize: 13, fontWeight: "800" },
});
