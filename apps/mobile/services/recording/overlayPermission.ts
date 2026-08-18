import { Platform } from "react-native";
import {
  canDrawOverlays,
  isOverlayEnabled,
  openOverlaySettings,
  setOverlayEnabled,
} from "@/native/recording/RecordingBridge";

export function overlayPermissionSupported(): boolean {
  return Platform.OS === "android";
}

/** Switch is on only when the user opted in and the OS overlay grant exists. */
export function overlaySwitchOn(): boolean {
  if (!overlayPermissionSupported()) return false;
  try {
    return isOverlayEnabled() && canDrawOverlays();
  } catch {
    return false;
  }
}

export function disableOverlayPreference(): void {
  try {
    setOverlayEnabled(false);
  } catch {
    // Native module missing in Expo Go.
  }
}

/**
 * Turn overlay on. Android overlay cannot use a runtime dialog — it opens
 * the system “显示在其他应用的上层” page. Caller should sync after AppState
 * returns to active.
 */
export function enableOverlayOrRequest(): "granted" | "settings" {
  try {
    if (canDrawOverlays()) {
      setOverlayEnabled(true);
      return "granted";
    }
    openOverlaySettings();
    return "settings";
  } catch {
    return "settings";
  }
}

export function syncOverlayAfterReturningFromSettings(): boolean {
  try {
    const granted = canDrawOverlays();
    setOverlayEnabled(granted);
    return granted;
  } catch {
    return false;
  }
}
