import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useRecordingSessionContextStore } from "@/contexts/recordingSessionContextStore";
import { useRecordingSessionTimerStore } from "@/contexts/recordingSessionTimerStore";
import { useRecordingSessionUiStore } from "@/contexts/recordingSessionUiStore";
import { formatClock } from "@/services/recording/recordingElapsed";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function RecordingInProgressBar() {
  const visible = useRecordingSessionUiStore((s) => s.bannerVisible);
  const status = useRecordingSessionContextStore((s) => s.status);
  const elapsed = useRecordingSessionTimerStore((s) => s.elapsedSeconds);
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  if (!visible) return null;
  if (status !== "recording" && status !== "paused" && status !== "interrupted") {
    return null;
  }

  const paused = status !== "recording";
  const label = paused ? "已暂停" : "录制中";

  return (
    <Pressable
      onPress={() => {
        if (slug) router.push(`/${slug}/voice-record`);
      }}
      accessibilityLabel={`${label}，点击返回录音页`}
      style={{
        backgroundColor: paused ? t.warning : t.brand,
        paddingVertical: 8,
        paddingHorizontal: 16,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold" style={{ color: "#FFFFFF" }}>
          {label}
        </Text>
        <Text
          className="text-[13px] font-bold"
          style={{ color: "#FFFFFF", fontVariant: ["tabular-nums"] }}
        >
          {formatClock(elapsed)}
        </Text>
      </View>
    </Pressable>
  );
}
