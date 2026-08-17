/**
 * Staff roster — filter chips + clean cards (PRD §7.5).
 */
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Agent, Squad } from "@multica/core/types";
import type { AgentPresenceDetail } from "@multica/core/agents";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { Icon } from "@/components/ui/icon";
import { agentListOptions } from "@/data/queries/agents";
import { squadListOptions } from "@/data/queries/squads";
import { agentTaskSnapshotOptions } from "@/data/queries/agent-task-snapshot";
import { runtimeListOptions } from "@/data/queries/runtimes";
import { useWorkspacePresenceMap } from "@/lib/use-agent-presence";
import { useWorkspaceStore } from "@/data/workspace-store";
import { isAgentRuntimeBound } from "@/lib/is-agent-runtime-bound";
import {
  resolveToolCount,
  skillCountLabel,
} from "@/lib/agent-tool-counts";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ACTIVE = new Set([
  "queued",
  "dispatched",
  "waiting_local_directory",
  "running",
]);

const MISSING_PRESENCE: AgentPresenceDetail = {
  availability: "offline",
  workload: "idle",
  runningCount: 0,
  queuedCount: 0,
  capacity: 0,
};

type FilterKey = "all" | "online" | "offline" | "unbound" | "squad";

function statusBadge(presence: AgentPresenceDetail): {
  label: string;
  className: string;
} {
  if (presence.workload === "working" || presence.workload === "queued") {
    return {
      label: presence.workload === "working" ? "工作中" : "排队中",
      className: "bg-brand/15 text-brand",
    };
  }
  if (presence.availability === "online") {
    return { label: "在岗", className: "bg-success/15 text-success" };
  }
  return {
    label: "离线",
    className: "bg-secondary text-muted-foreground",
  };
}

function isOnline(presence: AgentPresenceDetail): boolean {
  return (
    presence.availability === "online" ||
    presence.workload === "working" ||
    presence.workload === "queued"
  );
}

