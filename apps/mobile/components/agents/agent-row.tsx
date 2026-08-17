/**
 * Single agent row — Chinese presence labels for staff / legacy surfaces.
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
  online: "在岗",
  unstable: "不稳定",
  offline: "离线",
  archived: "已归档",
};

const WORKLOAD_LABEL: Record<AgentPresenceDetail["workload"], string> = {
  working: "工作中",
  queued: "排队中",
  idle: "空闲",
};

export function AgentRow({ agent, presence, activeIssueCount }: Props) {
  const load =
    presence.capacity > 0
      ? `${presence.runningCount}/${presence.capacity}`
      : null;

  const statusLine = [
    AVAILABILITY_LABEL[presence.availability],
    WORKLOAD_LABEL[presence.workload],
    load,
    `${activeIssueCount} 在手`,
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
