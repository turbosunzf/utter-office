import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { useRecordingSessionContextStore } from "@/contexts/recordingSessionContextStore";
import { requestPhotoCapturePermissions } from "./cameraPermission";

export async function captureRecordingPhoto(): Promise<void> {
  const ok = await requestPhotoCapturePermissions();
  if (!ok) return;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]?.uri) return;

  const sessionDir = useRecordingSessionContextStore.getState().sessionDir;
  if (!sessionDir) return;

  const dirUri = sessionDir.startsWith("file:")
    ? sessionDir
    : `file://${sessionDir}`;
  const dest = new File(dirUri, `photo-${Date.now()}.jpg`);
  new File(result.assets[0].uri).copy(dest);
  Alert.alert("已保存", "照片已附到本次录音。");
}
