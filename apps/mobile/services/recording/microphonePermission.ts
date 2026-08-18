import { Alert, Linking, Platform } from "react-native";
import { AudioModule } from "expo-audio";

/**
 * First launch (undetermined / canAskAgain): show the OS microphone prompt.
 * Only after the user has permanently denied do we send them to Settings.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const current = await AudioModule.getRecordingPermissionsAsync();
    if (current.granted) {
      await requestNotificationsIfNeeded();
      return true;
    }

    if (current.status === "undetermined" || current.canAskAgain) {
      const result = await AudioModule.requestRecordingPermissionsAsync();
      if (result.granted) {
        await requestNotificationsIfNeeded();
        return true;
      }
      if (result.canAskAgain) {
        Alert.alert(
          "需要麦克风权限",
          "录音需要使用麦克风。请再次开始录音，并在系统弹窗中选择「允许」。",
        );
        return false;
      }
    }

    alertOpenSettings();
    return false;
  } catch {
    alertOpenSettings();
    return false;
  }
}

async function requestNotificationsIfNeeded(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await AudioModule.requestNotificationPermissionsAsync();
  } catch {
    // Notification is optional; recording can proceed without it.
  }
}

function alertOpenSettings(): void {
  Alert.alert("无法录音", "麦克风权限已被关闭，请在系统设置中开启后再试。", [
    { text: "取消", style: "cancel" },
    { text: "去设置", onPress: () => void Linking.openSettings() },
  ]);
}
