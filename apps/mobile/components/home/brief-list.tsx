/**
 * Industry brief preview — dense rows + category tabs (PRD §4.6).
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { HomeSection } from "@/components/home/home-section";
import {
  briefListOptions,
  USE_MOCK_BRIEFS,
} from "@/data/queries/briefs";
import type { Brief } from "@/data/mocks/briefs";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS: { id: string; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "AI Infra", label: "AI Infra" },
  { id: "竞品", label: "竞品" },
  { id: "政策", label: "政策" },
  { id: "融资", label: "融资" },
];

const COVER: Record<string, { from: string; to: string }> = {
  "AI Infra": { from: "#2F62F0", to: "#6B9BFF" },
  竞品: { from: "#0D9488", to: "#2DD4BF" },
  政策: { from: "#7C3AED", to: "#A78BFA" },
  融资: { from: "#C2410C", to: "#FB923C" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "—";
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "刚刚";
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return "昨天";
  return `${d} 天前`;
}

function hitColor(tone: Brief["hit"] extends infer H
  ? H extends { tone: infer T }
    ? T
    : never
  : never): string {
  if (tone === "down") return "#DC2626";
  if (tone === "new") return "#3B6FFF";
  return "#64748B";
}

export function BriefList() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: briefs = [] } = useQuery(briefListOptions(wsId));
  const [tab, setTab] = useState("all");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const filtered = useMemo(() => {
    const list =
      tab === "all" ? briefs : briefs.filter((b) => b.category === tab);
    return list
      .slice()
      .sort(
        (a, b) =>
          Date.parse(b.published_at) - Date.parse(a.published_at),
      )
      .slice(0, 5);
  }, [briefs, tab]);

  const unread = filtered.filter((b) => !readIds.has(b.id)).length;

  return (
    <HomeSection
      title="行业简报"
      meta={
        unread > 0 ? (
          <View className="rounded-full bg-brand/15 px-1.5 py-0.5">
            <Text className="text-[10px] font-semibold text-brand">
              {unread} 未读
            </Text>
          </View>
        ) : null
      }
      badge={USE_MOCK_BRIEFS ? "示例" : undefined}
      flush
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 6,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 6,
        }}
      >
        {TABS.map((tb) => {
          const on = tab === tb.id;
          return (
            <Pressable
              key={tb.id}
              onPress={() => setTab(tb.id)}
              className="rounded-full px-2.5 py-1"
              style={{
                backgroundColor: on ? t.brand : colorScheme === "dark" ? t.secondary : "#F0F3FA",
              }}
            >
              <Text
                className={cn(
                  "text-[11px] font-semibold",
                  on ? "text-white" : "text-muted-foreground",
                )}
              >
                {tb.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View className="items-center px-4 py-8">
          <Text className="text-[12px] text-muted-foreground">
            该分类暂无简报
          </Text>
        </View>
      ) : (
        filtered.map((b) => {
          const read = readIds.has(b.id);
          const cover = COVER[b.category] ?? COVER["AI Infra"];
          const mark = b.thumb ?? b.category.slice(0, 1);
          return (
            <Pressable
              key={b.id}
              onPress={() => {
                setReadIds((prev) => new Set(prev).add(b.id));
                if (wsSlug) router.push(`/${wsSlug}/brief/${b.id}`);
              }}
              className="flex-row items-center gap-2.5 px-3 py-2.5 border-b border-border/50 active:opacity-90"
              style={
                !read
                  ? {
                      backgroundColor:
                        b.category === "竞品"
                          ? "rgba(13,148,136,0.06)"
                          : b.category === "政策"
                            ? "rgba(124,58,237,0.05)"
                            : "rgba(47,98,240,0.05)",
                    }
                  : undefined
              }
            >
              <View className="relative">
                <LinearGradient
                  colors={[cover.from, cover.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: read ? 0.55 : 1,
                  }}
                >
                  <Text className="text-[13px] font-extrabold text-white">
                    {mark}
                  </Text>
                </LinearGradient>
                {!read ? (
                  <View className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-brand border-2 border-white" />
                ) : null}
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className={cn(
                    "text-[13px] text-foreground leading-[18px]",
                    read ? "font-medium" : "font-bold",
                  )}
                  numberOfLines={1}
                >
                  {b.title}
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5" numberOfLines={1}>
                  {b.category} · {b.source} · {relativeTime(b.published_at)}
                </Text>
              </View>
              {b.hit ? (
                <View className="items-end w-11">
                  <Text
                    className="text-[12px] font-extrabold"
                    style={{ color: hitColor(b.hit.tone) }}
                  >
                    {b.hit.n}
                  </Text>
                  <Text className="text-[9px] text-muted-foreground">
                    {b.hit.l}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
    </HomeSection>
  );
}
