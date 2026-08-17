/**
 * Prototype banner for voice subpages (PRD M4). Driven by USE_MOCK_VOICE.
 */
import { Alert, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import {
  USE_MOCK_VOICE,
  VOICE_PROTOTYPE_BANNER,
} from "@/data/mocks/voice";

export function VoicePrototypeBanner() {
  if (!USE_MOCK_VOICE) return null;
  return (
    <Pressable
      onPress={() =>
        Alert.alert(
          "原型说明",
          "本页仅演示交互结构，不采集音频、不产生转写记录。停止后不会生成文件。",
        )
      }
      className="mx-4 mt-2 mb-1 rounded-lg bg-secondary px-3 py-2 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={VOICE_PROTOTYPE_BANNER}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-[11px] text-muted-foreground text-center">
          {VOICE_PROTOTYPE_BANNER}
        </Text>
        <Text className="text-[9px] text-muted-foreground border border-border rounded px-1">
          原型
        </Text>
      </View>
    </Pressable>
  );
}
