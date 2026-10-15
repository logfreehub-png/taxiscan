import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { ThemeProvider, useTheme } from "@/theme";
import { useAuth } from "@/store/auth";
import { NotificationProvider } from "@/lib/notifications";
import { LanguageProvider } from "@/i18n";
import { parseLocationUri, useGeoIntentStore } from "@/lib/geoIntent";

/**
 * Telegram, WhatsApp yoki boshqa ilovalardan ulashilgan lokatsiya
 * (geo: URI yoki xarita linki) orqali ochilganda ushlab oluvchi listener
 */
function GeoIntentListener() {
  const router = useRouter();
  const setPendingDestination = useGeoIntentStore((s) => s.setPendingDestination);

  useEffect(() => {
    const handleUrl = (rawUrl: string | null) => {
      if (!rawUrl) return;
      const parsed = parseLocationUri(rawUrl);
      if (parsed) {
        setPendingDestination(parsed);
        try {
          router.replace("/(tabs)");
        } catch {
          /* index.tsx yoki auth navigatsiyasi o'zi hal qiladi */
        }
      }
    };

    // 1. Ilova sovuq startda (yopiq holatdan) geo orqali ochilganda
    Linking.getInitialURL().then(handleUrl).catch(() => {});

    // 2. Ilova orqa fonda (background) turganda geo orqali ochilganda
    const sub = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => {
      sub.remove();
    };
  }, [router, setPendingDestination]);

  return null;
}

function RootNavigator() {
  const { isDark, colors } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <GeoIntentListener />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const bootstrap = useAuth((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <NotificationProvider>
            <RootNavigator />
          </NotificationProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
