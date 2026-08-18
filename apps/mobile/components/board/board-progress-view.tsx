/**
 * 整盘 — 工作区事项 + 数字员工。
 * 完成数来自事项当前态 / 近 N 天更新为 done 的条目；不把 Tokens、运行时长当主角。
 * dashboard 404 不再整页空白。
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { HomeSection } from "@/components/home/home-section";
import { Skeleton } from "@/components/ui/skeleton";
import { ColorStat } from "@/components/board/color-stat";
import { TaskProgress } from "@/components/board/task-progress";
import { AgentUsage } from "@/components/board/agent-usage";
import { issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const RANGES = [7, 30, 90] as const;
const RANGE_LABELS = ["7天", "30天", "90天"] as const;

export function BoardProgressView() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const well = colorScheme === "dark" ? t.secondary : "#EEF1F8";
  const { data: issues = [], isPending } = useQuery(issueListOptions(wsId));

  const hero = useMemo(() => {
    const cutoff = Date.now() - days * 86_400_000;
    let open = 0;
    let done = 0;
    let doneInWindow = 0;
    const buckets = Array.from({ length: 7 }, () => 0);
    const bucketN = buckets.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const i of issues) {
      if (i.status === "cancelled") continue;
      if (i.status === "done") {
        done += 1;
        const ts = Date.parse(i.updated_at);
        if (!Number.isNaN(ts) && ts >= cutoff) doneInWindow += 1;
        if (!Number.isNaN(ts)) {
          const day = new Date(ts);
          day.setHours(0, 0, 0, 0);
          const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
          if (diff >= 0 && diff < bucketN) buckets[bucketN - 1 - diff] += 1;
        }
      } else {
        open += 1;
      }
    }

    const denom = done + open;
    const rate =
      denom >= 5 ? `${Math.round((done / denom) * 100)}%` : null;

    return { open, doneInWindow, rate, buckets };
  }, [issues, days]);

  const maxBucket = Math.max(1, ...hero.buckets);

  return (
    <ScrollView
      contentContainerClassName="px-4 py-3 gap-3 pb-8"
      showsVerticalScrollIndicator={false}
    >
      <HomeSection
        title="概况"
        right={
          <View className="flex-row items-center gap-3">
            {RANGES.map((d, i) => {
              const on = days === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDays(d)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: on ? "800" : "500",
                      color: on ? t.foreground : t.mutedForeground,
                    }}
                  >
                    {RANGE_LABELS[i]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
      >
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <View className="gap-4">
            <View className="flex-row items-center">
              <ColorStat
                label={`${days} 天完成`}
                value={String(hero.doneInWindow)}
                color={t.brand}
              />
              <View
                className="w-px self-stretch"
                style={{ backgroundColor: colorScheme === "dark" ? t.border : "#ECEEF3" }}
              />
              <ColorStat label="未完成" value={String(hero.open)} />
              <View
                className="w-px self-stretch"
                style={{ backgroundColor: colorScheme === "dark" ? t.border : "#ECEEF3" }}
              />
              <ColorStat label="完成率" value={hero.rate ?? "—"} />
            </View>

            <View>
              <View className="flex-row items-end gap-1.5 h-10">
                {hero.buckets.map((n, i) => (
                  <View
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(10, (n / maxBucket) * 100)}%`,
                      backgroundColor: n > 0 ? t.brand : well,
                      opacity: n > 0 ? 0.9 : 1,
                    }}
                  />
                ))}
              </View>
              <Text className="text-[11px] text-muted-foreground mt-2">
                近 7 天每天完成
              </Text>
            </View>
          </View>
        )}
      </HomeSection>

      <TaskProgress />
      <AgentUsage />
    </ScrollView>
  );
}
