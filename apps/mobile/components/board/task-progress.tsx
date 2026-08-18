import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SectionGroup } from "@/components/ui/section-group";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardIssueCard } from "@/components/board/board-issue-card";
import { dashboardRunTimeDailyOptions } from "@/data/queries/dashboard";
import { issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

/**
 * 进行中：窗口完成/失败 + 当前进行/受阻比例 + 需关注密排行。
 */

export function TaskProgress({
  days,
  tz,
}: {
  days: number;
  tz: string;
}) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const {
    data: daily = [],
    isLoading,
    error,
    refetch,
  } = useQuery(dashboardRunTimeDailyOptions(wsId, days, null, tz));
  const { data: issues = [] } = useQuery(issueListOptions(wsId));

  const totals = useMemo(() => {
    let total = 0;
    let failed = 0;
    let cancelled = 0;
    for (const d of daily) {
      total += d.task_count;
      failed += d.failed_count;
      cancelled += d.cancelled_count;
    }
    return {
      total,
      succeeded: Math.max(0, total - failed - cancelled),
      failed,
      cancelled,
    };
  }, [daily]);

  const openIssues = useMemo(
    () =>
      issues
        .filter(
          (i) =>
            i.status === "in_progress" ||
            i.status === "blocked" ||
            i.status === "in_review",
        )
        .slice(0, 5),
    [issues],
  );
  const live = useMemo(() => {
    const inProg = issues.filter((i) => i.status === "in_progress").length;
    const blocked = issues.filter((i) => i.status === "blocked").length;
    return { inProg, blocked };
  }, [issues]);

  return (
    <SectionGroup
      title="进行中"
      right={
        <Text className="text-[11px] text-muted-foreground">
          <Text className="font-bold text-foreground">{openIssues.length}</Text>{" "}
          条需关注
        </Text>
      }
    >
      <View className="px-4 pt-4 pb-3 gap-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <View className="gap-3">
            <Text className="text-sm text-destructive">
              任务进度加载失败：{" "}
              {error instanceof Error ? error.message : "未知错误"}
            </Text>
            <Button variant="outline" onPress={() => refetch()}>
              <Text>重试</Text>
            </Button>
          </View>
        ) : totals.total === 0 ? (
          <Text className="text-sm text-muted-foreground">
            近 {days} 天暂无已结束的任务。
          </Text>
        ) : (
          <>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-[12px] text-muted-foreground">窗口内任务分布</Text>
            </View>
            <View className="flex-row h-2 rounded-full overflow-hidden bg-muted">
              {totals.succeeded > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: totals.succeeded, backgroundColor: t.success }}
                />
              ) : null}
              {live.inProg > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: live.inProg, backgroundColor: t.brand }}
                />
              ) : null}
              {live.blocked > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: live.blocked, backgroundColor: t.priority }}
                />
              ) : null}
              {totals.failed > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: totals.failed, backgroundColor: t.destructive }}
                />
              ) : null}
            </View>
            <View className="flex-row gap-2.5 flex-wrap">
              <Legend color={t.success} label="完成" count={totals.succeeded} />
              <Legend color={t.brand} label="进行" count={live.inProg} />
              <Legend color={t.priority} label="受阻" count={live.blocked} />
              <Legend color={t.destructive} label="失败" count={totals.failed} />
            </View>
          </>
        )}
      </View>
      {openIssues.length > 0 ? (
        <View className="border-t border-border pt-2 pb-1">
          <Text className="text-[11px] font-medium text-muted-foreground px-3 pb-1">
            需关注
          </Text>
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
    </SectionGroup>
  );
}

function Legend({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs text-muted-foreground">
        {label} {count}
      </Text>
    </View>
  );
}
