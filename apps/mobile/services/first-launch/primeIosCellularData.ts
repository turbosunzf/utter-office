import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

/**
 * iOS only shows the "wireless data" / cellular permission sheet when:
 * 1. the device is not on Wi-Fi
 * 2. the app first tries to use cellular
 *
 * Fire a short, throwaway request so that sheet appears on first launch
 * instead of blocking a later API call. Wi-Fi skips the probe. Android
 * does not need this.
 */
export async function primeIosCellularData(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const state = await NetInfo.fetch();
    if (state.type === "wifi") return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      await fetch("https://www.apple.com", {
        method: "GET",
        signal: controller.signal,
      });
    } catch {
      // Timeout / network error still counts as having attempted cellular.
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Never block first-launch UI on a probe failure.
  }
}
