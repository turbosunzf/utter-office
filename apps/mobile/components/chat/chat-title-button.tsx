/**
 * Centred, tappable title region for the Chat tab's native Stack header.
 * Rendered as `headerTitle: () => <ChatTitleButton ... />` so iOS positions
 * it where it expects the screen title, but the whole region is a Pressable
 * — tap opens the sessions + agent picker sheet.
 */
import { Pressable, View } from "react-native";
import type { Agent, ChatSession } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";

interface Props {
  currentSession: ChatSession | null;
  currentAgent: Agent | null;
  onPress: () => void;
}

export function ChatTitleButton({
  currentSession,
  currentAgent,
  onPress,
}: Props) {
  const agentName = currentAgent?.name ?? "Chat";
  const subtitle = currentSession?.title || "New chat";

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      className="flex-row items-center gap-2.5 px-1.5 py-1 rounded-xl active:bg-secondary"
      accessibilityRole="button"
      accessibilityLabel="会话与员工切换"
    >
      <ActorAvatar
        type={currentAgent ? "agent" : null}
        id={currentAgent?.id ?? null}
        size={28}
        showPresence
      />
      <View className="min-w-0 gap-0.5">
        <View className="flex-row items-center gap-1">
          <Text
            className="text-[17px] font-bold text-foreground"
            style={{ letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {agentName}
          </Text>
          <Text className="text-[10px] text-muted-foreground">▾</Text>
        </View>
        <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
