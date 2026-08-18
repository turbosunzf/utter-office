/**
 * 事项流水线（工作区当前态）。
 * 需介入 = 受阻 + 待评审；进行中 = 员工在干；排队 = 还没开工。
 */
import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { HomeSection } from "@/components/home/home-section";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardIssueCard } from "@/components/board/board-issue-card";
import { ColorStat } from "@/components/board/color-stat";
import { issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function TaskProgress() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const { data: issues = [], isPending } = useQuery(issueListOptions(wsId));
  const hairline = colorScheme === "dark" ? t.border : "#ECEEF3";

  const stats = useMemo(() => {
    let hitl = 0;
    let doing = 0;
    let queue = 0;
    let done = 0;
    for (const i of issues) {
      if (i.status === "blocked" || i.status === "in_review") hitl += 1;
      else if (i.status === "in_progress") doing += 1;
      else if (i.status === "todo" || i.status === "backlog") queue += 1;
      else if (i.status === "done") done += 1;
    }
    return { hitl, doing, queue, done };
  }, [issues]);

  const openIssues = useMemo(
    () =>
      issues
        .filter(
          (i) =>
            i.status === "blocked" ||
            i.status === "in_review" ||
            i.status === "in_progress",
        )
        .sort((a, b) => {
          const rank = (s: string) =>
            s === "blocked" ? 0 : s === "in_review" ? 1 : 2;
          const r = rank(a.status) - rank(b.status);
          if (r !== 0) return r;
          return Date.parse(b.updated_at) - Date.parse(a.updated_at);
        })
        .slice(0, 5),
    [issues],
  );

  const barTotal = stats.hitl + stats.doing + stats.queue + stats.done;

  return (
    <HomeSection title="事项" flush>
      <View className="px-4 pt-3 pb-3 gap-3">
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : barTotal === 0 ? (
          <Text className="text-[13px] text-muted-foreground">
            还没有事项。从首页派单或新建后会出现在这里。
          </Text>
        ) : (
          <>
            <View className="flex-row items-center">
              <ColorStat
                label="需介入"
                value={stats.hitl}
                color={t.destructive}
              />
              <View className="w-px self-stretch" style={{ backgroundColor: hairline }} />
              <ColorStat
                label="进行中"
                value={stats.doing}
                color={t.brand}
              />
              <View className="w-px self-stretch" style={{ backgroundColor: hairline }} />
              <ColorStat
                label="排队"
                value={stats.queue}
                color="#D97706"
              />
              <View className="w-px self-stretch" style={{ backgroundColor: hairline }} />
              <ColorStat
                label="已完成"
                value={stats.done}
                color={t.success}
              />
            </View>
            <View className="flex-row h-1.5 rounded-full overflow-hidden bg-muted">
              {stats.hitl > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: stats.hitl, backgroundColor: t.destructive }}
                />
              ) : null}
              {stats.doing > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: stats.doing, backgroundColor: t.brand }}
                />
              ) : null}
              {stats.queue > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: stats.queue, backgroundColor: "#D97706" }}
                />
              ) : null}
              {stats.done > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: stats.done, backgroundColor: t.success }}
                />
              ) : null}
            </View>
          </>
        )}
      </View>

      {openIssues.length > 0 ? (
        <View className="border-t border-border px-2 pb-1">
          {openIssues.map((issue) => (
            <BoardIssueCard
              key={issue.id}
              issue={issue}
              onPress={() => {
                if (wsSlug) router.push(`/${wsSlug}/issue/${issue.id}`);
              }}
              onLongPress={() => {
                if (wsSlug) router.push(`/${wsSlug}/issue/${issue.id}`);
              }}
            />
          ))}
        </View>
      ) : null}
    </HomeSection>
  );
}
