/**
 * 数字员工在岗与在手。Tokens / 时长不当前主指标。
 */
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { AgentPresenceDetail } from "@multica/core/agents";
import { Text } from "@/components/ui/text";
import { HomeSection } from "@/components/home/home-section";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { ColorStat } from "@/components/board/color-stat";
import { agentListOptions } from "@/data/queries/agents";
import { agentTaskSnapshotOptions } from "@/data/queries/agent-task-snapshot";
import { useWorkspacePresenceMap } from "@/lib/use-agent-presence";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ACTIVE = new Set([
  "queued",
  "dispatched",
  "waiting_local_directory",
  "running",
]);

function isOnline(p: AgentPresenceDetail): boolean {
  return (
    p.availability === "online" ||
    p.workload === "working" ||
    p.workload === "queued"
  );
}

function workloadLabel(p: AgentPresenceDetail): {
  label: string;
  color: string;
  bg: string;
} {
  if (p.workload === "working") {
    return { label: "工作中", color: "#3B6FFF", bg: "rgba(59,111,255,0.12)" };
  }
  if (p.workload === "queued") {
    return { label: "排队中", color: "#D97706", bg: "rgba(217,119,6,0.12)" };
  }
  if (p.availability === "online") {
    return { label: "在岗", color: "#16A34A", bg: "rgba(22,163,74,0.12)" };
  }
  return { label: "离线", color: "#64748B", bg: "rgba(100,116,139,0.12)" };
}

export function AgentUsage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const hairline = colorScheme === "dark" ? t.border : "#ECEEF3";
  const { data: agents = [], isPending: agentsPending } = useQuery(
    agentListOptions(wsId),
  );
  const { byAgent, loading: presenceLoading } = useWorkspacePresenceMap(wsId);
  const {
    data: snapshot,
    isError: snapshotErr,
    isFetched: snapshotFetched,
  } = useQuery(agentTaskSnapshotOptions(wsId));

  const visible = useMemo(
    () => agents.filter((a) => !a.archived_at),
    [agents],
  );

  const hands = useMemo(() => {
    if (snapshotErr || !snapshotFetched) return null;
    const m = new Map<string, number>();
    for (const task of snapshot ?? []) {
      if (!ACTIVE.has(task.status)) continue;
      m.set(task.agent_id, (m.get(task.agent_id) ?? 0) + 1);
    }
    return m;
  }, [snapshot, snapshotErr, snapshotFetched]);

  const summary = useMemo(() => {
    let online = 0;
    let working = 0;
    for (const a of visible) {
      const p = byAgent.get(a.id);
      if (!p) continue;
      if (isOnline(p)) online += 1;
      if (p.workload === "working" || p.workload === "queued") working += 1;
    }
    let inHand = 0;
    if (hands) {
      for (const n of hands.values()) inHand += n;
    }
    return { online, working, inHand };
  }, [visible, byAgent, hands]);

  const rows = useMemo(() => {
    return visible
      .map((a) => {
        const p = byAgent.get(a.id);
        const inHand = hands?.get(a.id) ?? 0;
        return { agent: a, presence: p, inHand };
      })
      .sort((a, b) => {
        const wa = a.presence?.workload === "working" ? 0 : a.inHand > 0 ? 1 : 2;
        const wb = b.presence?.workload === "working" ? 0 : b.inHand > 0 ? 1 : 2;
        if (wa !== wb) return wa - wb;
        return b.inHand - a.inHand;
      })
      .slice(0, 6);
  }, [visible, byAgent, hands]);

  const loading = agentsPending || presenceLoading;

  return (
    <HomeSection title="数字员工" flush>
      {loading ? (
        <View className="px-4 py-3">
          <Skeleton className="h-16 w-full" />
        </View>
      ) : visible.length === 0 ? (
        <View className="px-4 py-3">
          <Text className="text-[13px] text-muted-foreground">
            还没有数字员工。请先在 Web 端创建。
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-center px-2 py-3">
            <ColorStat
              label="在岗"
              value={summary.online}
              color="#16A34A"
            />
            <View className="w-px self-stretch" style={{ backgroundColor: hairline }} />
            <ColorStat
              label="工作中"
              value={summary.working}
              color={t.brand}
            />
            <View className="w-px self-stretch" style={{ backgroundColor: hairline }} />
            <ColorStat
              label="在手"
              value={hands == null ? "—" : summary.inHand}
              color="#D97706"
            />
          </View>

          <View className="border-t border-border px-4">
            {rows.map((row, idx) => {
              const badge = row.presence
                ? workloadLabel(row.presence)
                : {
                    label: "—",
                    color: t.mutedForeground,
                    bg: t.secondary,
                  };
              return (
                <Pressable
                  key={row.agent.id}
                  onPress={() => {
                    if (wsSlug) router.push(`/${wsSlug}/staff/${row.agent.id}`);
                  }}
                  accessibilityLabel={`${row.agent.name}，${badge.label}`}
                  className={cn(
                    "flex-row items-center gap-3 py-3 active:opacity-80",
                    idx > 0 && "border-t border-border/70",
                  )}
                >
                  <ActorAvatar
                    type="agent"
                    id={row.agent.id}
                    size={32}
                    showPresence
                  />
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-[14px] font-semibold text-foreground"
                      numberOfLines={1}
                    >
                      {row.agent.name}
                    </Text>
                  </View>
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: badge.bg }}
                  >
                    <Text
                      className="text-[11px] font-semibold"
                      style={{ color: badge.color }}
                    >
                      {badge.label}
                    </Text>
                  </View>
                  <Text
                    className="text-[13px] font-semibold text-foreground"
                    style={{ minWidth: 20, textAlign: "right" }}
                  >
                    {hands == null ? "—" : `${row.inHand}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </HomeSection>
  );
}
