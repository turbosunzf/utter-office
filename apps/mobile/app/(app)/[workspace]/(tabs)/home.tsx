/**
 * 首页 — PRD §4 Today shell:
 *   greeting → hero → 组织在岗 → 工作成果(24h) → 待办 → 简报
 */
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Header } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { QuickActions } from "@/components/home/quick-actions";
import { HomeHero } from "@/components/home/home-hero";
import { OutcomeFeed } from "@/components/home/outcome-feed";
import { TodoList } from "@/components/home/todo-list";
import { BriefList } from "@/components/home/brief-list";
import { useVoiceStore } from "@/data/stores/voice-store";
import {
  buildMyIssuesFilter,
  myIssueListOptions,
} from "@/data/queries/my-issues";
import { agentListOptions } from "@/data/queries/agents";
import { memberListOptions } from "@/data/queries/members";
import { projectListOptions } from "@/data/queries/projects";
import { workspaceListOptions } from "@/data/queries/workspaces";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useInboxUnreadCount } from "@/lib/unread-counts";
import { BlockingNoticeBar } from "@/components/shared/blocking-notice-bar";
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
  const { data: projects = [], isFetched: projectsFetched } = useQuery(
    projectListOptions(wsId),
  );
  const { data: workspaces } = useQuery(workspaceListOptions());
  const memberRole = members.find((m) => m.user_id === userId)?.role;
  const workspaceName =
    workspaces?.find((w) => w.slug === wsSlug)?.name ?? "工作区";
  const onDutyReady = agentsFetched && membersFetched;

  const onDutyAgents = useMemo(() => {
    if (!onDutyReady) return null;
    return agents.filter(
      (a) =>
        !a.archived_at &&
        canAssignAgent(a, userId, memberRole) &&
        (a.status === "idle" || a.status === "working"),
    );
  }, [agents, userId, memberRole, onDutyReady]);

  const onDutyCount = onDutyAgents?.length ?? null;
  const onDutyAgentIds = useMemo(
    () => (onDutyAgents ?? []).map((a) => a.id),
    [onDutyAgents],
  );

  const projectCount = projectsFetched
    ? projects.filter(
        (p) => p.status === "planned" || p.status === "in_progress" || p.status === "paused",
      ).length
    : null;

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

  const openSheet = useVoiceStore((s) => s.openSheet);

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
        <Icon
          name={inboxUnread > 0 ? "BellRing" : "Bell"}
          size={22}
          color={t.foreground}
          strokeWidth={2}
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
        name="Search"
        onPress={() => go("/search")}
        accessibilityLabel="搜索"
      />
    </>
  );

  return (
    <View className="flex-1 bg-background">
      <Header
        title={firstName ? `${greet}，${firstName}` : greet}
        right={headerRight}
      />
      <BlockingNoticeBar />
      <ScrollView contentContainerClassName="gap-3.5 pb-10 pt-2">
        <HomeHero
          onDispatch={() => {
            if (!wsSlug) return;
            router.push({
              pathname: "/[workspace]/staff-picker",
              params: { workspace: wsSlug, intent: "dispatch" },
            });
          }}
          onNewIssue={() => go("/new-issue")}
          onVoiceHint={() => openSheet()}
        />
        <QuickActions
          workspaceName={workspaceName}
          onDutyCount={onDutyCount}
          onDutyAgentIds={onDutyAgentIds}
          projectCount={projectCount}
          inboxBadge={inboxUnread}
          onPressProjects={() => go("/more/projects")}
          onPressInbox={() => go("/inbox")}
          onPressStaff={() => go("/staff")}
        />
        <OutcomeFeed />
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
