/**
 * Industry brief preview — color-block cover + clean copy (PRD §4.6).
 */
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import {
  briefListOptions,
  USE_MOCK_BRIEFS,
} from "@/data/queries/briefs";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "—";
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "刚刚";
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

const COVER = [
  { from: "#2F62F0", to: "#6B9BFF", label: "讯" },
  { from: "#0D9488", to: "#2DD4BF", label: "研" },
  { from: "#C2410C", to: "#FB923C", label: "趋" },
] as const;

export function BriefList() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: briefs = [] } = useQuery(briefListOptions(wsId));
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const rows = useMemo(() => briefs.slice(0, 3), [briefs]);
  const unread = rows.filter((b) => !readIds.has(b.id)).length;

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[12px] font-medium text-muted-foreground">
            行业简报
          </Text>
          {unread > 0 ? (
            <View className="rounded-full bg-brand/15 px-1.5 py-0.5">
              <Text className="text-[10px] font-medium text-brand">
                {unread} 未读
              </Text>
            </View>
          ) : null}
        </View>
        {USE_MOCK_BRIEFS ? (
          <View className="rounded-md border border-border px-1.5 py-0.5">
            <Text className="text-[10px] text-muted-foreground">示例数据</Text>
          </View>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <View
          className="items-center rounded-2xl px-4 py-10 gap-2"
          style={{
            backgroundColor: colorScheme === "dark" ? t.card : "#FFFFFF",
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Icon name="FileText" size={28} color={t.mutedForeground} />
          <Text className="text-sm font-semibold text-foreground">暂无简报</Text>
          <Text className="text-[12px] text-muted-foreground text-center">
            接入后每日推送与你项目相关的行业动态。
          </Text>
        </View>
      ) : (
        <View className="gap-2.5">
          {rows.map((b, idx) => {
            const read = readIds.has(b.id);
            const cover = COVER[idx % COVER.length];
            const mark = (b.category.trim().slice(0, 1) || cover.label).toUpperCase();
            return (
              <Pressable
                key={b.id}
                onPress={() => {
                  setReadIds((prev) => new Set(prev).add(b.id));
                  if (wsSlug) router.push(`/${wsSlug}/brief/${b.id}`);
                }}
                className="overflow-hidden rounded-2xl active:opacity-90"
                style={{
                  backgroundColor: colorScheme === "dark" ? t.card : "#FFFFFF",
                  borderWidth: 1,
                  borderColor:
                    colorScheme === "dark"
                      ? t.border
                      : "rgba(15,23,42,0.06)",
                }}
              >
                <View className="flex-row">
                  <View className="w-[76px] overflow-hidden" style={{ minHeight: 98 }}>
                    <LinearGradient
                      colors={[cover.from, cover.to]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          right: -14,
                          bottom: -18,
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: "rgba(255,255,255,0.22)",
                        }}
                      />
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          left: -10,
                          top: -12,
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "rgba(255,255,255,0.16)",
                        }}
                      />
                      <View
                        className="size-11 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
                      >
                        <Text className="text-[18px] font-extrabold text-white">
                          {mark}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                  <View className="flex-1 min-w-0 px-3 py-3 gap-1.5">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="text-[10px] font-semibold"
                        style={{ color: cover.from }}
                      >
                        {b.category}
                      </Text>
                      <Text className="text-[10px] text-muted-foreground">
                        {b.source}
                      </Text>
                      <View className="flex-1" />
                      {!read ? (
                        <View className="size-1.5 rounded-full bg-brand" />
                      ) : null}
                      <Text className="text-[10px] text-muted-foreground">
                        {relativeTime(b.published_at)}
                      </Text>
                    </View>
                    <Text
                      className={cn(
                        "text-[14px] text-foreground leading-5",
                        read ? "font-medium" : "font-bold",
                      )}
                      numberOfLines={2}
                    >
                      {b.title}
                    </Text>
                    {b.summary ? (
                      <Text
                        className="text-[12px] text-muted-foreground leading-4"
                        numberOfLines={2}
                      >
                        {b.summary}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
