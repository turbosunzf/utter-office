/**
 * Board issue card — denser meet-think-style content card.
 */
import { Pressable, View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { PRIORITY_LABEL } from "@/lib/issue-status";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  issue: Issue;
  projectTitle?: string | null;
  running?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPressRunning?: () => void;
}

export function BoardIssueCard({
  issue,
  projectTitle,
  running = false,
  onPress,
  onLongPress,
  onPressRunning,
}: Props) {
  const hasAssignee = !!(issue.assignee_type && issue.assignee_id);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      className="rounded-2xl border border-border bg-card p-3 gap-2 active:bg-secondary"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: colorScheme === "dark" ? 0.25 : 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
      accessibilityLabel={`${issue.identifier} ${issue.title}`}
    >
      <View className="flex-row items-start gap-2">
        <StatusIcon status={issue.status} size={14} />
        <Text className="flex-1 text-[13px] font-semibold text-foreground" numberOfLines={2}>
          <Text className="text-muted-foreground font-medium">
            {issue.identifier}{" "}
          </Text>
          {issue.title}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 flex-wrap pl-5">
        {hasAssignee ? (
          <ActorAvatar
            type={issue.assignee_type!}
            id={issue.assignee_id!}
            size={18}
            showPresence
          />
        ) : null}
        <View
          className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5"
          style={{ backgroundColor: colorScheme === "dark" ? t.secondary : "#F3F4F8" }}
        >
          <PriorityIcon priority={issue.priority} size={11} />
          <Text className="text-[10px] text-muted-foreground">
            {PRIORITY_LABEL[issue.priority]}
          </Text>
        </View>
        {projectTitle ? (
          <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
            {projectTitle}
          </Text>
        ) : null}
        {running ? (
          <Pressable
            onPress={onPressRunning}
            hitSlop={8}
            className="flex-row items-center gap-1 rounded-md bg-brand/15 px-1.5 py-0.5"
            accessibilityLabel="运行中，点此介入"
          >
            <View className="size-1.5 rounded-full bg-brand" />
            <Text className="text-[10px] text-brand font-medium">介入</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
