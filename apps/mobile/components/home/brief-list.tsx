/**
 * 行业简报 — the industry-brief section on the redesigned home tab (step ③).
 *
 * Data is not wired yet: the brief source lands on the A-line (COD-16), so
 * this renders the agreed "简报生成中" empty state whenever there is nothing
 * to show. The `briefs` prop exists as the future data seam — pass the A-line
 * items once COD-16 lands and the empty state disappears automatically.
 */
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { SectionGroup } from "@/components/ui/section-group";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function BriefList({ briefs = [] }: { briefs?: unknown[] }) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <SectionGroup title="行业简报">
      {briefs.length > 0 ? null : (
        <View className="items-center px-4 py-8 gap-2">
          <Ionicons
            name="sparkles-outline"
            size={22}
            color={t.mutedForeground}
          />
          <Text className="text-sm font-medium text-foreground">简报生成中</Text>
          <Text className="text-xs text-muted-foreground text-center">
            行业动态正在整理，稍后回来看看。
          </Text>
        </View>
      )}
    </SectionGroup>
  );
}
