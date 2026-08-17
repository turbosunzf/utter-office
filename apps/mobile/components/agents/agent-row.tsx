/**
 * Single agent row in the Agents roster (`more/agents.tsx`). Pure
 * presentation — presence arrives via the single workspace-wide
 * `useWorkspacePresenceMap` (so N rows never mount N copies of
 * `useAgentPresence`), and the active-issue count is derived page-side from
 * the task snapshot.
 *
 * The avatar renders WITHOUT `showPresence`: the presence dot on the avatar
 * would mount `useAgentPresence` per row (three subscriptions + a 30s tick
 * each). The live availability is conveyed instead by the inline
 * `PresenceDot` in the status line, driven by the same derived map.
 */
import { View } from "react-native";
import type { Agent } from "@multica/core/types";
import type { AgentPresenceDetail } from "@multica/core/agents";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { PresenceDot } from "@/components/ui/presence-dot";

interface Props {
  agent: Agent;
  presence: AgentPresenceDetail;
  activeIssueCount: number;
}

const AVAILABILITY_LABEL: Record<AgentPresenceDetail["availability"], string> = {
  online: "Online",
  unstable: "Unstable",
  offline: "Offline",
  archived: "Archived",
};

const WORKLOAD_LABEL: Record<AgentPresenceDetail["workload"], string> = {
  working: "Working",
  queued: "Queued",
  idle: "Idle",
};

export function AgentRow({ agent, presence, activeIssueCount }: Props) {
  // Load ratio only when the agent has a runtime (capacity > 0); a runtime
  // missing agent is already read as "Offline" — "0/0" would be noise.
  const load =
    presence.capacity > 0
      ? `${presence.runningCount}/${presence.capacity}`
      : null;

  const statusLine = [
    AVAILABILITY_LABEL[presence.availability],
    WORKLOAD_LABEL[presence.workload],
    load,
    `${activeIssueCount} active`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-row items-start gap-3 py-2">
      <ActorAvatar type="agent" id={agent.id} size={32} />
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium text-foreground">
          {agent.name}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <PresenceDot availability={presence.availability} size={8} />
          <Text className="text-xs text-muted-foreground">{statusLine}</Text>
        </View>
        {agent.description ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {agent.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
