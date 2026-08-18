import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { SampleBadge } from "@/components/recording/sample-badge";
import { recordingListOptions } from "@/data/queries/recordings";
import { useWorkspaceStore } from "@/data/workspace-store";
import { formatClock } from "@/services/recording/recordingElapsed";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function RecordingsListPage() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data } = useQuery(recordingListOptions(wsId));
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 py-3 gap-3 pb-10">
        {!data?.length ? (
          <View className="py-24 items-center gap-2">
            <Icon name="Mic" size={28} color={t.mutedForeground} />
            <Text className="text-sm text-muted-foreground">还没有录音</Text>
            <Text className="text-xs text-muted-foreground">
              短按中央按钮，选择「录音」开始
            </Text>
          </View>
        ) : (
          data.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => slug && router.push(`/${slug}/recordings/${item.id}`)}
              className="rounded-2xl px-4 py-3 active:opacity-80"
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-[16px] font-semibold text-foreground" numberOfLines={1}>
                  {item.title}
                </Text>
                <SampleBadge visible={item.isSampleContent} />
              </View>
              <Text className="mt-1 text-xs text-muted-foreground">
                {formatClock(Math.floor(item.durationMs / 1000))} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
