/**
 * Banner shown when the workspace has zero usable agents for the current
 * user. Tap → staff roster.
 */
import { Pressable } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { useWorkspaceStore } from "@/data/workspace-store";

export function NoAgentBanner() {
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);

  const handlePress = () => {
    if (!wsSlug) return;
    router.push(`/${wsSlug}/staff`);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mx-3 mt-2 mb-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel="暂无数字员工，打开名册"
    >
      <Text className="text-sm font-medium text-foreground">
        暂无可用数字员工
      </Text>
      <Text className="text-xs text-muted-foreground mt-0.5">
        请在 Web 端创建，或打开名册查看状态。
      </Text>
    </Pressable>
  );
}
