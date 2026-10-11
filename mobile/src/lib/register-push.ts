import { Platform } from "react-native";
import { supabase } from "./supabase";

let currentToken: string | null = null;

export async function registerResidentPush(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const Device = await import("expo-device");
    const Notifications = await import("expo-notifications");
    const Constants = await import("expo-constants");
    if (!Device.isDevice) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("deliveries", {
        name: "Deliveries",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;

    const projectId =
      Constants.default.easConfig?.projectId ??
      Constants.default.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token.data;
    const saved = await supabase.from("device_tokens").upsert(
      {
        user_id: userId,
        token: token.data,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" },
    );
    if (saved.error) currentToken = null;
  } catch {
    currentToken = null;
  }
}

export async function signOutAndClearPush(): Promise<void> {
  if (supabase && currentToken) {
    await supabase.from("device_tokens").delete().eq("token", currentToken);
  }
  currentToken = null;
  await supabase?.auth.signOut();
}
