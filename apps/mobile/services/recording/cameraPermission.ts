import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Camera + photo library are requested only when the user taps「拍照」
 * during a recording. Denial does not block the session.
 */
export async function requestPhotoCapturePermissions(): Promise<boolean> {
  const camera = await requestSingle(
    () => ImagePicker.getCameraPermissionsAsync(),
    () => ImagePicker.requestCameraPermissionsAsync(),
    "需要相机权限",
    "拍照需要使用相机。请再次点「拍照」，并在系统弹窗中选择「允许」。",
    "无法拍照",
    "相机权限已被关闭，请在系统设置中开启后再试。",
  );
  if (!camera) return false;

  return requestSingle(
    () => ImagePicker.getMediaLibraryPermissionsAsync(),
    () => ImagePicker.requestMediaLibraryPermissionsAsync(),
    "需要相册权限",
    "保存现场照片需要访问相册。请再次点「拍照」，并在系统弹窗中选择「允许」。",
    "无法保存照片",
    "相册权限已被关闭，请在系统设置中开启后再试。",
  );
}

async function requestSingle(
  getCurrent: () => Promise<ImagePicker.PermissionResponse>,
  request: () => Promise<ImagePicker.PermissionResponse>,
  retryTitle: string,
  retryBody: string,
  deniedTitle: string,
  deniedBody: string,
): Promise<boolean> {
  try {
    const current = await getCurrent();
    if (isGranted(current)) return true;

    if (current.status === "undetermined" || current.canAskAgain) {
      const result = await request();
      if (isGranted(result)) return true;
      if (result.canAskAgain) {
        Alert.alert(retryTitle, retryBody);
        return false;
      }
    }

    alertOpenSettings(deniedTitle, deniedBody);
    return false;
  } catch {
    alertOpenSettings(deniedTitle, deniedBody);
    return false;
  }
}

function isGranted(res: ImagePicker.PermissionResponse): boolean {
  if (res.granted) return true;
  const access = (res as ImagePicker.MediaLibraryPermissionResponse)
    .accessPrivileges;
  return access === "limited";
}

function alertOpenSettings(title: string, message: string): void {
  Alert.alert(title, message, [
    { text: "取消", style: "cancel" },
    { text: "去设置", onPress: () => void Linking.openSettings() },
  ]);
}
