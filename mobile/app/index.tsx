import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { Logo } from "@/components/ui/Header";

export default function Index() {
  const { user, hydrated, onboarded } = useAuth();
  const { colors } = useTheme();

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Logo size={44} />
        <ActivityIndicator color={colors.brandDark} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // Tizimga kirmagan foydalanuvchi uchun onboarding boshida turadi
  if (!user) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
