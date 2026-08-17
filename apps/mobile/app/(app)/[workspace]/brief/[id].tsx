/**
 * Brief detail — read-only + optional「让员工深挖」dispatch (PRD §4.6).
 */
import { Linking, Pressable, ScrollView, Share, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import { Markdown } from "@/lib/markdown/markdown";
import {
  briefDetailOptions,
  USE_MOCK_BRIEFS,
} from "@/data/queries/briefs";
import { useWorkspaceStore } from "@/data/workspace-store";

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "—";
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "刚刚";
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

export default function BriefDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: brief, isPending, isError } = useQuery(
    briefDetailOptions(wsId, id ?? ""),
  );

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">加载中…</Text>
      </View>
    );
  }

  if (isError || !brief) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-muted-foreground">找不到该简报</Text>
      </View>
    );
  }

  const dig = () => {
    if (!wsSlug) return;
    router.push({
      pathname: "/[workspace]/staff-picker",
      params: {
        workspace: wsSlug,
        intent: "dispatch",
        title: `调研：${brief.title}`,
        description: `${brief.summary}\n\n${brief.source_url ?? ""}\n\n> 来自行业简报`,
      },
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 pb-16 gap-3"
    >
      <View className="flex-row items-center gap-2">
        <View className="rounded-md bg-brand/15 px-2 py-0.5">
          <Text className="text-[11px] text-brand">{brief.category}</Text>
        </View>
        {USE_MOCK_BRIEFS ? (
          <View className="rounded border border-border px-1.5 py-0.5">
            <Text className="text-[10px] text-muted-foreground">示例数据</Text>
          </View>
        ) : null}
        <Pressable
          onPress={() =>
            void Share.share({ message: `${brief.title}\n${brief.source_url ?? ""}` })
          }
          className="ml-auto"
        >
          <Text className="text-sm text-brand">分享</Text>
        </Pressable>
      </View>

      <Text className="text-xl font-bold text-foreground leading-[1.35]">
        {brief.title}
      </Text>
      <Text className="text-xs text-muted-foreground">
        {brief.source} · {relativeTime(brief.published_at)}
      </Text>

      <Markdown content={brief.body_md} />

      {brief.source_url ? (
        <Pressable onPress={() => void Linking.openURL(brief.source_url!)}>
          <Text className="text-[13px] text-brand">来源链接 ↗</Text>
        </Pressable>
      ) : null}

      <View className="rounded-2xl border border-border bg-card p-3.5 mt-2">
        <Pressable
          onPress={dig}
          className="h-11 rounded-[10px] bg-brand items-center justify-center active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">
            🔍 让数字员工深挖这条
          </Text>
        </Pressable>
        <Text className="text-[11px] text-muted-foreground text-center mt-2 leading-[1.45]">
          将预填新建事项标题「调研：…」。产出是真实 issue；素材来自示例简报。
        </Text>
      </View>

      <View className="rounded-lg bg-warning/15 px-2.5 py-2">
        <Text className="text-[11px] text-warning leading-[1.45]">
          禁止文案写成「员工已自动巡检」。主动工作落点见档案「定时」与后端 B-5。
        </Text>
      </View>
    </ScrollView>
  );
}
