import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function ColorStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  return (
    <View className="flex-1 items-center py-1">
      <Text
        className="text-[22px] font-extrabold"
        style={{ color: color ?? t.foreground, letterSpacing: -0.4 }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        className="text-[11px] text-muted-foreground mt-0.5"
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
