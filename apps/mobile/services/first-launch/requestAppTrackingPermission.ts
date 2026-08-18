import { Platform } from "react-native";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";

/**
 * iOS ATT. Must run after the in-app privacy confirm, and not in the same
 * tick as another system dialog (cellular / notification), or iOS may
 * swallow the prompt.
 *
 * No-op on Android / web, and when the user has already decided.
 */
export async function requestAppTrackingPermission(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const current = await getTrackingPermissionsAsync();
    if (current.status !== "undetermined") return;
    await requestTrackingPermissionsAsync();
  } catch {
    // ATT is optional; the app works without IDFA.
  }
}
