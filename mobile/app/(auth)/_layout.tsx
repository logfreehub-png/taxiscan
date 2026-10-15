import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/store/auth";

export default function AuthLayout() {
  const { user, hydrated } = useAuth();

  if (hydrated && user) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
