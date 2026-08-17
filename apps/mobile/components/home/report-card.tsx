/**
 * Home report card — day/week/month in header right (PRD §4.4).
 */
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { ElevatedSurface } from "@/components/ui/elevated-surface";
import { issueListOptions } from "@/data/queries/issues";
import {
  useHomeViewStore,
  type ReportPeriod,
} from "@/data/stores/home-view-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import {
  aggregateReportMetrics,
  formatMetric,
} from "@/lib/aggregate-report-metrics";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const PERIODS: ReportPeriod[] = ["day", "week", "month"];
const PERIOD_LABELS: Record<ReportPeriod, string> = {
  day: "日",
  week: "周",
  month: "月",
};

export function ReportCard() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const period = useHomeViewStore((s) => s.reportPeriod);
  const setPeriod = useHomeViewStore((s) => s.setReportPeriod);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const well = colorScheme === "dark" ? t.secondary : "#F5F7FC";
  const accentWell = colorScheme === "dark" ? "rgba(59,111,255,0.22)" : "#EEF3FF";

  const {
    data: issues,
    isFetched,
    isError,
  } = useQuery(issueListOptions(wsId));

  const metrics = aggregateReportMetrics(issues, period, {
    issuesReady: isFetched && !isError,
  });

  const opacity = useRef(new Animated.Value(1)).current;
  const periodRef = useRef(period);

  useEffect(() => {
    if (periodRef.current === period) return;
    periodRef.current = period;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [period, opacity]);

  const primary =
    period === "day"
      ? [
          { label: "今日新建", value: formatMetric(metrics.created) },
          { label: "今日完成", value: formatMetric(metrics.completed) },
          {
            label: "员工运行",
            value: metrics.runtimeLabel,
            pending: metrics.runtimeLabel === "暂无",
          },
        ]
      : period === "week"
        ? [
            { label: "本周完成", value: formatMetric(metrics.completed) },
            {
              label: "运行时长",
              value: metrics.runtimeLabel,
              pending: true,
            },
            {
              label: "Tokens",
              value: metrics.tokensLabel,
              pending: true,
            },
          ]
        : [
            { label: "本月完成", value: formatMetric(metrics.completed) },
            {
              label: "运行时长",
              value: metrics.runtimeLabel,
              pending: true,
            },
            {
              label: "Tokens",
              value: metrics.tokensLabel,
              pending: true,
            },
          ];

  const statusChips = [
    {
      label: "进行中",
      value: formatMetric(metrics.inProgress),
      color: t.brand,
    },
    {
      label: "待评审",
      value: formatMetric(metrics.inReview),
      color: "#0D9488",
    },
    {
      label: "受阻",
      value: formatMetric(metrics.blocked),
      color: t.priority,
    },
    {
      label: "失败",
      value: metrics.failedLabel,
      color: t.destructive,
      pending: metrics.failedLabel === "暂无",
    },
  ];

  const openParts = [
    { key: "backlog", n: metrics.backlog ?? 0, color: t.mutedForeground },
    { key: "todo", n: metrics.todo ?? 0, color: t.info },
    { key: "doing", n: metrics.inProgress ?? 0, color: t.brand },
    { key: "review", n: metrics.inReview ?? 0, color: "#0D9488" },
    { key: "blocked", n: metrics.blocked ?? 0, color: t.priority },
  ];
  const openSum = openParts.reduce((s, p) => s + p.n, 0);

  const spark = metrics.dailyCompleted;
  const sparkMax = spark ? Math.max(1, ...spark) : 1;

  return (
    <View className="px-4">
      <View className="flex-row items-center justify-between px-1 mb-2">
        <Text className="text-[12px] font-medium text-muted-foreground">
          工作节奏
        </Text>
        <Pressable
          onPress={() => {
            if (!wsSlug) return;
            router.push({
              pathname: "/[workspace]/reports",
              params: { workspace: wsSlug, period },
            });
          }}
          hitSlop={8}
        >
          <Text className="text-[11px] font-medium text-brand">完整报告 ›</Text>
        </Pressable>
      </View>

      <ElevatedSurface className="border-0 overflow-hidden">
        <View className="flex-row items-center gap-2 px-3.5 pt-3.5 pb-2">
          <View
            className="size-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(59,111,255,0.14)" }}
          >
            <Text className="text-sm">📊</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[15px] font-semibold text-foreground">
              数据报告
            </Text>
            <Text className="text-[11px] text-muted-foreground">
              工作区口径 · 未完成 {formatMetric(metrics.openTotal)}
            </Text>
          </View>
          <View
            className="flex-row rounded-full p-0.5"
            style={{ backgroundColor: well }}
          >
            {PERIODS.map((p) => {
              const on = period === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  className="min-w-[34px] items-center rounded-full px-2.5 py-1.5"
                  style={{
                    backgroundColor: on ? t.brand : "transparent",
                  }}
                >
                  <Text
                    className={cn(
                      "text-[12px] font-semibold",
                      on ? "text-white" : "text-muted-foreground",
                    )}
                  >
                    {PERIOD_LABELS[p]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Animated.View style={{ opacity }} className="px-3.5 pb-4 gap-3">
          <View className="flex-row gap-2">
            {primary.map((m, i) => (
              <View
                key={m.label}
                className="flex-1 rounded-xl px-2 py-3"
                style={{ backgroundColor: i === 0 ? accentWell : well }}
              >
                <Text
                  className={cn(
                    "font-extrabold",
                    m.pending
                      ? "text-[15px] text-muted-foreground"
                      : "text-[22px] text-foreground",
                  )}
                  style={{ letterSpacing: -0.4 }}
                  numberOfLines={1}
                >
                  {m.value}
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-1">
                  {m.label}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap gap-x-3 gap-y-1.5">
            {statusChips.map((c) => (
              <View key={c.label} className="flex-row items-center gap-1.5">
                <View
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <Text className="text-[11px] text-muted-foreground">
                  {c.label}
                </Text>
                <Text
                  className={cn(
                    "text-[11px] font-semibold",
                    c.pending ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {c.value}
                </Text>
              </View>
            ))}
          </View>

          {openSum > 0 ? (
            <View className="gap-1.5">
              <Text className="text-[10px] text-muted-foreground">
                未完成分布
              </Text>
              <View className="flex-row h-2 rounded-full overflow-hidden bg-muted">
                {openParts.map((p) =>
                  p.n > 0 ? (
                    <View
                      key={p.key}
                      style={{ flex: p.n, backgroundColor: p.color }}
                    />
                  ) : null,
                )}
              </View>
            </View>
          ) : null}

          {period !== "day" && spark ? (
            <View className="gap-1.5">
              <Text className="text-[10px] text-muted-foreground">
                近 7 日完成
              </Text>
              <View className="flex-row items-end gap-1 h-9">
                {spark.map((n, i) => (
                  <View
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: Math.max(3, (n / sparkMax) * 36),
                      backgroundColor:
                        i === spark.length - 1
                          ? t.brand
                          : colorScheme === "dark"
                            ? "rgba(59,111,255,0.35)"
                            : "rgba(59,111,255,0.28)",
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {metrics.partialNote ? (
            <Text className="text-[10px] text-muted-foreground/80">
              {metrics.partialNote}
            </Text>
          ) : null}
        </Animated.View>
      </ElevatedSurface>
    </View>
  );
}
