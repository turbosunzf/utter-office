/**
 * 首页 — PRD §4 Today shell (M1):
 *   greeting + bell + search → 快捷 4 格 → 报告骨架 → 待办 → 简报骨架
 *
 * Personal KPI three-card grid removed; report real data lands in M2.
 */
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Header } from "@/components/ui/header";
import { IconButton } from "@/components/ui/icon-button";
import { QuickActions, type QuickAction } from "@/components/home/quick-actions";
import { ReportSkeleton } from "@/components/home/report-skeleton";
import { TodoList } from "@/components/home/todo-list";
import { BriefList } from "@/components/home/brief-list";
import {
  buildMyIssuesFilter,
  myIssueListOptions,
} from "@/data/queries/my-issues";
import { agentListOptions } from "@/data/queries/agents";
import { memberListOptions } from "@/data/queries/members";
import { workspaceListOptions } from "@/data/queries/workspaces";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useInboxUnreadCount } from "@/lib/unread-counts";
import { canAssignAgent } from "@/lib/can-assign-agent";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const OPEN_STATUSES: ReadonlySet<Issue["status"]> = new Set([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
]);

function greetingForHour(hour: number): string {
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export default function Home() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const inboxUnread = useInboxUnreadCount(wsId);

  const filter = useMemo(
    () =>
      userId
        ? buildMyIssuesFilter("assigned", userId)
        : { assignee_id: "" },
    [userId],
  );

  const { data: myIssues } = useQuery({
    ...myIssueListOptions(wsId, "assigned", filter),
    enabled: !!wsId && !!userId,
  });

  const { data: agents = [], isFetched: agentsFetched } = useQuery(
    agentListOptions(wsId),
  );
  const { data: members = [], isFetched: membersFetched } = useQuery(
    memberListOptions(wsId),
  );
  const { data: workspaces } = useQuery(workspaceListOptions());
  const memberRole = members.find((m) => m.user_id === userId)?.role;
  const workspaceName =
    workspaces?.find((w) => w.slug === wsSlug)?.name ?? "工作区";
  // Wait for members before counting — canAssignAgent returns false when
  // memberRole is still undefined, which would flash「0 位员工在岗」.
  const onDutyReady = agentsFetched && membersFetched;

  // PRD §4.2：非归档且可见员工中 status 为 idle / working（在线可用）。
  const onDutyCount = useMemo(() => {
    if (!onDutyReady) return null;
    return agents.filter(
      (a) =>
        !a.archived_at &&
        canAssignAgent(a, userId, memberRole) &&
        (a.status === "idle" || a.status === "working"),
    ).length;
  }, [agents, userId, memberRole, onDutyReady]);

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
  const go = (path: string) => {
    if (wsSlug) router.push(`/${wsSlug}${path}`);
  };

  const firstName = user?.name?.split(" ")[0] ?? "";
  const greet = greetingForHour(new Date().getHours());

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: "new",
        label: "新建事项",
        icon: "plus",
        onPress: () => go("/new-issue"),
      },
      {
        key: "dispatch",
        label: "派单",
        icon: "person.2",
        onPress: () => {
          if (!wsSlug) return;
          router.push({
            pathname: "/[workspace]/staff-picker",
            params: { workspace: wsSlug, intent: "dispatch" },
          });
        },
      },
      {
        key: "projects",
        label: "项目",
        icon: "folder",
        onPress: () => go("/more/projects"),
      },
      {
        key: "inbox",
        label: "收件箱",
        icon: "tray",
        badge: inboxUnread,
        onPress: () => go("/inbox"),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go closes over wsSlug
    [wsSlug, inboxUnread],
  );

  const headerRight = (
    <>
      <Pressable
        onPress={() => go("/inbox")}
        accessibilityLabel={
          inboxUnread > 0
            ? `收件箱，${inboxUnread} 条未读`
            : "收件箱"
        }
        className="relative h-9 w-9 items-center justify-center active:opacity-70"
      >
        <ExpoImage
          source={inboxUnread > 0 ? "sf:bell.badge.fill" : "sf:bell"}
          tintColor={t.foreground}
          style={{ width: 22, height: 22 }}
        />
        {inboxUnread > 0 ? (
          <View className="absolute right-0.5 top-0.5 min-w-[14px] h-3.5 items-center justify-center rounded-full bg-brand px-0.5">
            <Text className="text-[9px] font-bold text-white">
              {inboxUnread > 99 ? "99+" : String(inboxUnread)}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <IconButton
        name="search"
        onPress={() => go("/search")}
        accessibilityLabel="搜索"
      />
    </>
  );

  return (
    <View className="flex-1 bg-background">
      <Header
        title={firstName ? `${greet}，${firstName}` : greet}
        subtitle={`${workspaceName} · ${
          onDutyCount == null ? "—" : `${onDutyCount} 位员工在岗`
        }`}
        right={headerRight}
      />
      <ScrollView contentContainerClassName="gap-6 pb-8 pt-4">
        <QuickActions actions={quickActions} />
        <ReportSkeleton />
        <View className="px-4">
          <TodoList
            issues={todos}
            onPressIssue={openIssue}
            onPressAll={openAllTodos}
          />
        </View>
        <View className="px-4">
          <BriefList />
        </View>
      </ScrollView>
    </View>
  );
}

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
