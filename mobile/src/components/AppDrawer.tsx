import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { useAuth } from "@/store/auth";
import { useIsPremium } from "@/lib/subscription";

const LOGO = require("@/assets/logo.png");
const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Chapdan ochiladigan umumiy menyu (yo'lovchi va haydovchi uchun bir xil).
 * Eng tepada TaxiScan logotipi va nomi turadi. Ichida qidiruv YO'Q —
 * faqat foydalanuvchi ma'lumotlari va bo'limlarga o'tish.
 */
import { useI18n } from "@/i18n";

export function AppDrawer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const isPremium = useIsPremium();
  const { t } = useI18n();

  const isDriver = user?.role === "driver";
  const roleLabel = isDriver
    ? t("profile.roleDriver")
    : user?.role === "admin"
    ? t("profile.roleAdmin")
    : t("profile.rolePassenger");
  const fullName = user?.full_name || t("profile.rolePassenger");

  const textPrimary = colors.ink;
  const textMuted = colors.inkMuted;
  const drawerBg = colors.card;
  const inputBg = colors.cardAlt;

  const go = (path: string) => {
    onClose();
    router.push(path as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: drawerBg, paddingTop: insets.top + 4 }]}
          onPress={() => {}}
        >
          {/* ENG TEPADA — TaxiScan LOGOTIPI VA NOMI */}
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.brandLogo} resizeMode="contain" />
            <Text style={[styles.brandText, { color: textPrimary }]}>
              Taxi<Text style={{ color: colors.brandDark }}>Scan</Text>
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={30} color={textMuted} />
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          {/* FOYDALANUVCHI MA'LUMOTLARI */}
          <View style={styles.userRow}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
                <Text style={styles.avatarTxt}>
                  {(fullName || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: textPrimary }]} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={[styles.userPhone, { color: textMuted }]} numberOfLines={1}>
                {user?.phone || "+998 -- --- -- --"}
              </Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: colors.brand }]}>
              <Text style={styles.rolePillTxt}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.menuBtns}>
            {/* PROFIL */}
            <Pressable
              style={[styles.menuItem, { backgroundColor: inputBg }]}
              onPress={() => go("/(tabs)/profile")}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#FFCC00" }]}>
                <Ionicons name="person-outline" size={22} color="#0F1216" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: textPrimary }]}>{t("nav.profile")}</Text>
                <Text style={[styles.menuSub, { color: textMuted }]}>
                  {t("nav.drawerProfileSub")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={textMuted} />
            </Pressable>

            {/* STATISTIKA — faqat obunali haydovchi uchun */}
            {isDriver && isPremium ? (
              <Pressable
                style={[styles.menuItem, { backgroundColor: inputBg }]}
                onPress={() => go("/(tabs)/stats")}
              >
                <View style={[styles.menuIcon, { backgroundColor: "#FFCC00" }]}>
                  <Ionicons name="stats-chart-outline" size={22} color="#0F1216" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuTitle, { color: textPrimary }]}>{t("nav.stats")}</Text>
                  <Text style={[styles.menuSub, { color: textMuted }]}>
                    {t("nav.drawerStatsSub")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={textMuted} />
              </Pressable>
            ) : null}

            {/* OBUNA */}
            <Pressable
              style={[styles.menuItem, { backgroundColor: inputBg }]}
              onPress={() => go("/(tabs)/billing")}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: isDark ? "#1A1F26" : "#FFF", borderWidth: 1, borderColor: "#FFCC00" },
                ]}
              >
                <Ionicons name="diamond-outline" size={22} color="#FFCC00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: textPrimary }]}>{t("nav.billing")}</Text>
                <Text style={[styles.menuSub, { color: textMuted }]}>
                  {t("nav.drawerBillingSub")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.footer, { color: textMuted }]}>TaxiScan {t("nav.version")} · Toshkent</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: {
    width: SCREEN_WIDTH * 0.84,
    height: "100%",
    paddingHorizontal: 20,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { width: 40, height: 40, borderRadius: 10 },
  brandText: { fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  divider: { height: 1, marginTop: 16, marginBottom: 18 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarTxt: { fontSize: 22, fontWeight: "900", color: "#0F1216" },
  userName: { fontSize: 17, fontWeight: "800" },
  userPhone: { fontSize: 12, marginTop: 2 },
  rolePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  rolePillTxt: { fontSize: 11, fontWeight: "900", color: "#0F1216" },
  menuBtns: { gap: 12, flex: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
  },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuTitle: { fontSize: 16, fontWeight: "800" },
  menuSub: { fontSize: 11, marginTop: 2 },
  footer: { fontSize: 12, textAlign: "center", marginBottom: 24 },
});
