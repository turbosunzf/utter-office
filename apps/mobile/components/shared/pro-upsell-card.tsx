/**
 * Commercial PRO upsell strip — visual only (meet-think Profile PRO card).
 * Does not charge; CTA opens a placeholder alert / settings path.
 */
import { Alert, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, type AppIconName } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const FEATURES: { icon: AppIconName; label: string }[] = [
  { icon: "Users", label: "无限员工" },
  { icon: "Zap", label: "优先队列" },
  { icon: "ChartColumn", label: "高级报表" },
  { icon: "Shield", label: "审计日志" },
];

export function ProUpsellCard({
  onPress,
}: {
  onPress?: () => void;
}) {
  const handle = () => {
    if (onPress) {
      onPress();
      return;
    }
    Alert.alert(
      "专业版即将开放",
      "专业版将解锁更多数字员工席位、高级报表与审计能力。当前为展示入口，不产生扣费。",
    );
  };

  return (
    <Pressable onPress={handle} accessibilityRole="button" accessibilityLabel="了解专业版">
      <LinearGradient
        colors={["#1A1F36", "#2A3358"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          padding: 16,
          gap: 14,
        }}
      >
        <View className="flex-row items-center gap-2">
          <Icon name="Crown" size={18} color="#FFD700" />
          <Text className="text-[15px] font-bold text-white flex-1">
            专业版工作区
          </Text>
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={["#9EC5FF", "#FFD4A8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text className="text-[11px] font-bold" style={{ color: "#1A1F36" }}>
                了解权益
              </Text>
            </LinearGradient>
          </View>
        </View>
        <Text className="text-[12px] leading-4" style={{ color: "rgba(255,255,255,0.72)" }}>
          更多席位、优先调度与合规审计 —— 让数字员工团队规模化运转。
        </Text>
        <View className="flex-row justify-between pt-1">
          {FEATURES.map((f) => (
            <View key={f.label} className="items-center gap-1.5 w-[22%]">
              <View
                className="size-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <Icon name={f.icon} size={16} color="#E8F0FF" />
              </View>
              <Text
                className="text-[10px] text-center"
                style={{ color: "rgba(255,255,255,0.78)" }}
                numberOfLines={1}
              >
                {f.label}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
