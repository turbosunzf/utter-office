import { useEffect } from "react";
import { Alert } from "react-native";
import { useRecordingSessionApi } from "@/contexts/RecordingSessionContext";
import { useRecordingSessionUiStore } from "@/contexts/recordingSessionUiStore";
import { formatClock } from "@/services/recording/recordingElapsed";

export function RecordingRecoveryHost() {
  const recovery = useRecordingSessionUiStore((s) => s.recovery);
  const { acceptRecovery, dismissRecovery } = useRecordingSessionApi();

  useEffect(() => {
    if (!recovery) return;
    const clock = formatClock(Math.floor(recovery.totalDurationMs / 1000));
    Alert.alert(
      "发现未完成的录音",
      `上次录音在 ${clock} 处中断。要继续录制，还是保存已有片段？`,
      [
        {
          text: "保存已有",
          style: "cancel",
          onPress: () => {
            void dismissRecovery();
          },
        },
        {
          text: "继续录制",
          onPress: () => {
            void acceptRecovery();
          },
        },
      ],
    );
  }, [recovery, acceptRecovery, dismissRecovery]);

  return null;
}
