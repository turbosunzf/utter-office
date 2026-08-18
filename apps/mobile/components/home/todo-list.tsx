/**
 * 待办 — 决策队列：需你介入 vs 员工在推进（PRD §4.5）。
 */
import { Pressable, View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { HomeSection } from "@/components/home/home-section";
import { Icon } from "@/components/ui/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

function dueChip(due: string | null): { label: string; today: boolean } | null {
  if (!due) return null;
  const day = new Date(due);
  if (Number.isNaN(day.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { label: "逾期", today: true };
  if (diff === 0) return { label: "今天", today: true };
  if (diff === 1) return { label: "明天", today: false };
  return { label: "稍后", today: false };
}

function blockedDays(issue: Issue): number {
  const t = Date.parse(issue.updated_at);
  if (Number.isNaN(t)) return 1;
  return Math.max(1, Math.floor((Date.now() - t) / 86_400_000));
}

function progressHint(issue: Issue): { pct: number; label: string } {
  if (issue.status === "in_progress") return { pct: 0.6, label: "60%" };
  if (issue.status === "todo") return { pct: 0.12, label: "排队" };
  return { pct: 0.08, label: "排队" };
}

export function splitTodoQueue(issues: Issue[]) {
  const intervene = issues.filter(
    (i) => i.status === "blocked" || i.status === "in_review",
  );
  const advancing = issues.filter(
    (i) =>
      i.status === "in_progress" ||
      i.status === "todo" ||
      i.status === "backlog",
  );
  return { intervene, advancing };
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
  const { intervene, advancing } = splitTodoQueue(issues);
  const hitl = intervene.slice(0, 2);
  const push = advancing.slice(0, 4);

  return (
    <HomeSection
      title="待办事项"
      meta={
        <>
          <Text className="text-[11px] text-muted-foreground">
            介入{" "}
            <Text className="font-bold" style={{ color: t.destructive }}>
              {intervene.length}
            </Text>
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            · 推进{" "}
            <Text className="font-bold text-foreground">{advancing.length}</Text>
          </Text>
        </>
      }
      right={
        <Pressable onPress={onPressAll} hitSlop={8}>
          <Text className="text-[11px] font-medium text-brand">
            全部 ({issues.length}) ›
          </Text>
        </Pressable>
      }
    >
      {issues.length === 0 ? (
        <View className="items-center px-2 py-7 gap-2">
          <Icon name="Check" size={22} color={t.success} strokeWidth={2.4} />
          <Text className="text-[15px] font-bold text-foreground">
            今天没有待办
          </Text>
          <Pressable
            onPress={onPressAll}
            className="rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: well }}
          >
            <Text className="text-[11px] font-medium text-brand">去看板看看 ›</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {hitl.map((issue) => {
            const due = dueChip(issue.due_date);
            const days = blockedDays(issue);
            return (
              <Pressable
                key={issue.id}
                onPress={() => onPressIssue(issue)}
                className="flex-row items-center gap-2 rounded-[10px] px-2.5 py-2 mb-2 active:opacity-90"
                style={{
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(239,68,68,0.12)"
                      : "#FFF5F5",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.16)",
                }}
              >
                <View
                  className="rounded px-1.5 py-1"
                  style={{ backgroundColor: t.destructive }}
                >
                  <Text className="text-[9px] font-extrabold text-white text-center leading-[1.15]">
                    {issue.status === "in_review" ? "评审" : "受阻"}
                    {"\n"}
                    {days}天
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text
                    className="text-[13px] font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {issue.title}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <Text className="text-[10px] font-bold text-brand">
                      {issue.identifier}
                    </Text>
                    {issue.assignee_id ? (
                      <ActorAvatar
                        type={issue.assignee_type}
                        id={issue.assignee_id}
                        size={14}
                      />
                    ) : null}
                    {due ? (
                      <Text className="text-[10px] text-muted-foreground">
                        {due.label}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text className="text-[11px] font-bold" style={{ color: t.destructive }}>
                  处理 ›
                </Text>
              </Pressable>
            );
          })}

          {push.length > 0 ? (
            <View>
              <Text className="text-[10px] font-bold text-muted-foreground px-0.5 pb-1">
                员工在推进 ·{" "}
                <Text className="text-foreground">{advancing.length}</Text>
              </Text>
              {push.map((issue, idx) => {
                const due = dueChip(issue.due_date);
                const hint = progressHint(issue);
                return (
                  <Pressable
                    key={issue.id}
                    onPress={() => onPressIssue(issue)}
                    className={cn(
                      "flex-row items-center gap-2 py-2 active:opacity-90",
                      idx > 0 && "border-t border-border/70",
                    )}
                  >
                    <Text
                      className="w-7 text-[10px] font-bold"
                      style={{
                        color: due?.today ? t.brand : t.mutedForeground,
                      }}
                    >
                      {due?.label ?? "—"}
                    </Text>
                    <View className="flex-1 min-w-0">
                      <Text
                        className="text-[13px] font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {issue.identifier} · {issue.title}
                      </Text>
                      <View
                        className="mt-1 h-[3px] rounded-sm overflow-hidden"
                        style={{ backgroundColor: "#E8ECF4" }}
                      >
                        <View
                          className="h-full rounded-sm"
                          style={{
                            width: `${hint.pct * 100}%`,
                            backgroundColor:
                              issue.status === "in_progress"
                                ? t.brand
                                : "#D1D5DB",
                          }}
                        />
                      </View>
                    </View>
                    <View className="items-end gap-0.5">
                      {issue.assignee_id ? (
                        <ActorAvatar
                          type={issue.assignee_type}
                          id={issue.assignee_id}
                          size={18}
                        />
                      ) : (
                        <View className="size-[18px]" />
                      )}
                      <Text className="text-[9px] font-semibold text-muted-foreground">
                        {hint.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      )}
    </HomeSection>
  );
}