function StaffCard({
  agent,
  presence,
  activeCount,
  runtimeLabel,
  onPress,
}: {
  agent: Agent;
  presence: AgentPresenceDetail;
  activeCount: number | null;
  runtimeLabel: string;
  onPress: () => void;
}) {
  const badge = statusBadge(presence);
  const tools = resolveToolCount(agent);
  const skills = skillCountLabel(agent);
  const activeLabel = activeCount == null ? "暂无" : String(activeCount);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-border bg-card p-3 mb-2.5 active:bg-secondary"
    >
      <View className="flex-row items-start gap-2.5">
        <ActorAvatar type="agent" id={agent.id} size={44} showPresence />
        <View className="flex-1 min-w-0">
          <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>
            {agent.name}
          </Text>
          <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
            {agent.model ? `模型 ${agent.model}` : "未设置岗位"}
          </Text>
        </View>
        <View className={cn("rounded-md px-1.5 py-0.5", badge.className)}>
          <Text className={cn("text-[10px]", badge.className.split(" ")[1])}>
            {badge.label}
          </Text>
        </View>
      </View>
      {agent.description ? (
        <Text
          className="text-xs text-foreground mt-2 leading-[1.45]"
          numberOfLines={2}
        >
          {agent.description}
        </Text>
      ) : null}
      <Text
        className={cn(
          "text-[11px] mt-1.5 pt-1.5 border-t border-border",
          runtimeLabel.includes("未绑定")
            ? "text-warning"
            : "text-muted-foreground",
        )}
      >
        {runtimeLabel}
      </Text>
      <View className="flex-row pt-2 border-t border-border mt-1">
        <View className="flex-1 items-center">
          <Text className="text-[17px] font-semibold text-foreground">{skills}</Text>
          <Text className="text-[10px] text-muted-foreground">技能</Text>
        </View>
        <View className="flex-1 items-center">
          <Text
            className={cn(
              "font-semibold text-foreground",
              tools.kind === "count" ? "text-[17px]" : "text-[13px] pt-1",
            )}
          >
            {tools.label}
          </Text>
          <Text className="text-[10px] text-muted-foreground">工具</Text>
        </View>
        <View className="flex-1 items-center">
          <Text
            className={cn(
              "font-semibold",
              activeCount == null
                ? "text-[13px] text-muted-foreground pt-1"
                : "text-[17px] text-foreground",
            )}
          >
            {activeLabel}
          </Text>
          <Text className="text-[10px] text-muted-foreground">在手</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function StaffRosterPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data: agents = [], isPending: agentsPending } = useQuery(
    agentListOptions(wsId),
  );
  const { byAgent, loading: presenceLoading } = useWorkspacePresenceMap(wsId);
  const {
    data: snapshot,
    isError: snapshotErr,
    isFetched: snapshotFetched,
  } = useQuery(agentTaskSnapshotOptions(wsId));
  const { data: runtimes = [] } = useQuery(runtimeListOptions(wsId));
  const { data: squads = [] } = useQuery(squadListOptions(wsId));

  const visible = useMemo(
    () => agents.filter((a) => !a.archived_at),
    [agents],
  );

  const activeByAgent = useMemo(() => {
    if (snapshotErr || !snapshotFetched) return null;
    const m = new Map<string, number>();
    for (const task of snapshot ?? []) {
      if (!ACTIVE.has(task.status)) continue;
      m.set(task.agent_id, (m.get(task.agent_id) ?? 0) + 1);
    }
    return m;
  }, [snapshot, snapshotErr, snapshotFetched]);

  const runtimeLabelOf = (agent: Agent) => {
    if (!isAgentRuntimeBound(agent)) return "工位 未绑定 ⚠";
    const rt = runtimes.find((r) => r.id === agent.runtime_id);
    const provider = rt?.provider || "未知";
    const mode =
      agent.runtime_mode === "cloud"
        ? "云端"
        : agent.runtime_mode === "local"
          ? "本地"
          : agent.runtime_mode;
    return `工位 ${provider} · ${mode}`;
  };

  const filteredAgents = useMemo(() => {
    return visible
      .filter((agent) => {
        const p = byAgent.get(agent.id) ?? MISSING_PRESENCE;
        const unbound = !isAgentRuntimeBound(agent);
        if (filter === "online") return isOnline(p);
        if (filter === "offline") return !isOnline(p);
        if (filter === "unbound") return unbound;
        if (filter === "squad") return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "zh"));
  }, [visible, byAgent, filter]);

  type Row =
    | { type: "agent"; agent: Agent }
    | { type: "squads"; squads: Squad[] }
    | { type: "note" };

  const rows: Row[] = useMemo(() => {
    const next: Row[] = [];
    if (filter === "squad") {
      if (squads.length > 0) {
        next.push({ type: "squads", squads });
      } else {
        next.push({ type: "note" });
      }
      return next;
    }
    for (const agent of filteredAgents) {
      next.push({ type: "agent", agent });
    }
    if (next.length === 0) next.push({ type: "note" });
    return next;
  }, [filteredAgents, filter, squads]);

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "全部", count: visible.length },
    {
      key: "online",
      label: "在岗",
      count: visible.filter((a) =>
        isOnline(byAgent.get(a.id) ?? MISSING_PRESENCE),
      ).length,
    },
    {
      key: "offline",
      label: "离线",
      count: visible.filter(
        (a) => !isOnline(byAgent.get(a.id) ?? MISSING_PRESENCE),
      ).length,
    },
    {
      key: "unbound",
      label: "未绑定",
      count: visible.filter((a) => !isAgentRuntimeBound(a)).length,
    },
    { key: "squad", label: "战队", count: squads.length },
  ];

  if (agentsPending || presenceLoading) {
    return (
      <View className="flex-1 gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </View>
    );
  }

  if (visible.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8 gap-2">
        <Text className="text-base font-medium text-foreground">
          还没有数字员工
        </Text>
        <Text className="text-sm text-muted-foreground text-center">
          请在 Web 端创建，创建后会出现在这里。
        </Text>
      </View>
    );
  }

  const chipWell = colorScheme === "dark" ? t.secondary : "#EEF1F8";

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-3 pb-2">
        <View
          className="flex-row rounded-2xl p-1"
          style={{ backgroundColor: chipWell }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 4 }}
          >
            {filters.map((f) => {
              const on = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className="flex-row items-center gap-1.5 rounded-xl px-3 py-2"
                  style={{
                    backgroundColor: on
                      ? colorScheme === "dark"
                        ? t.card
                        : "#FFFFFF"
                      : "transparent",
                    shadowColor: on ? "#0F172A" : "transparent",
                    shadowOpacity: on ? 0.06 : 0,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: on ? 1 : 0,
                  }}
                >
                  <Text
                    className={cn(
                      "text-[12px] font-semibold",
                      on ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {f.label}
                  </Text>
                  <View
                    className="min-w-[18px] items-center rounded-full px-1.5 py-0.5"
                    style={{
                      backgroundColor: on
                        ? "rgba(59,111,255,0.12)"
                        : colorScheme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <Text
                      className={cn(
                        "text-[10px] font-semibold",
                        on ? "text-brand" : "text-muted-foreground",
                      )}
                    >
                      {f.count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-10"
        data={rows}
        keyExtractor={(item, i) => {
          if (item.type === "agent") return item.agent.id;
          if (item.type === "squads") return "squads";
          return `note-${i}`;
        }}
        renderItem={({ item }) => {
          if (item.type === "note") {
            return (
              <View className="items-center py-10 gap-2">
                <Icon name="Users" size={28} color={t.mutedForeground} />
                <Text className="text-sm text-muted-foreground">
                  {filter === "squad" ? "暂无战队" : "此分类下暂无员工"}
                </Text>
              </View>
            );
          }
          if (item.type === "squads") {
            return (
              <View className="gap-2 mb-2">
                {item.squads.map((squad: Squad) => {
                  const memberCount =
                    squad.member_count ?? squad.member_preview?.length ?? 0;
                  return (
                    <View
                      key={squad.id}
                      className="flex-row items-center gap-2 rounded-xl border border-border bg-card p-3"
                    >
                      <View
                        className="size-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "rgba(59,111,255,0.12)" }}
                      >
                        <Icon name="Users" size={16} color={t.brand} />
                      </View>
                      <Text className="flex-1 text-[13px] text-foreground">
                        {squad.name} · {memberCount} 名成员
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          }
          const agent = item.agent;
          const presence = byAgent.get(agent.id) ?? MISSING_PRESENCE;
          const activeCount =
            activeByAgent == null
              ? null
              : (activeByAgent.get(agent.id) ?? 0);
          return (
            <StaffCard
              agent={agent}
              presence={presence}
              activeCount={activeCount}
              runtimeLabel={runtimeLabelOf(agent)}
              onPress={() => {
                if (wsSlug) router.push(`/${wsSlug}/staff/${agent.id}`);
              }}
            />
          );
        }}
      />
    </View>
  );
}
