import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { SectionGroup } from "@/components/ui/section-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  dashboardAgentRunTimeOptions,
  dashboardUsageByAgentOptions,
  dashboardFailuresByAgentOptions,
} from "@/data/queries/dashboard";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useActorLookup } from "@/data/use-actor-name";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { formatElapsedSecs } from "@/lib/format-elapsed";
import { failureClassOf, type FailureClass } from "@/lib/failure-class";
import { formatCompact } from "./format";

const TOP_N = 5;

const FAILURE_CLASS_LABEL: Record<FailureClass, string> = {
  auth: "鉴权",
  rate_limit: "限流",
  timeout: "超时",
  provider: "模型服务",
  runtime: "运行时",
  agent: "智能体",
  other: "其他",
};

/**
 * 智能体运行数据 — per-agent bars over the selected window. `task_count`
 * bars come from `DashboardAgentRunTime`; the per-agent token total folds
 * `DashboardUsageByAgent` (which buckets by `(agent, model)`, so rows must
 * be summed by `agent_id`); the 失败分布 list folds `DashboardFailureByAgent`
 * through `failureClassOf` (excluding the empty-string *succeeded* bucket).
 *
 * Names resolve through `useActorLookup()` so a row shows the agent's real
 * name rather than a bare id.
 */
export function AgentUsage({ days }: { days: number }) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const { getName } = useActorLookup();

  const { data: runtimes = [], isLoading } = useQuery(
    dashboardAgentRunTimeOptions(wsId, days),
  );
  const { data: usage = [] } = useQuery(dashboardUsageByAgentOptions(wsId, days));
  const { data: failures = [] } = useQuery(
    dashboardFailuresByAgentOptions(wsId, days),
  );

  const tokensByAgent = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of usage) {
      const tokens =
        u.input_tokens + u.output_tokens + u.cache_read_tokens + u.cache_write_tokens;
      m.set(u.agent_id, (m.get(u.agent_id) ?? 0) + tokens);
    }
    return m;
  }, [usage]);

  const failureClasses = useMemo(() => {
    const m = new Map<FailureClass, number>();
    for (const f of failures) {
      if (f.failure_reason === "") continue; // succeeded bucket, not a failure
      const cls = failureClassOf(f.failure_reason);
      m.set(cls, (m.get(cls) ?? 0) + f.task_count);
    }
    return [...m.entries()]
      .map(([cls, count]) => ({ cls, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [failures]);

  const rows = useMemo(() => {
    const ranked = [...runtimes].sort((a, b) => b.task_count - a.task_count);
    return ranked.slice(0, TOP_N).map((r) => ({
      id: r.agent_id,
      name: getName("agent", r.agent_id),
      taskCount: r.task_count,
      seconds: r.total_seconds,
      failed: r.failed_count,
      tokens: tokensByAgent.get(r.agent_id) ?? 0,
    }));
  }, [runtimes, tokensByAgent, getName]);

  const maxTasks = rows.length ? Math.max(...rows.map((r) => r.taskCount)) : 0;
  const maxFailures = failureClasses.length
    ? Math.max(...failureClasses.map((f) => f.count))
    : 0;

  return (
    <SectionGroup title="智能体运行数据">
      <View className="p-4 gap-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            近 {days} 天暂无智能体运行记录。
          </Text>
        ) : (
          <View className="gap-3">
            <Text className="text-xs text-muted-foreground">
              {runtimes.length} 个智能体 · 近 {days} 天任务量 Top {rows.length}
            </Text>
            {rows.map((row) => (
              <View key={row.id} className="gap-1">
                <View className="flex-row items-baseline justify-between">
                  <Text
                    className="text-sm text-foreground flex-1"
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {row.taskCount}
                  </Text>
                </View>
                <View className="h-2 rounded-full overflow-hidden bg-muted">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${maxTasks ? (row.taskCount / maxTasks) * 100 : 0}%`,
                      backgroundColor: t.success,
                    }}
                  />
                </View>
                <Text className="text-xs text-muted-foreground">
                  时长 {formatElapsedSecs(row.seconds)} · 失败 {row.failed} ·{" "}
                  {formatCompact(row.tokens)} tokens
                </Text>
              </View>
            ))}
          </View>
        )}

        {failureClasses.length > 0 ? (
          <View className="gap-2 pt-1">
            <Text className="text-xs uppercase tracking-wider text-muted-foreground">
              失败分布
            </Text>
            {failureClasses.map((f) => (
              <View key={f.cls} className="flex-row items-center gap-2">
                <Text className="text-xs text-foreground w-16">
                  {FAILURE_CLASS_LABEL[f.cls]}
                </Text>
                <View className="h-2 flex-1 rounded-full overflow-hidden bg-muted">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(f.count / maxFailures) * 100}%`,
                      backgroundColor: t.destructive,
                    }}
                  />
                </View>
                <Text className="text-xs text-muted-foreground w-8 text-right">
                  {f.count}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </SectionGroup>
  );
}
