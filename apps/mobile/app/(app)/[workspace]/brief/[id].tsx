/**
 * Brief detail — 任务小队（样式细化 + 独立换人页）.
 */
import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import { Markdown } from "@/lib/markdown/markdown";
import { FadeSlideSheet } from "@/components/shared/fade-slide-sheet";
import { briefDetailOptions } from "@/data/queries/briefs";
import { useWorkspaceStore } from "@/data/workspace-store";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "—";
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "刚刚";
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

type StaffId = "kimi" | "codex" | "mika";

const STAFF: Record<
  StaffId,
  {
    id: StaffId;
    initial: string;
    color: string;
    name: string;
    title: string;
  }
> = {
  kimi: {
    id: "kimi",
    initial: "k",
    color: "#A78BFA",
    name: "kimi",
    title: "行业情报分析师",
  },
  codex: {
    id: "codex",
    initial: "c",
    color: "#60A5FA",
    name: "codex",
    title: "代码交付工程师",
  },
  mika: {
    id: "mika",
    initial: "m",
    color: "#F87171",
    name: "mika",
    title: "需求派单助理",
  },
};

const JOB: Record<string, string> = {
  intel: "提炼本条与仓库相关要点",
  eng: "对照鉴权/支付，标风险改动面",
  dispatch: "汇总结论并拆待办回报",
};

type Seat = {
  key: string;
  role: string;
  on: boolean;
  agentId: StaffId;
};

const INITIAL_SEATS: Seat[] = [
  { key: "intel", role: "情报", on: true, agentId: "kimi" },
  { key: "eng", role: "评估", on: true, agentId: "codex" },
  { key: "dispatch", role: "落地", on: true, agentId: "mika" },
];

