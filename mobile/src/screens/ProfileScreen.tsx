import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius, type ThemeMode } from "@/theme";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/store/auth";
import { useI18n } from "@/i18n";
import { apiPatch, apiPost, apiUpload } from "@/lib/api/client";
import { useIsPremium } from "@/lib/subscription";
import { PaywallSheet } from "@/components/PaywallSheet";

export function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const loadMe = useAuth((s) => s.loadMe);
  const isPremium = useIsPremium();
  const { t, lang, setLang, languages } = useI18n();

  const [pwOpen, setPwOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const fullName =
    user?.full_name ||
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    t("profile.rolePassenger");

  const roleLabel =
    user?.role === "driver"
      ? t("profile.roleDriver")
      : user?.role === "admin"
      ? t("profile.roleAdmin")
      : t("profile.rolePassenger");

  const doLogout = () => {
    Alert.alert(
      t("profile.logoutConfirmTitle"),
      t("profile.logoutConfirmMsg"),
      [
        { text: t("common.no"), style: "cancel" },
        {
          text: t("profile.logout"),
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  const themeOptions: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "light", label: t("profile.themeLight"), icon: "sunny-outline" },
    { key: "dark", label: t("profile.themeDark"), icon: "moon-outline" },
    { key: "auto", label: t("profile.themeAuto"), icon: "phone-portrait-outline" },
  ];

  return (
    <Screen>
      <Header title={t("profile.title")} onBack={() => router.back()} />

      <Card padded style={{ alignItems: "center", paddingVertical: 24 }}>
        {user?.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={[styles.avatar, { borderWidth: 3, borderColor: colors.brand }]}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
            <Text style={styles.avatarTxt}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.ink }]}>{fullName}</Text>
        <Text style={{ color: colors.inkMuted, fontSize: 13, marginTop: 2 }}>{user?.phone}</Text>
        <View style={{ marginTop: 8 }}>
          <Badge label={roleLabel} bg={colors.brand} color="#0F1216" />
        </View>
        <Pressable
          onPress={() => setEditOpen(true)}
          style={[styles.editBtn, { borderColor: colors.line }]}
        >
          <Ionicons name="create-outline" size={15} color={colors.ink} />
          <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "700" }}>
            {t("profile.editProfile")}
          </Text>
        </Pressable>
      </Card>

      {user?.subscription ? (
        <Card padded>
          <View style={styles.subHead}>
            <View style={styles.rowCenter}>
              <Ionicons name="diamond-outline" size={18} color={colors.brandDark} />
              <Text style={[styles.blockTitle, { color: colors.ink }]}>{t("billing.title")}</Text>
            </View>
            <Badge
              label={user.subscription.is_active ? t("billing.active") : t("billing.inactive")}
              bg={user.subscription.is_active ? colors.greenBg : colors.redBg}
              color={user.subscription.is_active ? colors.green : colors.red}
            />
          </View>
          <Text style={{ color: colors.inkMuted, fontSize: 13, marginTop: 8 }}>
            {t("billing.daysLeft", { days: user.subscription.days_left })}
          </Text>
        </Card>
      ) : null}

      {/* TILLAR / YAZYK / LANGUAGE */}
      <Card padded>
        <View style={styles.subHead}>
          <View style={styles.rowCenter}>
            <Ionicons name="globe-outline" size={18} color={colors.brandDark} />
            <Text style={[styles.blockTitle, { color: colors.ink }]}>
              {t("profile.language")}
            </Text>
          </View>
        </View>
        <View style={[styles.themeRow, { marginTop: 12 }]}>
          {languages.map((item) => {
            const sel = lang === item.code;
            return (
              <Pressable
                key={item.code}
                onPress={() => setLang(item.code)}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: sel ? colors.brand : colors.cardAlt,
                    borderColor: sel ? colors.ink : "transparent",
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                <Text
                  style={{
                    color: sel ? "#0F1216" : colors.ink,
                    fontWeight: "900",
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {item.short}
                </Text>
                <Text
                  style={{
                    color: sel ? "#0F1216" : colors.inkMuted,
                    fontWeight: "600",
                    fontSize: 11,
                    marginTop: 1,
                  }}
                >
                  {item.nativeLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* KO'RINISH (THEME) */}
      <Card padded>
        <Text style={[styles.blockTitle, { color: colors.ink, marginBottom: 12 }]}>
          {t("profile.theme")}
        </Text>
        <View style={styles.themeRow}>
          {themeOptions.map((o) => {
            const sel = mode === o.key;
            const locked = !isPremium && o.key !== "light";
            return (
              <Pressable
                key={o.key}
                onPress={() => (locked ? setPaywall(true) : setMode(o.key))}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: sel ? colors.brand : colors.cardAlt,
                    borderColor: sel ? colors.ink : "transparent",
                    opacity: locked ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={locked ? "lock-closed" : o.icon}
                  size={18}
                  color={sel ? "#0F1216" : colors.inkMuted}
                />
                <Text
                  style={{
                    color: sel ? "#0F1216" : colors.ink,
                    fontWeight: "800",
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!isPremium ? (
          <Text style={{ color: colors.inkMuted, fontSize: 11, marginTop: 10 }}>
            {t("profile.themeLockedNotice")}
          </Text>
        ) : null}
      </Card>

      {/* MA'LUMOTLARIM */}
      <Card padded>
        <Text style={[styles.blockTitle, { color: colors.ink, marginBottom: 12 }]}>
          {t("profile.myInfo")}
        </Text>
        <Row icon="call-outline" label={t("profile.phone")} value={user?.phone || "—"} colors={colors} />
        <Row icon="business-outline" label={t("profile.city")} value={user?.city || "Toshkent"} colors={colors} />
        {user?.age ? (
          <Row icon="person-outline" label={t("profile.age")} value={`${user.age}`} colors={colors} />
        ) : null}
        <Row icon="shield-checkmark-outline" label={t("profile.role")} value={roleLabel} colors={colors} last />
      </Card>

      {/* SOZLAMALAR */}
      <Card padded>
        <Text style={[styles.blockTitle, { color: colors.ink, marginBottom: 4 }]}>
          {t("profile.settings")}
        </Text>
        <ActionRow
          icon="lock-closed-outline"
          label={t("profile.changePassword")}
          colors={colors}
          onPress={() => setPwOpen(true)}
        />
        <ActionRow
          icon="information-circle-outline"
          label={t("nav.version")}
          colors={colors}
          last
          chevron={false}
        />
      </Card>

      <Pressable
        onPress={doLogout}
        style={[styles.logout, { backgroundColor: colors.redBg, borderColor: colors.red }]}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.red} />
        <Text style={{ color: colors.red, fontWeight: "800", fontSize: 15 }}>
          {t("profile.logout")}
        </Text>
      </Pressable>

      <Text style={{ color: colors.inkMuted, fontSize: 11, textAlign: "center", marginTop: 4 }}>
        TaxiScan · {t("nav.appSub")}
      </Text>

      <EditProfileModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        colors={colors}
        user={user}
        onSaved={() => loadMe().catch(() => {})}
      />
      <ChangePasswordModal visible={pwOpen} onClose={() => setPwOpen(false)} colors={colors} />
      <PaywallSheet
        visible={paywall}
        onClose={() => setPaywall(false)}
        title={t("paywall.title")}
        message={t("paywall.message")}
      />
    </Screen>
  );
}

function EditProfileModal({
  visible,
  onClose,
  colors,
  user,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
  user: any;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setFirstName(user?.first_name || "");
      setLastName(user?.last_name || "");
      setCity(user?.city || "");
      setAvatarUri(null);
      setError(null);
    }
  }, [visible, user]);

  const pickImage = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t("profile.galleryNoPerm"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setAvatarUri(res.assets[0].uri);
    }
  };

  const submit = async () => {
    setError(null);
    if (!firstName.trim()) {
      setError(t("auth.nameRequired"));
      return;
    }
    setBusy(true);
    try {
      if (avatarUri) {
        const form = new FormData();
        form.append("first_name", firstName.trim());
        form.append("last_name", lastName.trim());
        form.append("city", city.trim() || "Toshkent");
        const name = avatarUri.split("/").pop() || "avatar.jpg";
        const ext = (name.split(".").pop() || "jpg").toLowerCase();
        form.append("avatar", {
          uri: avatarUri,
          name,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        } as any);
        await apiUpload("/auth/me/", form, "PATCH");
      } else {
        await apiPatch("/auth/me/", {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          city: city.trim() || "Toshkent",
        });
      }
      onSaved();
      onClose();
      Alert.alert(t("common.ready"), t("profile.savedSuccess"));
    } catch (err: any) {
      const d = err?.data;
      setError(d?.detail || d?.first_name?.[0] || d?.avatar?.[0] || t("profile.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = { backgroundColor: colors.card, borderColor: colors.line, color: colors.ink };
  const previewUri = avatarUri || user?.avatar_url || null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pwOverlay}>
        <View style={[styles.pwSheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.pwHead}>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              {t("profile.editProfile")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>

          {error ? (
            <View style={[styles.pwErr, { backgroundColor: colors.redBg }]}>
              <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Pressable onPress={pickImage} style={styles.avatarPick}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.avatarPickImg} />
              ) : (
                <View
                  style={[
                    styles.avatarPickImg,
                    { backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Text style={{ fontSize: 30, fontWeight: "900", color: "#0F1216" }}>
                    {(firstName.charAt(0) || "U").toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.avatarCam, { backgroundColor: colors.ink, borderColor: colors.bg }]}>
                <Ionicons name="camera" size={15} color={colors.bg} />
              </View>
            </Pressable>
            <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 8 }}>
              {t("profile.changePhoto")}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={[styles.editLabel, { color: colors.inkMuted }]}>
                {t("profile.editName")}
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t("profile.editName")}
                placeholderTextColor={colors.inkMuted}
                style={[styles.pwInput, inputStyle]}
              />
            </View>
            <View>
              <Text style={[styles.editLabel, { color: colors.inkMuted }]}>
                {t("profile.editLastName")}
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={t("profile.editLastName")}
                placeholderTextColor={colors.inkMuted}
                style={[styles.pwInput, inputStyle]}
              />
            </View>
            <View>
              <Text style={[styles.editLabel, { color: colors.inkMuted }]}>
                {t("profile.editCity")}
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Toshkent"
                placeholderTextColor={colors.inkMuted}
                style={[styles.pwInput, inputStyle]}
              />
            </View>

            <Pressable
              onPress={submit}
              disabled={busy}
              style={[styles.pwBtn, { backgroundColor: colors.brand }]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#0F1216" />
              ) : (
                <Text style={{ color: "#0F1216", fontWeight: "900", fontSize: 15 }}>
                  {t("common.save")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ChangePasswordModal({
  visible,
  onClose,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2>(1);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [newP, setNewP] = useState("");
  const [newP2, setNewP2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setSentTo("");
    setCode("");
    setNewP("");
    setNewP2("");
    setError(null);
    setInfo(null);
    setShow(false);
  };

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const r = await apiPost<any>("/auth/password-reset/request/", {});
      setSentTo(r?.sent_to || "");
      setStep(2);
      if (r?.debug_code) {
        setCode(String(r.debug_code));
        setInfo(`Kod yuborildi: ${r.sent_to}. Sinov kodi: ${r.debug_code}`);
      } else {
        setInfo(`Kod yuborildi: ${r?.sent_to || ""}`);
      }
    } catch (err: any) {
      setError(err?.data?.detail || t("profile.pwError"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError(null);
    if (!code.trim()) {
      setError(t("profile.enterCode"));
      return;
    }
    if (newP !== newP2) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }
    if (newP.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    setBusy(true);
    try {
      await apiPost("/auth/password-reset/confirm/", {
        code: code.trim(),
        new_password: newP,
        new_password2: newP2,
      });
      reset();
      onClose();
      Alert.alert(t("common.ready"), t("profile.pwSuccess"));
    } catch (err: any) {
      const d = err?.data;
      setError(
        d?.code ||
          d?.new_password ||
          d?.new_password2 ||
          d?.detail ||
          t("profile.pwError")
      );
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = { backgroundColor: colors.card, borderColor: colors.line, color: colors.ink };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pwOverlay}>
        <View style={[styles.pwSheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.pwHead}>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              {t("profile.changePassword")}
            </Text>
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              hitSlop={10}
            >
              <Ionicons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>

          {error ? (
            <View style={[styles.pwErr, { backgroundColor: colors.redBg }]}>
              <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}
          {info ? (
            <View style={[styles.pwErr, { backgroundColor: colors.greenBg }]}>
              <Text style={{ color: colors.green, fontSize: 13 }}>{info}</Text>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={{ gap: 14 }}>
              <Text style={{ color: colors.inkMuted, fontSize: 13, lineHeight: 19 }}>
                {t("profile.pwResetNotice")}
              </Text>
              <Pressable
                onPress={sendCode}
                disabled={busy}
                style={[styles.pwBtn, { backgroundColor: colors.brand }]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#0F1216" />
                ) : (
                  <Text style={{ color: "#0F1216", fontWeight: "900", fontSize: 15 }}>
                    {t("profile.sendCodeBtn")}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder={t("profile.enterCode")}
                placeholderTextColor={colors.inkMuted}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.pwInput, inputStyle]}
              />
              <TextInput
                value={newP}
                onChangeText={setNewP}
                placeholder={t("profile.newPw")}
                placeholderTextColor={colors.inkMuted}
                secureTextEntry={!show}
                style={[styles.pwInput, inputStyle]}
              />
              <TextInput
                value={newP2}
                onChangeText={setNewP2}
                placeholder={t("profile.repeatNewPw")}
                placeholderTextColor={colors.inkMuted}
                secureTextEntry={!show}
                style={[styles.pwInput, inputStyle]}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Pressable onPress={() => setShow((s) => !s)} style={styles.pwShow} hitSlop={8}>
                  <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={16} color={colors.inkMuted} />
                  <Text style={{ color: colors.inkMuted, fontSize: 13 }}>
                    {show ? t("profile.hide") : t("profile.show")}
                  </Text>
                </Pressable>
                <Pressable onPress={sendCode} disabled={busy} hitSlop={8}>
                  <Text style={{ color: colors.brandDark, fontSize: 13, fontWeight: "800" }}>
                    {t("profile.resend")}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={confirm}
                disabled={busy}
                style={[styles.pwBtn, { backgroundColor: colors.brand }]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#0F1216" />
                ) : (
                  <Text style={{ color: "#0F1216", fontWeight: "900", fontSize: 15 }}>
                    {t("profile.changePassword")}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Row({
  icon,
  label,
  value,
  colors,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
      ]}
    >
      <View style={styles.rowCenter}>
        <Ionicons name={icon} size={17} color={colors.inkMuted} />
        <Text style={{ color: colors.ink, fontSize: 14, marginLeft: 8 }}>{label}</Text>
      </View>
      <Text style={{ color: colors.inkMuted, fontSize: 12, maxWidth: "55%" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  colors,
  onPress,
  last,
  chevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: any;
  onPress?: () => void;
  last?: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.infoRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
      ]}
    >
      <View style={styles.rowCenter}>
        <Ionicons name={icon} size={18} color={colors.inkMuted} />
        <Text style={{ color: colors.ink, fontSize: 14, marginLeft: 8, fontWeight: "600" }}>
          {label}
        </Text>
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  avatarTxt: { fontSize: 32, fontWeight: "900", color: "#0F1216" },
  name: { fontSize: 18, fontWeight: "900", marginTop: 12 },
  subHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  blockTitle: { fontSize: 15, fontWeight: "800" },
  themeRow: { flexDirection: "row", gap: 10 },
  themeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginTop: 4,
  },
  pwOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pwSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pwHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pwErr: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  pwInput: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  pwShow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  editLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 2 },
  avatarPick: { width: 88, height: 88 },
  avatarPickImg: { width: 88, height: 88, borderRadius: 44 },
  avatarCam: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  pwBtn: { height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: 4 },
});
