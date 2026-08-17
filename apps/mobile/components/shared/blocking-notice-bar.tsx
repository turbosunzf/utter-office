/**
 * BlockingNoticeBar — single priority banner for home / board / workbench
 * (PRD §7.2). Uses already-subscribed queries only (zero extra requests).
 */
import { Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Text } from "@/components/ui/text";
import { agentListOptions } from "@/data/queries/agents";
import { runtimeListOptions } from "@/data/queries/runtimes";
import { memberListOptions } from "@/data/queries/members";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { canAssignAgent } from "@/lib/can-assign-agent";
import { isAgentRuntimeBound } from "@/lib/is-agent-runtime-bound";

interface Notice {
  key: string;
  message: string;
  actionLabel?: string;
  actionPath?: string;
}

export function BlockingNoticeBar({
  focusAgentId,
}: {
  /** When set (workbench), prefer notices about this agent. */
  focusAgentId?: string | null;
}) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const userId = useAuthStore((s) => s.user?.id);
  const { data: agents = [], isFetched: agentsFetched } = useQuery(
    agentListOptions(wsId),
  );
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const { data: runtimes = [] } = useQuery(runtimeListOptions(wsId));
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      setOffline(s.isConnected === false);
    });
    return () => sub();
  }, []);

  const role = members.find((m) => m.user_id === userId)?.role;
  const visible = agents.filter(
    (a) => !a.archived_at && canAssignAgent(a, userId, role),
  );

  let notice: Notice | null = null;
  if (offline) {
    notice = {
      key: "net",
      message: "网络已断开，正在重连",
    };
  } else if (agentsFetched && visible.length === 0) {
    notice = {
      key: "no-agent",
      message: "还没有数字员工，请先在 Web 端创建",
    };
  } else {
    const focus =
      (focusAgentId
        ? visible.find((a) => a.id === focusAgentId)
        : undefined) ?? visible[0];
    if (focus && !isAgentRuntimeBound(focus)) {
      notice = {
        key: "unbound",
        message: "有员工工位未绑定，任务可能无法执行",
        actionLabel: "去绑定",
        actionPath: `/staff/${focus.id}`,
      };
    } else if (focus?.runtime_id) {
      const rt = runtimes.find((r) => r.id === focus.runtime_id);
      if (rt && rt.status === "offline") {
        notice = {
          key: "rt-offline",
          message: "工位离线，任务会排队等待",
          actionLabel: "查看工位",
          actionPath: `/staff/${focus.id}`,
        };
      }
    }
  }

  if (!notice) return null;

  return (
    <View className="flex-row items-center gap-2 bg-warning/15 border-b border-warning/30 px-3.5 py-2">
      <Text className="text-xs text-warning shrink-0">⚠️</Text>
      <Text className="flex-1 text-xs text-foreground">{notice.message}</Text>
      {notice.actionLabel && notice.actionPath && wsSlug ? (
        <Pressable
          onPress={() => router.push(`/${wsSlug}${notice!.actionPath}`)}
          hitSlop={8}
        >
          <Text className="text-xs font-semibold text-brand">
            {notice.actionLabel} ›
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
