/**
 * Staff picker formSheet — shared by home「派单」(intent=dispatch) and
 * future secretary settings (intent=default). Agents only; visibility via
 * `canAssignAgent`. Dispatch pre-fills new-issue assignee via URL params
 * (new-issue resets its draft store on mount).
 */
import { useLayoutEffect, useMemo } from "react";
import {
  Alert,
  FlatList,
  InteractionManager,
  Pressable,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Agent } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { agentListOptions } from "@/data/queries/agents";
import { memberListOptions } from "@/data/queries/members";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { canAssignAgent } from "@/lib/can-assign-agent";
import { isAgentRuntimeBound } from "@/lib/is-agent-runtime-bound";
import { useNativeSearchBar } from "@/lib/use-native-search-bar";
import { useScrollToTopOnChange } from "@/lib/use-scroll-to-top-on-change";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Intent = "dispatch" | "default";

function agentStatusLabel(agent: Agent): { label: string; tone: string } {
  if (!isAgentRuntimeBound(agent)) {
    return { label: "未绑定", tone: "text-muted-foreground" };
  }
  switch (agent.status) {
    case "working":
      return { label: "工作中", tone: "text-brand" };
    case "idle":
      return { label: "在岗", tone: "text-success" };
    case "blocked":
      return { label: "受阻", tone: "text-warning" };
    case "error":
      return { label: "异常", tone: "text-destructive" };
    case "offline":
    default:
      return { label: "离线", tone: "text-muted-foreground" };
  }
}

export default function StaffPicker() {
  const navigation = useNavigation();
  const { intent: intentParam } = useLocalSearchParams<{
    intent?: string;
  }>();
  const intent: Intent =
    intentParam === "default" ? "default" : "dispatch";

  useLayoutEffect(() => {
    navigation.setOptions({
      title: intent === "default" ? "设为默认员工" : "选择数字员工",
    });
  }, [navigation, intent]);

  const query = useNativeSearchBar("搜索员工", { autoFocus: true });
  const listRef = useScrollToTopOnChange(query);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const userId = useAuthStore((s) => s.user?.id);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  // Visibility needs both agents + the caller's member role. Do not render
  // the empty state until members have settled — otherwise canAssignAgent
  // treats every workspace agent as invisible and flashes「暂无可用」.
  const { data: agents = [], isFetched: agentsFetched } = useQuery(
    agentListOptions(wsId),
  );
  const { data: members = [], isFetched: membersFetched } = useQuery(
    memberListOptions(wsId),
  );
  const ready = agentsFetched && membersFetched;
  const memberRole = members.find((m) => m.user_id === userId)?.role;

  const rows = useMemo(() => {
    if (!ready) return [];
    const q = query.trim().toLowerCase();
    return [...agents]
      .filter((a) => !a.archived_at)
      .filter((a) => canAssignAgent(a, userId, memberRole))
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents, userId, memberRole, query, ready]);

  const onSelect = (agent: Agent) => {
    const bound = isAgentRuntimeBound(agent);
    if (intent === "dispatch" && !bound) {
      Alert.alert("无法派单", "该数字员工尚未绑定工位，请先绑定后再派单。");
      return;
    }
    if (!wsSlug) return;

    if (intent === "dispatch") {
      // Dismiss the formSheet first, then push the new-issue modal once
      // the sheet animation settles — sync dismiss+push is often dropped
      // by RN Screens (same pattern as project/new.tsx).
      router.dismiss();
      InteractionManager.runAfterInteractions(() => {
        router.push({
          pathname: "/[workspace]/new-issue",
          params: {
            workspace: wsSlug,
            assigneeId: agent.id,
            assigneeType: "agent",
          },
        });
      });
      return;
    }

    // intent=default — SecureStore write lands in M2; UI-only for M1.
    Alert.alert(
      "已选择",
      `「${agent.name}」将在后续版本写入默认员工设置。`,
      [{ text: "好", onPress: () => router.back() }],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Text className="px-4 pb-2 text-center text-xs text-muted-foreground">
        {intent === "dispatch"
          ? "派单 · 选中后进入新建事项并预填负责人"
          : "设为默认员工 · 设置将在后续版本生效"}
      </Text>
      {!ready ? (
        <View className="px-4 pt-4">
          <Text className="text-sm text-muted-foreground">加载中…</Text>
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-2">
          <Ionicons
            name="people-outline"
            size={36}
            color={t.mutedForeground}
          />
          <Text className="text-base font-medium text-foreground">
            暂无可用数字员工
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            当前工作区没有你可见的数字员工。
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(a) => a.id}
          contentContainerClassName="pb-8"
          renderItem={({ item }) => {
            const bound = isAgentRuntimeBound(item);
            const status = agentStatusLabel(item);
            const disabled = intent === "dispatch" && !bound;
            return (
              <Pressable
                onPress={() => onSelect(item)}
                disabled={disabled}
                className={cn(
                  "flex-row items-center gap-3 px-4 py-3 active:bg-secondary",
                  disabled && "opacity-50",
                )}
              >
                <ActorAvatar type="agent" id={item.id} size={40} showPresence />
                <View className="flex-1 min-w-0">
                  <Text
                    className="text-base font-medium text-foreground"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="text-xs text-muted-foreground mt-0.5"
                    numberOfLines={1}
                  >
                    {bound ? "工位已绑定" : "未绑定工位 · 不可派单"}
                  </Text>
                </View>
                <Text className={cn("text-xs", status.tone)}>
                  {status.label}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
