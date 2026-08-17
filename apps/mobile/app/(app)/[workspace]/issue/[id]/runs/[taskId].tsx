/**
 * Run transcript formSheet — a single AgentTask's execution log, pushed from
 * the agent-runs list (`issue/[id]/runs.tsx`) when a terminal row is tapped.
 *
 * The AgentTask metadata is read from the already-cached task-runs query
 * (`issueTasksOptions`, no extra fetch); the execution log comes from
 * `taskMessagesOptions` (gated on a real UUID task id via
 * `isTaskMessageTaskId`).
 */
import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { RunTranscript } from "@/components/issue/run-transcript";
import { issueTasksOptions } from "@/data/queries/issues";
import { taskMessagesOptions } from "@/data/queries/chat";
import { useWorkspaceStore } from "@/data/workspace-store";

export default function RunTranscriptRoute() {
  const { id, taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: tasks = [] } = useQuery(issueTasksOptions(wsId, id));
  const task = tasks.find((t) => t.id === taskId) ?? null;
  const { data: messages = [] } = useQuery(taskMessagesOptions(taskId));

  return (
    <View className="flex-1">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-base font-semibold text-foreground">
          Run transcript
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {task ? (
          <RunTranscript task={task} messages={messages} />
        ) : (
          <View className="px-4 py-8">
            <Text className="text-sm text-muted-foreground">
              This run is no longer available.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
