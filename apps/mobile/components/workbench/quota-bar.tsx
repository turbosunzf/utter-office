/**
 * Soft commercial quota strip for workbench — display-only.
 */
import { Alert, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function WorkbenchQuotaBar() {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <Pressable
      onPress={() =>
        Alert.alert(
          "席位与配额",
          "当前为免费体验额度展示。专业版将扩展并发任务与员工席位，不产生扣费。",
        )
      }
      className="mx-3 mt-2 mb-1 rounded-xl px-3 py-2 flex-row items-center gap-2 active:opacity-80"
      style={{
        backgroundColor: colorScheme === "dark" ? t.secondary : "#EEF3FF",
        borderWidth: 1,
        borderColor: "rgba(59,111,255,0.2)",
      }}
    >
      <Text className="text-[11px] text-brand font-semibold">试用中</Text>
      <Text className="flex-1 text-[11px] text-foreground">
        本月任务额度 · 展示中
      </Text>
      <Text className="text-[11px] font-medium text-brand">升级 ›</Text>
    </Pressable>
  );
}
