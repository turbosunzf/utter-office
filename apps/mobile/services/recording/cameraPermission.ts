import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * First launch: show the OS camera prompt.
 * Permanently denied: send the user to Settings (unless `silent`).
 * Camera is optional for starting a recording — denial does not block capture.
 */
export async function requestCameraPermission(opts?: {
  silent?: boolean;
}): Promise<boolean> {
  try {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) return true;

    if (current.status === "undetermined" || current.canAskAgain) {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      if (result.granted) return true;
      if (opts?.silent) return false;
      if (result.canAskAgain) {
        Alert.alert(
          "需要相机权限",
          "拍照需要使用相机。请再次点「拍照」，并在系统弹窗中选择「允许」。",
        );
        return false;
      }
    }

    if (!opts?.silent) alertOpenSettings();
    return false;
  } catch {
    if (!opts?.silent) alertOpenSettings();
    return false;
  }
}

function alertOpenSettings(): void {
  Alert.alert("无法拍照", "相机权限已被关闭，请在系统设置中开启后再试。", [
    { text: "取消", style: "cancel" },
    { text: "去设置", onPress: () => void Linking.openSettings() },
  ]);
}
