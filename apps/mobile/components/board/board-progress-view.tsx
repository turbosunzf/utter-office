/**
 * Progress view (看板视图 C) — workspace-level dashboard.
 * Plain-language overview for non-technical users; numbers never flash blank.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionGroup } from "@/components/ui/section-group";
import { TaskProgress } from "@/components/board/task-progress";
import { AgentUsage } from "@/components/board/agent-usage";
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
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const RANGES = [7, 30, 90] as const;
const RANGE_LABELS = ["近 7 天", "近 30 天", "近 90 天"];

function MetricValue({
  loading,
  children,
  large,
}: {
  loading: boolean;
  children: string;
  large?: boolean;
}) {
  if (loading) {
    return (
      <Skeleton className={large ? "h-10 w-28 mt-1" : "h-6 w-14 mb-1"} />
    );
  }
  return (
    <Text
      className={
        large
          ? "text-[34px] font-extrabold text-foreground"
          : "text-[16px] font-extrabold text-foreground"
      }
      style={{ letterSpacing: large ? -0.8 : -0.2 }}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

export function BoardProgressView() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const queryClient = useQueryClient();
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const tz = localTimezone();
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const well = colorScheme === "dark" ? t.secondary : "#F5F7FC";
  const accentWell = colorScheme === "dark" ? "rgba(59,111,255,0.22)" : "#EEF3FF";

  const {
    data: runTimeDaily = [],
    isLoading: runTimeLoading,
    error: runTimeError,
    isFetched: runTimeFetched,
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
        u.input_tokens +
        u.output_tokens +
        u.cache_read_tokens +
        u.cache_write_tokens;
    }
    let failures = 0;
    for (const f of failuresDaily) {
      if (f.failure_reason !== "") failures += f.task_count;
    }
    return { tasks, seconds, tokens, failures };
  }, [runTimeDaily, usageDaily, failuresDaily]);

  const loading = runTimeLoading || usageLoading || failuresLoading;
  const dashboardError = runTimeError ?? usageError ?? failuresError;
  const unavailable =
    runTimeFetched &&
    !!dashboardError &&
    /404|not found|未上线/i.test(
      dashboardError instanceof Error
        ? dashboardError.message
        : String(dashboardError),
    );

  const opacity = useRef(new Animated.Value(1)).current;
  const daysRef = useRef(days);
  useEffect(() => {
    if (daysRef.current === days) return;
    daysRef.current = days;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [days, opacity]);

  const retry = useCallback(() => {
    void queryClient.refetchQueries({ queryKey: dashboardKeys.all(wsId) });
  }, [queryClient, wsId]);

  if (unavailable) {
    return (
      <View className="flex-1 px-4 pt-8 items-center gap-2">
        <Text className="text-base font-medium text-foreground">
          统计功能即将开放
        </Text>
        <Text className="text-sm text-muted-foreground text-center px-4">
          整盘概况依赖服务端统计。开放前可用「列」或「泳道」查看事项进度。
        </Text>
      </View>
    );
  }

  const secondary = [
    {
      label: "运行时长",
      hint: "",
      value: formatElapsedSecs(hero.seconds),
    },
    {
      label: "Tokens",
      hint: "",
      value: formatCompact(hero.tokens),
    },
    {
      label: "失败",
      hint: "",
      value: String(hero.failures),
    },
  ];

  return (
    <ScrollView
      contentContainerClassName="px-4 py-3 gap-4 pb-8"
      showsVerticalScrollIndicator={false}
    >
      <SectionGroup title="整盘概况">
        <View className="px-3 pt-3 pb-1">
          <SegmentedControl
            values={RANGE_LABELS}
            selectedIndex={Math.max(0, RANGES.indexOf(days))}
            onChange={(e) => {
              const i = e.nativeEvent.selectedSegmentIndex;
              setDays(RANGES[i] ?? 7);
            }}
            tintColor={t.brand}
            fontStyle={{ fontSize: 12 }}
            activeFontStyle={{
              fontSize: 12,
              fontWeight: "600",
              color: "#FFFFFF",
            }}
          />
        </View>

        {dashboardError ? (
          <View className="px-4 pb-3 gap-3">
            <Text className="text-sm text-destructive">
              概况加载失败：
              {dashboardError instanceof Error
                ? dashboardError.message
                : "未知错误"}
            </Text>
            <Button variant="outline" onPress={retry}>
              <Text>重试</Text>
            </Button>
          </View>
        ) : (
          <Animated.View style={{ opacity }} className="px-3 pb-4 gap-3">
            <View
              className="flex-row items-end justify-between rounded-xl px-3.5 py-3"
              style={{ backgroundColor: accentWell }}
            >
              <View>
                <MetricValue loading={loading} large>
                  {String(hero.tasks)}
                </MetricValue>
                <Text className="text-[11px] font-semibold text-muted-foreground mt-1">
                  完成任务
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              {secondary.map((m) => (
                <View
                  key={m.label}
                  className="flex-1 rounded-xl py-2.5 px-2"
                  style={{ backgroundColor: well }}
                >
                  <MetricValue loading={loading}>{m.value}</MetricValue>
                  <Text
                    className="text-[10px] font-semibold text-muted-foreground mt-0.5"
                    numberOfLines={1}
                  >
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </SectionGroup>

      <TaskProgress days={days} tz={tz} />
      <AgentUsage days={days} tz={tz} />
    </ScrollView>
  );
}
