/**
 * Staff rail — horizontal agent switcher for workbench (PRD §7.3).
 */
import { useMemo } from "react";
import {
  ActionSheetIOS,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Agent } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { agentListOptions } from "@/data/queries/agents";
import { chatSessionsOptions } from "@/data/queries/chat";
import { agentTaskSnapshotOptions } from "@/data/queries/agent-task-snapshot";
import { memberListOptions } from "@/data/queries/members";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { canAssignAgent } from "@/lib/can-assign-agent";
import { cn } from "@/lib/utils";

const ACTIVE = new Set([
  "queued",
  "dispatched",
  "waiting_local_directory",
  "running",
]);

interface Props {
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  onNewSession: (agent: Agent) => void;
}

export function StaffRail({
  selectedAgentId,
  onSelectAgent,
  onNewSession,
}: Props) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const userId = useAuthStore((s) => s.user?.id);
  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const { data: sessions = [] } = useQuery(chatSessionsOptions(wsId));
  const { data: snapshot = [] } = useQuery(agentTaskSnapshotOptions(wsId));
  const role = members.find((m) => m.user_id === userId)?.role;

  const visible = useMemo(
    () =>
      agents
        .filter((a) => !a.archived_at && canAssignAgent(a, userId, role))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [agents, userId, role],
  );

  const unreadByAgent = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const s of sessions) {
      if (s.has_unread && s.agent_id) m.set(s.agent_id, true);
    }
    return m;
  }, [sessions]);

  const activeByAgent = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of snapshot) {
      if (!ACTIVE.has(t.status)) continue;
      m.set(t.agent_id, (m.get(t.agent_id) ?? 0) + 1);
    }
    return m;
  }, [snapshot]);

  const onLongPress = (agent: Agent) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          "取消",
          "查看档案",
          "设为默认员工",
          "新建会话",
          "会话历史",
        ],
        cancelButtonIndex: 0,
        title: agent.name,
      },
      (i) => {
        if (!wsSlug) return;
        if (i === 1) {
          router.push(`/${wsSlug}/staff/${agent.id}`);
        } else if (i === 2) {
          router.push({
            pathname: "/[workspace]/staff-picker",
            params: { workspace: wsSlug, intent: "default" },
          });
        } else if (i === 3) {
          onNewSession(agent);
        } else if (i === 4) {
          router.push({
            pathname: "/[workspace]/chat-sessions",
            params: { workspace: wsSlug },
          });
        }
      },
    );
  };

  return (
    <View
      className="border-b border-border"
      style={{
        backgroundColor: "transparent",
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-3 py-3 gap-3 items-center"
      >
        <Pressable
          onPress={() => {
            if (wsSlug) router.push(`/${wsSlug}/staff`);
          }}
          className="items-center gap-1 w-14"
          accessibilityLabel="全部数字员工"
        >
          <View
            className="size-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: "rgba(59,111,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(59,111,255,0.25)",
            }}
          >
            <Text className="text-xs font-semibold text-brand">全部</Text>
          </View>
          <Text className="text-[10px] text-muted-foreground">名册 ›</Text>
        </Pressable>
        {visible.map((agent) => {
          const selected = selectedAgentId === agent.id;
          const unread = unreadByAgent.get(agent.id);
          const active = activeByAgent.get(agent.id) ?? 0;
          return (
            <Pressable
              key={agent.id}
              onPress={() => onSelectAgent(agent)}
              onLongPress={() => onLongPress(agent)}
              className="items-center gap-1 w-14"
              accessibilityLabel={agent.name}
            >
              <View
                className={cn(
                  "rounded-full p-0.5",
                  selected && "border-2 border-brand",
                )}
                style={
                  selected
                    ? {
                        shadowColor: "#3B6FFF",
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                      }
                    : undefined
                }
              >
                <View className="relative">
                  <ActorAvatar
                    type="agent"
                    id={agent.id}
                    size={40}
                    showPresence
                  />
                  {unread ? (
                    <View className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive" />
                  ) : null}
                  {active > 0 ? (
                    <View className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-3.5 items-center justify-center rounded-full bg-brand px-0.5">
                      <Text className="text-[9px] font-bold text-white">
                        {active > 9 ? "9+" : String(active)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text
                className={cn(
                  "text-[10px] text-center w-14",
                  selected
                    ? "font-bold text-foreground"
                    : "text-muted-foreground",
                )}
                numberOfLines={1}
              >
                {agent.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
