import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiPost } from "@/lib/api/client";

const isExpoGo = Constants.appOwnership === "expo";

/**
 * Telefon push tokenini olib backendga saqlaydi (ilova yopiq bo'lsa ham
 * bildirishnoma kelishi uchun). Xato bo'lsa jim o'tadi — in-app bildirishnoma baribir ishlaydi.
 */
export async function registerPushToken() {
  if (isExpoGo) return;

  try {
    const Device = await import("expo-device");
    if (!Device.isDevice) return;

    const Notifications = await import("expo-notifications");

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch {
      /* ignore */
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (token) {
      await apiPost("/auth/push-token/", { token }).catch(() => {});
    }
  } catch {
    /* Expo Go yoki ruxsat yo'q — jim o'tamiz */
  }
}
