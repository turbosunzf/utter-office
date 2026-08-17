/**
 * 待办 — home preview of open assigned issues (PRD §4.5).
 */
import { Pressable, View } from "react-native";
import type { Issue } from "@multica/core/types";
import { formatDateOnly } from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { ElevatedSurface } from "@/components/ui/elevated-surface";
import { Icon } from "@/components/ui/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 5;

function dueMeta(due: string | null): {
  label: string;
  tone: "muted" | "today" | "overdue";
} | null {
  if (!due) return null;
  const day = new Date(due);
  if (Number.isNaN(day.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { label: "逾期", tone: "overdue" };
  if (diff === 0) return { label: "今天", tone: "today" };
  if (diff === 1) return { label: "明天", tone: "muted" };
  return { label: formatDateOnly(due), tone: "muted" };
}

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
  const well = colorScheme === "dark" ? t.secondary : "#F5F7FC";

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[12px] font-medium text-muted-foreground">
          待办事项
        </Text>
        <Pressable onPress={onPressAll} hitSlop={8} accessibilityRole="button">
          <Text className="text-[11px] font-medium text-brand">
            全部 ({issues.length}) ›
          </Text>
        </Pressable>
      </View>

      <ElevatedSurface className="border-0 overflow-hidden">
        {issues.length === 0 ? (
          <View className="items-center px-4 py-9 gap-2">
            <View className="relative mb-1 size-16 items-center justify-center">
              <View
                className="absolute size-16 rounded-full"
                style={{ backgroundColor: "rgba(34,197,94,0.08)" }}
              />
              <View
                className="absolute size-11 rounded-full"
                style={{ backgroundColor: "rgba(34,197,94,0.14)" }}
              />
              <View
                className="size-9 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(34,197,94,0.2)" }}
              >
                <Icon name="Check" size={20} color={t.success} strokeWidth={2.6} />
              </View>
            </View>
            <Text className="text-[15px] font-bold text-foreground">
              今天没有待办
            </Text>
            <Text className="text-[12px] text-muted-foreground text-center px-4 leading-4">
              指派给你的事项会按优先级出现在这里，也可以去看板看看整盘进度。
            </Text>
            <Pressable
              onPress={onPressAll}
              className="mt-1 rounded-full px-3.5 py-1.5 active:opacity-80"
              style={{ backgroundColor: well }}
            >
              <Text className="text-[11px] font-medium text-brand">
                查看我的事项 ›
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {issues.slice(0, PREVIEW_LIMIT).map((issue, idx, arr) => {
              const due = dueMeta(issue.due_date);
              return (
                <Pressable
                  key={issue.id}
                  onPress={() => onPressIssue(issue)}
                  className={cn(
                    "flex-row items-center gap-3 px-3.5 py-3 active:bg-secondary",
                    idx < arr.length - 1 && "border-b border-border/60",
                  )}
                >
                  <StatusIcon status={issue.status} size={15} />
                  <View className="flex-1 min-w-0 gap-0.5">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[11px] text-muted-foreground">
                        {issue.identifier}
                      </Text>
                      <PriorityIcon priority={issue.priority} size={12} />
                    </View>
                    <Text
                      className="text-[14px] font-medium text-foreground"
                      numberOfLines={1}
                    >
                      {issue.title}
                    </Text>
                  </View>
                  {due ? (
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor:
                          due.tone === "overdue"
                            ? "rgba(239,68,68,0.12)"
                            : due.tone === "today"
                              ? "rgba(59,111,255,0.12)"
                              : well,
                      }}
                    >
                      <Text
                        className={cn(
                          "text-[10px] font-medium",
                          due.tone === "overdue"
                            ? "text-destructive"
                            : due.tone === "today"
                              ? "text-brand"
                              : "text-muted-foreground",
                        )}
                      >
                        {due.label}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ElevatedSurface>
    </View>
  );
}
