/**
 * Commercial PRO upsell — mine only. Visual placeholder, no charge.
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
    <Pressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel="了解专业版工作区权益"
      style={{ flexShrink: 0 }}
    >
      <LinearGradient
        colors={["#151A2E", "#1F2744", "#2A3358"]}
        locations={[0, 0.48, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <View className="flex-row items-center justify-between mb-2.5">
          <View
            className="rounded-full px-2 py-1"
            style={{ backgroundColor: "transparent", overflow: "hidden" }}
          >
            <LinearGradient
              colors={["#C9DCFF", "#FFE0B8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}
            >
              <Text className="text-[10px] font-bold" style={{ color: "#1A1F36" }}>
                当前 · 免费体验
              </Text>
            </LinearGradient>
          </View>
          <Text className="text-[11px]" style={{ color: "rgba(255,255,255,0.62)" }}>
            席位 <Text className="font-bold text-white">3/5</Text>
            {"  "}
            并发 <Text className="font-bold text-white">1</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-2 mb-2">
          <Icon name="Crown" size={18} color="#FFD700" />
          <Text className="text-[16px] font-extrabold text-white flex-1">
            专业版工作区
          </Text>
          <LinearGradient
            colors={["#9EC5FF", "#FFD4A8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Text className="text-[11px] font-bold" style={{ color: "#1A1F36" }}>
              了解权益
            </Text>
          </LinearGradient>
        </View>
        <Text
          className="text-[12px] leading-[17px] mb-3"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          更多席位、优先调度与合规审计 —— 让数字员工团队规模化运转。
        </Text>
        <View
          className="flex-row justify-between pt-2.5"
          style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}
        >
          {FEATURES.map((f) => (
            <View key={f.label} className="items-center w-[22%] gap-1">
              <View
                className="size-8 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <Icon name={f.icon} size={14} color="#E8F0FF" />
              </View>
              <Text
                className="text-[10px] font-semibold text-center"
                style={{ color: "rgba(255,255,255,0.82)" }}
                numberOfLines={1}
              >
                {f.label}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row justify-between mt-2.5">
          <Text className="text-[10px]" style={{ color: "rgba(255,255,255,0.48)" }}>
            展示入口 · 不产生扣费
          </Text>
          <Text className="text-[10px]" style={{ color: "rgba(255,255,255,0.48)" }}>
            报表在「数据报告」
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
