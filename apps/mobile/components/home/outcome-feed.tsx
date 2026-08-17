/**
 * Home work outcomes — past 24h employee deliverables (PRD §4.4).
 */
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { ElevatedSurface } from "@/components/ui/elevated-surface";
import {
  outcomeListOptions,
  USE_MOCK_OUTCOMES,
} from "@/data/queries/outcomes";
import type { WorkOutcome } from "@/data/mocks/outcomes";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

function slotLabel(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const d = new Date(t);
  const hoursAgo = (now - t) / 3600_000;
  if (hoursAgo < 0.75) return "刚才";
  const h = d.getHours();
  if (h >= 5 && h < 11) return "今早";
  if (h >= 11 && h < 18) return "午后";
  if (h >= 18 || h < 5) return "昨夜";
  return "今日";
}

function clockLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function openOutcome(wsSlug: string | null, o: WorkOutcome) {
  if (!wsSlug) return;
  if (o.issue_id) {
    router.push({
      pathname: "/[workspace]/issue/[id]",
      params: { workspace: wsSlug, id: o.issue_id },
    });
    return;
  }
  if (o.brief_id) {
    router.push({
      pathname: "/[workspace]/brief/[id]",
      params: { workspace: wsSlug, id: o.brief_id },
    });
    return;
  }
  router.push({
    pathname: "/[workspace]/board",
    params: { workspace: wsSlug },
  });
}

export function OutcomeFeed() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: outcomes = [] } = useQuery(outcomeListOptions(wsId));
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const rows = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return outcomes
      .filter((o) => Date.parse(o.produced_at) >= cutoff)
      .sort(
        (a, b) =>
          Date.parse(b.produced_at) - Date.parse(a.produced_at),
      )
      .slice(0, 3);
  }, [outcomes]);

  return (
    <View className="px-4 gap-2">
      <View className="flex-row items-center justify-between px-1 gap-2">
        <View className="flex-row items-center gap-2 flex-1 min-w-0 flex-wrap">
          <Text className="text-[12px] font-medium text-muted-foreground">
            工作成果
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            过去 24 小时 · {rows.length} 份
          </Text>
          {USE_MOCK_OUTCOMES ? (
            <View className="rounded border border-border px-1.5 py-0.5">
              <Text className="text-[10px] text-muted-foreground">示例</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            if (!wsSlug) return;
            router.push({
              pathname: "/[workspace]/reports",
              params: { workspace: wsSlug },
            });
          }}
          hitSlop={8}
        >
          <Text className="text-[11px] font-medium text-brand">完整报告 ›</Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <ElevatedSurface className="border-0 px-4 py-8 items-center gap-1.5">
          <Text className="text-sm font-semibold text-foreground">
            过去 24 小时暂无产出
          </Text>
          <Text className="text-[12px] text-muted-foreground text-center">
            派单或开启定时任务后会出现在这里
          </Text>
        </ElevatedSurface>
      ) : (
        <View className="gap-2">
          {rows.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => openOutcome(wsSlug, o)}
            >
              <ElevatedSurface className="border-0 px-3.5 py-3">
                <View className="flex-row items-center gap-2.5">
                  <View
                    className="size-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: o.agent_color }}
                  >
                    <Text className="text-[13px] font-bold text-white">
                      {o.agent_initial}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[13px] font-bold text-foreground">
                      {o.agent_name}
                    </Text>
                    <Text
                      className="text-[11px] text-muted-foreground mt-0.5"
                      numberOfLines={1}
                    >
                      {o.agent_title}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted-foreground">
                    {clockLabel(o.produced_at)}
                  </Text>
                </View>
                <View className="mt-2 pl-[46px]">
                  <View className="flex-row items-center gap-1.5">
                    <View className="rounded-full bg-brand/10 px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-brand">
                        {o.type}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-muted-foreground">
                      {slotLabel(o.produced_at)}
                    </Text>
                  </View>
                  <Text
                    className="text-[13px] text-foreground mt-1.5 leading-[1.45]"
                    numberOfLines={2}
                    style={{ color: t.foreground }}
                  >
                    {o.summary}
                  </Text>
                </View>
              </ElevatedSurface>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
