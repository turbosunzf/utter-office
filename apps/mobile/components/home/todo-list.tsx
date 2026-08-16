/**
 * 待办 — the open (non-done, non-cancelled) issues assigned to me, rendered as
 * a compact list on the home tab (step ③). "全部待办" pushes the full My
 * Issues route (`/[workspace]/my-issues`).
 *
 * Presentational: the caller passes the already-filtered + sorted `issues` —
 * filtering/ordering lives in `(tabs)/home.tsx` so the preview and the stats
 * cards read the same slice. Each row renders the issue's status glyph (via
 * the shared `StatusIcon`) + title + due date; tapping a row opens the issue
 * detail, matching the "待办点击跳 issue 详情" acceptance.
 *
 * Only `import type` + a pure date formatter are pulled from `@multica/core`
 * (the mobile sharing whitelist).
 */
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Issue } from "@multica/core/types";
import { formatDateOnly } from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { StatusIcon } from "@/components/ui/status-icon";
import { SectionGroup } from "@/components/ui/section-group";
import { Separator } from "@/components/ui/separator";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

/** How many todos to preview before collapsing into the "全部待办" footer. */
const PREVIEW_LIMIT = 5;

export function TodoList({
  issues,
  onPressIssue,
  onPressAll,
}: {
  issues: Issue[];
  onPressIssue: (issue: Issue) => void;
  onPressAll: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  if (issues.length === 0) {
    return (
      <SectionGroup title="待办">
        <View className="items-center px-4 py-8 gap-2">
          <Ionicons
            name="checkmark-circle-outline"
            size={26}
            color={t.success}
          />
          <Text className="text-sm font-medium text-foreground">没有待办</Text>
          <Text className="text-xs text-muted-foreground text-center">
            有新任务指派给你时，会出现在这里。
          </Text>
        </View>
      </SectionGroup>
    );
  }

  const preview = issues.slice(0, PREVIEW_LIMIT);

  return (
    <SectionGroup title="待办">
      {preview.map((issue, idx) => (
        <View key={issue.id}>
          <Pressable
            onPress={() => onPressIssue(issue)}
            className="flex-row items-center gap-3 px-4 py-3 active:bg-secondary"
          >
            <StatusIcon status={issue.status} size={14} />
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {issue.title}
            </Text>
            {issue.due_date ? (
              <Text className="text-xs text-muted-foreground">
                {formatDateOnly(issue.due_date)}
              </Text>
            ) : null}
          </Pressable>
          {idx < preview.length - 1 ? <Separator /> : null}
        </View>
      ))}
      <Separator />
      <Pressable
        onPress={onPressAll}
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-1 px-4 py-3 active:bg-secondary"
      >
        <Text className="text-sm font-medium text-primary">全部待办</Text>
        <Ionicons name="chevron-forward" size={14} color={t.primary} />
      </Pressable>
    </SectionGroup>
  );
}
