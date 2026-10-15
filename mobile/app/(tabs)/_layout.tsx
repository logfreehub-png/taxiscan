import React, { useEffect } from "react";
import { Platform, Text } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { registerPushToken } from "@/lib/push";

import { useI18n } from "@/i18n";

export default function TabsLayout() {
  const { user, hydrated } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Foydalanuvchi kirgach push tokenni ro'yxatdan o'tkazamiz
  useEffect(() => {
    if (user) registerPushToken();
  }, [user?.id]);

  if (hydrated && !user) return <Redirect href="/(auth)/login" />;

  const isDriver = user?.role === "driver";

  // Navbar foni: kunduzi qora, tunda oq (foydalanuvchi so'rovi)
  const activeColor = colors.brand; // sariq
  const inactiveColor = isDark ? "#8A93A0" : "#9AA3AE";

  // Yorliq doim bitta qatorda — uzun nom tepaga chiqib ketmasligi uchun
  const tabLabel = (label: string) =>
    ({ color }: { color: string; focused: boolean }) =>
      (
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{ color, fontSize: 11, fontWeight: "800", textAlign: "center", width: 78 }}
        >
          {label}
        </Text>
      );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarItemStyle: { paddingTop: 10, paddingBottom: 10, justifyContent: "center" },
        tabBarStyle: {
          display: "none",
        },
        tabBarHideOnKeyboard: Platform.OS === "android",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarLabel: tabLabel(t("nav.home")),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t("nav.stats"),
          tabBarLabel: tabLabel(t("nav.stats")),
          href: isDriver ? "/(tabs)/stats" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: t("nav.billing"),
          tabBarLabel: tabLabel(t("nav.billing")),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "card" : "card-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.profile"),
          tabBarLabel: tabLabel(t("nav.profile")),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
