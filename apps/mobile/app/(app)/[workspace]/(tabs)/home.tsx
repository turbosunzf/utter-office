/**
 * 首页 — redesigned home tab (step ③). Personal dashboard:
 *
 *   hero greeting → 3 stats cards → 待办 list → 行业简报 placeholder
 *
 * All three stats are "个人维度" (personal) and aggregated on the frontend
 * from existing endpoints — no new API:
 *
 *   - 进行中任务  = my assigned issues with status `in_progress`
 *   - 近 7 天完成 = my assigned issues with status `done` whose `updated_at`
 *                   falls in the last 7 days. `Issue` has no `completed_at`,
 *                   so `updated_at` is the completion proxy — documented here
 *                   rather than silently wrong.
 *   - 运行中智能体 = agents whose presence workload is `working`
 *                   (runningCount > 0), via the shared presence map.
 *
 * The todo preview and the stats read the same "assigned to me" slice
 * (`myIssueListOptions` scope `assigned`), so the numbers always reconcile
 * with the full 待办 list behind "全部待办".
 */
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Header } from "@/components/ui/header";
import { HeaderActions } from "@/components/ui/app-header-actions";
import { StatsGrid, type HomeStat } from "@/components/home/stats-card";
import { TodoList } from "@/components/home/todo-list";
import { BriefList } from "@/components/home/brief-list";
import {
  buildMyIssuesFilter,
  myIssueListOptions,
} from "@/data/queries/my-issues";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useWorkspacePresenceMap } from "@/lib/use-agent-presence";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

// Statuses that still count as "on my plate" for the todo preview — everything
// except the two terminal states (done / cancelled).
const OPEN_STATUSES: ReadonlySet<Issue["status"]> = new Set([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
]);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function Home() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const filter = useMemo(
    () =>
      userId
        ? buildMyIssuesFilter("assigned", userId)
        : { assignee_id: "" },
    [userId],
  );

  const { data: myIssues, isLoading } = useQuery({
    ...myIssueListOptions(wsId, "assigned", filter),
    enabled: !!wsId && !!userId,
  });

  const { byAgent: presenceByAgent, loading: presenceLoading } =
    useWorkspacePresenceMap(wsId);

  const stats = useMemo<HomeStat[]>(() => {
    const issues = myIssues ?? [];
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const inProgress = issues.filter(
      (i) => i.status === "in_progress",
    ).length;
    const done7d = issues.filter(
      (i) => i.status === "done" && new Date(i.updated_at).getTime() >= cutoff,
    ).length;
    const runningAgents = [...presenceByAgent.values()].filter(
      (d) => d.workload === "working",
    ).length;
    return [
      {
        icon: "play.circle",
        label: "进行中任务",
        value: isLoading ? null : inProgress,
        tint: t.brand,
      },
      {
        icon: "checkmark.circle",
        label: "近 7 天完成",
        value: isLoading ? null : done7d,
        tint: t.success,
      },
      {
        icon: "cpu",
        label: "运行中智能体",
        value: presenceLoading ? null : runningAgents,
        tint: t.info,
      },
    ];
  }, [myIssues, presenceByAgent, presenceLoading, isLoading, t]);

  const todos = useMemo(
    () =>
      (myIssues ?? [])
        .filter((i) => OPEN_STATUSES.has(i.status))
        .sort(byDueThenPriority),
    [myIssues],
  );

  const openIssue = (issue: Issue) => {
    if (wsSlug) router.push(`/${wsSlug}/issue/${issue.id}`);
  };
  const openAllTodos = () => {
    if (wsSlug) router.push(`/${wsSlug}/my-issues`);
  };

  const firstName = user?.name?.split(" ")[0] ?? "";
  const dateLabel = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <View className="flex-1 bg-background">
      <Header title="首页" right={<HeaderActions />} />
      <ScrollView contentContainerClassName="gap-6 pb-8">
        {/* Hero greeting — personal context above the KPI cards. */}
        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold text-foreground">
            {firstName ? `你好，${firstName}` : "你好"}
          </Text>
          <Text className="text-sm text-muted-foreground mt-1">
            {dateLabel}
          </Text>
        </View>

        <StatsGrid stats={stats} />

        <TodoList
          issues={todos}
          onPressIssue={openIssue}
          onPressAll={openAllTodos}
        />

        <BriefList />
      </ScrollView>
    </View>
  );
}

// Priority-urgency → due-date → recency ordering for the todo preview.
// Mirrors the natural "what should I do next" read: urgent first, then soonest
// due date, undated last, ties broken by most-recently-updated.
const PRIORITY_WEIGHT: Record<Issue["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

function byDueThenPriority(a: Issue, b: Issue): number {
  const p = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (p !== 0) return p;
  const da = a.due_date ? Date.parse(a.due_date) : Number.POSITIVE_INFINITY;
  const db = b.due_date ? Date.parse(b.due_date) : Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
