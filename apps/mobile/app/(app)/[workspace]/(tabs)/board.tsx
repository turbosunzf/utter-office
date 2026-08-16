/**
 * 看板 (board) tab — workspace dashboard for the AI秘书 redesign.
 *
 * Layout: a time-range selector (7/30/90 天), a 2×2 hero strip, then three
 * blocks — 任务进度, 智能体运行数据, 数据分析报告. All numbers come from the
 * six `/api/dashboard/*` rollups wrapped in `data/queries/dashboard.ts`, the
 * mobile mirror of `packages/core/dashboard/queries.ts`. The hero totals and
 * the task-progress counts read the SAME `DashboardRunTimeDaily` series, so
 * the two can never disagree (acceptance criterion "计数与后端一致").
 *
 * Charts are plain RN views with flex-width bars — no chart library — per
 * the issue's "简单条形图" constraint. Empty states (no tasks / no agents /
 * no report) render inline placeholders.
 */
import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { HeaderActions } from "@/components/ui/app-header-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskProgress } from "@/components/board/task-progress";
import { AgentUsage } from "@/components/board/agent-usage";
import { ReportCard } from "@/components/board/report-card";
import { formatCompact } from "@/components/board/format";
import {
  dashboardKeys,
  dashboardRunTimeDailyOptions,
  dashboardUsageDailyOptions,
  dashboardFailuresDailyOptions,
  localTimezone,
} from "@/data/queries/dashboard";
import { useWorkspaceStore } from "@/data/workspace-store";
import { formatElapsedSecs } from "@/lib/format-elapsed";

const RANGES = [
  { days: 7, label: "7 天" },
  { days: 30, label: "30 天" },
  { days: 90, label: "90 天" },
] as const;

export default function Board() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(7);
  // 日桶按查看者时区切割，与 web `packages/core/dashboard/queries.ts` 同构
  // （P1 修复）。Hermes 支持 Intl，localTimezone 内已有兜底。
  const tz = localTimezone();

  const {
    data: runTimeDaily = [],
    isLoading: runTimeLoading,
    error: runTimeError,
  } = useQuery(dashboardRunTimeDailyOptions(wsId, days, null, tz));
  const {
    data: usageDaily = [],
    isLoading: usageLoading,
    error: usageError,
  } = useQuery(dashboardUsageDailyOptions(wsId, days, null, tz));
  const {
    data: failuresDaily = [],
    isLoading: failuresLoading,
    error: failuresError,
  } = useQuery(dashboardFailuresDailyOptions(wsId, days, null, tz));

  const hero = useMemo(() => {
    let tasks = 0;
    let seconds = 0;
    for (const d of runTimeDaily) {
      tasks += d.task_count;
      seconds += d.total_seconds;
    }
    let tokens = 0;
    for (const u of usageDaily) {
      tokens +=
        u.input_tokens + u.output_tokens + u.cache_read_tokens + u.cache_write_tokens;
    }
    let failures = 0;
    for (const f of failuresDaily) {
      if (f.failure_reason !== "") failures += f.task_count; // skip succeeded bucket
    }
    return { tasks, seconds, tokens, failures };
  }, [runTimeDaily, usageDaily, failuresDaily]);

  const loading = runTimeLoading || usageLoading || failuresLoading;
  // 三个 dashboard 查询任一失败即渲染错误横幅 + 重试，而不是把失败渲染成
  // 全 0 / 空态（P2 修复，对齐 inbox / issues 页既有模式）。
  const dashboardError = runTimeError ?? usageError ?? failuresError;
  const retryDashboard = useCallback(() => {
    void queryClient.refetchQueries({ queryKey: dashboardKeys.all(wsId) });
  }, [queryClient, wsId]);

  return (
    <View className="flex-1 bg-background">
      <Header title="看板" right={<HeaderActions />} />
      <ScrollView
        contentContainerClassName="px-4 py-4 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <RangeSelector value={days} onChange={setDays} />

        {dashboardError ? (
          <View className="px-4 gap-3 py-1">
            <Text className="text-sm text-destructive">
              看板统计接口加载失败：{" "}
              {dashboardError instanceof Error
                ? dashboardError.message
                : "未知错误"}
            </Text>
            <Button variant="outline" onPress={retryDashboard}>
              <Text>重试</Text>
            </Button>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          <HeroCard
            label="任务总数"
            value={loading ? null : String(hero.tasks)}
          />
          <HeroCard
            label="运行时长"
            value={loading ? null : formatElapsedSecs(hero.seconds)}
          />
          <HeroCard
            label="Tokens"
            value={loading ? null : formatCompact(hero.tokens)}
          />
          <HeroCard
            label="失败次数"
            value={loading ? null : String(hero.failures)}
          />
        </View>

        <TaskProgress days={days} tz={tz} />
        <AgentUsage days={days} tz={tz} />
        <ReportCard />
      </ScrollView>
    </View>
  );
}

/**
 * Time-range segmented control. Pill-row mirrors the outline-Button toolbar
 * pattern used by the old board's scope switcher — same size, same active
 * `bg-accent` / `text-accent-foreground` treatment so it reads as a native
 * iOS segmented control without a new primitive.
 */
function RangeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <View className="flex-row gap-1">
      {RANGES.map((r) => {
        const active = value === r.days;
        return (
          <Button
            key={r.days}
            variant="outline"
            size="sm"
            onPress={() => onChange(r.days)}
            className={active ? "bg-accent" : ""}
            accessibilityState={{ selected: active }}
          >
            <Text
              className={
                active ? "text-accent-foreground" : "text-muted-foreground"
              }
            >
              {r.label}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}

function HeroCard({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View className="w-[48%] rounded-md border border-border bg-card p-3 gap-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      {value === null ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <Text className="text-2xl font-semibold text-foreground">{value}</Text>
      )}
    </View>
  );
}
