/**
 * Agents roster — replaces the "Agents coming soon." placeholder.
 *
 * Reads agents + the workspace presence map (one subscription for the whole
 * list) + the task snapshot (for the per-agent active-issue count) + squads
 * (a compact "Squads" section below the roster). Read-only in v1 — no
 * trigger / assign / manage actions.
 *
 * Archived agents (`archived_at` set) are excluded from the roster — web
 * keeps retired agents on a separate archived view (documented divergence).
 *
 * Error tolerance mirrors `useWorkspacePresenceMap`: a 404/5xx on the
 * snapshot endpoint degrades dots to offline, never a spinner.
 */
import { useMemo } from "react";
import { FlatList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { Squad } from "@multica/core/types";
import type { AgentPresenceDetail } from "@multica/core/agents";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { AgentRow } from "@/components/agents/agent-row";
import { agentListOptions } from "@/data/queries/agents";
import { squadListOptions } from "@/data/queries/squads";
import { agentTaskSnapshotOptions } from "@/data/queries/agent-task-snapshot";
import { useWorkspacePresenceMap } from "@/lib/use-agent-presence";
import { useWorkspaceStore } from "@/data/workspace-store";

const ACTIVE_TASK_STATUSES = new Set<string>([
  "queued",
  "dispatched",
  "waiting_local_directory",
  "running",
]);

// Same fallback semantics as lib/use-agent-presence.ts MISSING_AGENT_DETAIL:
// an agent we can't resolve renders "offline + idle" rather than nothing.
const MISSING_PRESENCE: AgentPresenceDetail = {
  availability: "offline",
  workload: "idle",
  runningCount: 0,
  queuedCount: 0,
  capacity: 0,
};

export default function AgentsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: agents = [], isPending: agentsPending } = useQuery(
    agentListOptions(wsId),
  );
  const { byAgent, loading: presenceLoading } = useWorkspacePresenceMap(wsId);
  const { data: snapshot = [] } = useQuery(agentTaskSnapshotOptions(wsId));
  const { data: squads = [] } = useQuery(squadListOptions(wsId));

  const visible = useMemo(
    () => agents.filter((a) => !a.archived_at),
    [agents],
  );

  // Per-agent count of DISTINCT non-empty issue_ids among active-status
  // snapshot tasks. Mobile-derived (the web `WorkspaceWorkingAgent.issue_ids`
  // applies type/scope/relation filters mobile doesn't carry) — the one
  // cross-check to do against packages/core/agents when the views source is
  // available.
  const activeIssuesByAgent = useMemo(() => {
    const sets = new Map<string, Set<string>>();
    for (const t of snapshot) {
      if (!ACTIVE_TASK_STATUSES.has(t.status)) continue;
      if (!t.issue_id) continue;
      let set = sets.get(t.agent_id);
      if (!set) {
        set = new Set<string>();
        sets.set(t.agent_id, set);
      }
      set.add(t.issue_id);
    }
    const counts = new Map<string, number>();
    for (const [agentId, set] of sets) counts.set(agentId, set.size);
    return counts;
  }, [snapshot]);

  if (agentsPending || presenceLoading) {
    return (
      <View className="flex-1 gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </View>
    );
  }

  if (visible.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-sm text-muted-foreground">
          No agents yet. Create one on web and it will show up here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1"
      contentContainerClassName="px-4 py-3"
      data={visible}
      keyExtractor={(agent) => agent.id}
      renderItem={({ item }) => (
        <AgentRow
          agent={item}
          presence={byAgent.get(item.id) ?? MISSING_PRESENCE}
          activeIssueCount={activeIssuesByAgent.get(item.id) ?? 0}
        />
      )}
      ItemSeparatorComponent={() => <View className="h-px bg-border/60" />}
      ListFooterComponent={
        squads.length > 0 ? <SquadsSection squads={squads} /> : null
      }
    />
  );
}

/** Compact "Squads" section below the agent roster. Hidden when empty. */
function SquadsSection({ squads }: { squads: Squad[] }) {
  return (
    <View className="mt-4 gap-1">
      <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Squads
      </Text>
      {squads.map((squad) => {
        const memberCount =
          squad.member_count ?? squad.member_preview?.length ?? 0;
        return (
          <View key={squad.id} className="flex-row items-center gap-3 py-2">
            <ActorAvatar type="squad" id={squad.id} size={32} />
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-medium text-foreground">
                {squad.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {memberCount} members
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