export default function BriefDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: brief, isPending, isError } = useQuery(
    briefDetailOptions(wsId, id ?? ""),
  );
  const [seats, setSeats] = useState<Seat[]>(INITIAL_SEATS);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [pickKey, setPickKey] = useState<string | null>(null);

  const active = useMemo(() => seats.filter((s) => s.on), [seats]);
  const picking = seats.find((s) => s.key === pickKey) ?? null;

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">加载中…</Text>
      </View>
    );
  }

  if (isError || !brief) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-muted-foreground">找不到该简报</Text>
      </View>
    );
  }

  const openPick = (key: string, fromCfg = false) => {
    const seat = seats.find((s) => s.key === key);
    if (!seat?.on) return;
    if (fromCfg) setCfgOpen(true);
    else setCfgOpen(false);
    setPickKey(key);
  };

  const launch = () => {
    if (!wsSlug || active.length === 0) return;
    const roster = active
      .map(
        (s, i) =>
          `${i + 1}. ${s.role} · ${STAFF[s.agentId].name} — ${JOB[s.key] ?? ""}`,
      )
      .join("\n");
    router.push({
      pathname: "/[workspace]/new-issue",
      params: {
        workspace: wsSlug,
        title: `深入分析：${brief.title}`,
        description: [
          "【任务目标】评估对本仓库的影响，产出可执行待办",
          "",
          brief.summary,
          brief.source_url ?? "",
          "",
          "【小队编组】",
          roster,
          "",
          "> 来自行业简报 · 任务小队",
        ].join("\n"),
      },
    });
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 py-4 pb-16 gap-3"
      >
        <View className="flex-row items-center gap-2">
          <View className="rounded-md bg-brand/15 px-2 py-0.5">
            <Text className="text-[11px] text-brand">{brief.category}</Text>
          </View>
          <Pressable
            onPress={() =>
              void Share.share({
                message: `${brief.title}\n${brief.source_url ?? ""}`,
              })
            }
            className="ml-auto"
          >
            <Text className="text-sm text-brand">分享</Text>
          </Pressable>
        </View>

        <Text className="text-xl font-bold text-foreground leading-[1.35]">
          {brief.title}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {brief.source} · {relativeTime(brief.published_at)}
        </Text>

        <Markdown content={brief.body_md} />

        {brief.source_url ? (
          <Pressable onPress={() => void Linking.openURL(brief.source_url!)}>
            <Text className="text-[13px] text-brand">来源链接 ↗</Text>
          </Pressable>
        ) : null}

        <View className="rounded-2xl border border-border bg-card overflow-hidden mt-2">
          <View className="px-3.5 pt-3.5 pb-2.5 bg-brand/10">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-1.5">
                  <View className="size-1.5 rounded-full bg-brand" />
                  <Text className="text-[11px] font-bold text-brand">
                    任务小队
                  </Text>
                </View>
                <Text className="text-[16px] font-bold text-foreground mt-1.5 leading-[1.35]">
                  评估对本仓库的影响，产出可执行待办
                </Text>
              </View>
              <Pressable
                onPress={() => setCfgOpen(true)}
                className="h-7 px-2.5 rounded-lg bg-brand/15 items-center justify-center"
              >
                <Text className="text-xs font-semibold text-brand">调整</Text>
              </Pressable>
            </View>
          </View>

          <View className="px-3.5 pb-3.5 pt-1">
            {active.length === 0 ? (
              <Text className="text-xs text-muted-foreground py-4">
                尚未选人 · 点右上角调整
              </Text>
            ) : (
              <View className="mt-1 mb-1">
                <View className="relative pt-1 pb-1">
                  {active.length > 1 ? (
                    <View
                      pointerEvents="none"
                      className="absolute h-px bg-brand/20"
                      style={{ left: 36, right: 36, top: 28 }}
                    />
                  ) : null}
                  <View className="flex-row justify-between">
                    {active.map((s, i) => {
                      const a = STAFF[s.agentId];
                      return (
                        <Pressable
                          key={s.key}
                          onPress={() => openPick(s.key, false)}
                          className="items-center flex-1"
                        >
                          <View className="items-center" style={{ width: 72 }}>
                            <LinearGradient
                              colors={[
                                "rgba(59,111,255,0.45)",
                                "rgba(59,111,255,0.08)",
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                padding: 3,
                              }}
                            >
                              <View
                                className="flex-1 rounded-full items-center justify-center border-2 border-card"
                                style={{ backgroundColor: a.color }}
                              >
                                <Text className="text-[17px] font-bold text-white">
                                  {a.initial}
                                </Text>
                              </View>
                            </LinearGradient>
                            <View className="mt-[-8px] rounded-full bg-brand px-2 py-0.5 z-10">
                              <Text className="text-[10px] font-bold text-white">
                                {i + 1} · {s.role}
                              </Text>
                            </View>
                            <Text
                              className="text-[12px] font-bold text-foreground mt-1.5"
                              numberOfLines={1}
                            >
                              {a.name}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            <View className="flex-row items-center mt-2">
              <Text className="text-xs text-muted-foreground">
                <Text className="font-semibold text-foreground">
                  {active.length} 人
                </Text>
                {" · 流水线"}
              </Text>
              <View className="flex-row items-center gap-1 ml-auto">
                {["理解", "对照", "落地"].map((label, i) => (
                  <View key={label} className="flex-row items-center gap-1">
                    {i > 0 ? (
                      <Text className="text-[10px] text-muted-foreground/40">
                        →
                      </Text>
                    ) : null}
                    <View className="rounded-md bg-brand/10 px-1.5 py-0.5">
                      <Text className="text-[10px] font-semibold text-brand">
                        {label}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              onPress={launch}
              disabled={active.length === 0}
              className={cn(
                "h-11 mt-3 rounded-[10px] bg-brand items-center justify-center",
                active.length === 0 && "opacity-40",
              )}
            >
              <Text className="text-[15px] font-semibold text-white">
                深入分析探索
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <FadeSlideSheet
        visible={cfgOpen && !pickKey}
        onClose={() => setCfgOpen(false)}
      >
        <Text className="text-[17px] font-bold">调整小队</Text>
        <Text className="text-xs text-muted-foreground mt-1 mb-2">
          点成员换人 · 右侧开关席位
        </Text>
        <ScrollView className="max-h-[48vh]">
          {seats.map((seat) => {
            const a = STAFF[seat.agentId];
            return (
              <View
                key={seat.key}
                className={cn(
                  "flex-row items-center gap-2.5 py-2.5 border-b border-border",
                  !seat.on && "opacity-40",
                )}
              >
                <Pressable
                  disabled={!seat.on}
                  onPress={() => openPick(seat.key, true)}
                  className="flex-1 flex-row items-center gap-2.5 min-w-0"
                >
                  <View
                    className="size-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: a.color }}
                  >
                    <Text className="text-sm font-bold text-white">
                      {a.initial}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[11px] font-bold text-brand">
                      {seat.role}席
                    </Text>
                    <Text className="text-[14px] font-semibold mt-0.5">
                      {a.name}
                    </Text>
                    {seat.on ? (
                      <Text className="text-[11px] text-muted-foreground mt-0.5">
                        点此更换成员
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setSeats((prev) =>
                      prev.map((s) =>
                        s.key === seat.key ? { ...s, on: !s.on } : s,
                      ),
                    )
                  }
                  className={cn(
                    "w-[42px] h-[26px] rounded-full justify-center",
                    seat.on ? "bg-brand" : "bg-border",
                  )}
                >
                  <View
                    className={cn(
                      "size-5 rounded-full bg-white mx-1",
                      seat.on ? "self-end" : "self-start",
                    )}
                  />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => setCfgOpen(false)}
          className="h-11 mt-3 rounded-[10px] bg-brand items-center justify-center"
        >
          <Text className="text-[15px] font-semibold text-white">
            保存小队
          </Text>
        </Pressable>
      </FadeSlideSheet>

      <FadeSlideSheet
        visible={!!picking}
        onClose={() => setPickKey(null)}
      >
        <Text className="text-[17px] font-bold">
          选择 · {picking?.role ?? ""}席
        </Text>
        <Text className="text-xs text-muted-foreground mt-1 mb-2">
          从名册中指定本席成员
        </Text>
        {(Object.keys(STAFF) as StaffId[]).map((sid) => {
          const p = STAFF[sid];
          const on = picking?.agentId === sid;
          return (
            <Pressable
              key={sid}
              onPress={() => {
                if (!picking) return;
                setSeats((prev) =>
                  prev.map((s) =>
                    s.key === picking.key ? { ...s, agentId: sid } : s,
                  ),
                );
                setPickKey(null);
              }}
              className="flex-row items-center gap-3 py-3 border-b border-border"
            >
              <View
                className="size-11 rounded-full items-center justify-center"
                style={{ backgroundColor: p.color }}
              >
                <Text className="text-base font-bold text-white">
                  {p.initial}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[15px] font-semibold">{p.name}</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {p.title}
                </Text>
              </View>
              <View
                className={cn(
                  "size-[22px] rounded-full border items-center justify-center",
                  on
                    ? "bg-brand border-brand"
                    : "border-border bg-transparent",
                )}
              >
                {on ? (
                  <Text className="text-[11px] font-bold text-white">✓</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setPickKey(null)}
          className="h-11 mt-3 rounded-[10px] bg-secondary items-center justify-center"
        >
          <Text className="text-[15px] font-semibold text-foreground">
            返回
          </Text>
        </Pressable>
      </FadeSlideSheet>
    </>
  );
}
