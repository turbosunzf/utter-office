import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Text } from "@/components/ui/text";
import { SampleBadge } from "@/components/recording/sample-badge";
import { RecordingPlayer } from "@/components/recording/recording-player";
import {
  recordingDetailOptions,
  transcriptOptions,
} from "@/data/queries/recordings";
import { useWorkspaceStore } from "@/data/workspace-store";
import { formatClock } from "@/services/recording/recordingElapsed";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const TABS = ["原文精转", "关键纪要", "智能分析"];

export default function RecordingDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: recording } = useQuery(recordingDetailOptions(wsId, id ?? ""));
  const { data: transcript } = useQuery(transcriptOptions(id ?? ""));
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const [tab, setTab] = useState(0);
  const [seekMs, setSeekMs] = useState<number | null>(null);
  const [ask, setAsk] = useState("");

  if (!recording) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted-foreground">加载中…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-3 pb-1 flex-row items-center gap-2">
        <Text className="flex-1 text-lg font-bold text-foreground" numberOfLines={1}>
          {recording.title}
        </Text>
        <SampleBadge visible={recording.isSampleContent || !!transcript?.isSample} />
      </View>

      <RecordingPlayer
        volumes={recording.volumes}
        durationMs={recording.durationMs}
        seekMs={seekMs}
      />

      <View className="px-4 pb-2">
        <SegmentedControl
          values={TABS}
          selectedIndex={tab}
          onChange={(e) => setTab(e.nativeEvent.selectedSegmentIndex)}
        />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28">
        {tab === 0 ? (
          (transcript?.sentences ?? []).map((line) => (
            <Pressable
              key={line.id}
              onPress={() => setSeekMs(line.startMs)}
              className="mb-4"
              accessibilityLabel="跳转到该句"
            >
              <Text className="text-xs text-muted-foreground">
                {line.speaker} · {formatClock(Math.floor(line.startMs / 1000))}
              </Text>
              <Text className="mt-1 text-base leading-6 text-foreground">
                {line.text}
              </Text>
              {line.translation ? (
                <Text className="mt-0.5 text-sm text-muted-foreground">
                  {line.translation}
                </Text>
              ) : null}
            </Pressable>
          ))
        ) : null}

        {tab === 1 ? (
          <View className="gap-4">
            <Section title="要点" items={transcript?.summary.bullets ?? []} />
            <Section title="决策" items={transcript?.summary.decisions ?? []} />
            <Section title="待办" items={transcript?.summary.todos ?? []} />
          </View>
        ) : null}

        {tab === 2 ? (
          <View className="gap-4">
            <Section title="主题" items={transcript?.analysis.topics ?? []} />
            <Text className="text-sm leading-6 text-foreground">
              {transcript?.analysis.sentiment}
            </Text>
            <Section title="风险" items={transcript?.analysis.risks ?? []} />
            <Section title="下一步" items={transcript?.analysis.nextSteps ?? []} />
          </View>
        ) : null}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-2"
        style={{ backgroundColor: t.background, borderTopWidth: 1, borderTopColor: t.border }}
      >
        <View
          className="flex-row items-center rounded-full px-4"
          style={{ backgroundColor: t.secondary, minHeight: 44 }}
        >
          <TextInput
            value={ask}
            onChangeText={setAsk}
            placeholder="问这次会议…"
            placeholderTextColor={t.mutedForeground}
            className="flex-1 py-2 text-[15px] text-foreground"
          />
        </View>
      </View>
    </View>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      {items.map((item) => (
        <Text key={item} className="text-sm leading-6 text-muted-foreground">
          · {item}
        </Text>
      ))}
    </View>
  );
}
