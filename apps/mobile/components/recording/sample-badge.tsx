import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function SampleBadge({ visible }: { visible: boolean }) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  if (!visible) return null;
  return (
    <View
      className="rounded-md px-1.5 py-0.5"
      style={{ borderWidth: 1, borderColor: t.border }}
    >
      <Text className="text-[9px] font-medium text-muted-foreground">示例</Text>
    </View>
  );
}
