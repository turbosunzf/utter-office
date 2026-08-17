import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { IssueStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SectionGroup } from "@/components/ui/section-group";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueRow } from "@/components/issue/issue-row";
import { dashboardRunTimeDailyOptions } from "@/data/queries/dashboard";
import { issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { BOARD_STATUSES } from "@/lib/issue-status";

/**
 * Counts mirror `packages/core/dashboard/queries.ts`'s `DashboardRunTimeDaily`
 * rollup summed over the selected window — the same totals the 看板 hero uses,
 * so "任务进度计数与后端一致" is guaranteed by construction (one source, two
 * consumers). The segmented bar breaks the window into 完成 / 失败 / 取消.
 *
 * The "进行中的事项" list is workspace-scoped open issues (all BOARD_STATUSES
 * except `done`) — rows tap through to the issue detail screen, which is the
 * "可点进 issue" acceptance criterion.
 *
 * `tz` 从 Board 传入（`localTimezone()`），与 hero 同一时区口径（P1 修复）。
 * 查询失败渲染错误 + 重试，而不是把失败伪装成「暂无」空态（P2 修复）。
 */
// Explicit `IssueStatus[]` widens the narrowed filter result back out so
// `.includes(issue.status)` accepts every status value.
const OPEN_STATUSES: IssueStatus[] = BOARD_STATUSES.filter((s) => s !== "done");

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
    () => issues.filter((i) => OPEN_STATUSES.includes(i.status)).slice(0, 5),
    [issues],
  );

  return (
    <SectionGroup title="任务进度">
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
              <Text
                className="text-[28px] font-extrabold text-foreground"
                style={{ letterSpacing: -0.5 }}
              >
                {totals.total}
              </Text>
              <Text className="text-[12px] text-muted-foreground">
                个任务已结束
              </Text>
            </View>
            <View className="flex-row h-2.5 rounded-full overflow-hidden bg-muted">
              {totals.succeeded > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: totals.succeeded, backgroundColor: t.success }}
                />
              ) : null}
              {totals.failed > 0 ? (
                <View
                  className="h-full"
                  style={{ flex: totals.failed, backgroundColor: t.destructive }}
                />
              ) : null}
              {totals.cancelled > 0 ? (
                <View
                  className="h-full"
                  style={{
                    flex: totals.cancelled,
                    backgroundColor: t.mutedForeground,
                  }}
                />
              ) : null}
            </View>
            <View className="flex-row gap-3">
              <Legend color={t.success} label="完成" count={totals.succeeded} />
              <Legend
                color={t.destructive}
                label="失败"
                count={totals.failed}
              />
              <Legend
                color={t.mutedForeground}
                label="取消"
                count={totals.cancelled}
              />
            </View>
          </>
        )}
      </View>
      {openIssues.length > 0 ? (
        <View className="border-t border-border pt-2 pb-1">
          <Text className="text-[11px] font-medium text-muted-foreground px-4 pb-1">
            进行中的事项
          </Text>
          {openIssues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              showStatus
              onPress={() => {
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
