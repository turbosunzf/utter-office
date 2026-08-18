/**
 * Industry brief preview — ranked Top 5 + tabs (PRD §4.6, daily push).
 */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { todayDateOnly } from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { BriefTabs } from "@/components/home/brief-tabs";
import { BriefRow } from "@/components/home/brief-row";
import { briefListOptions } from "@/data/queries/briefs";
import { briefsOnDay, filterBriefsByTab } from "@/data/mocks/briefs";
import { useWorkspaceStore } from "@/data/workspace-store";

const HOME_LIMIT = 5;

function HeaderDecor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={{
          position: "absolute",
          right: -28,
          top: -36,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: "rgba(255,255,255,0.10)",
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 36,
          top: 18,
          width: 88,
          height: 56,
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.08)",
          transform: [{ rotate: "16deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 18,
          bottom: 28,
          width: 54,
          height: 54,
          borderRadius: 27,
          borderWidth: 8,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />
    </View>
  );
}

export function BriefList() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: briefs = [] } = useQuery(briefListOptions(wsId));
  const [tab, setTab] = useState("all");
  const date = todayDateOnly();

  const dayItems = useMemo(
    () => filterBriefsByTab(briefsOnDay(briefs, date), tab),
    [briefs, date, tab],
  );
  const preview = dayItems.slice(0, HOME_LIMIT);

  const openMore = () => {
    if (!wsSlug) return;
    router.push({
      pathname: "/[workspace]/briefs",
      params: { workspace: wsSlug, tab },
    });
  };

  const openBrief = (id: string) => {
    if (wsSlug) router.push(`/${wsSlug}/brief/${id}`);
  };

  return (
    <View className="overflow-hidden rounded-2xl border border-border">
      <LinearGradient
        colors={["#FF6B5C", "#E53935", "#C2185B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <HeaderDecor />
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 0,
          }}
        >
          <View className="flex-row items-center">
            <View className="flex-1 min-w-0 pr-3">
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: "800",
                  lineHeight: 24,
                }}
              >
                行业简报
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.86)",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                聚焦你最关心的内容
              </Text>
            </View>
            <Pressable
              onPress={openMore}
              hitSlop={8}
              accessibilityLabel="查看更多简报"
              className="flex-row items-center"
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}
              >
                更多
              </Text>
              <Icon name="ChevronRight" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        <BriefTabs tab={tab} onChange={setTab} onAccent />
      </LinearGradient>

      <View className="bg-card">
        {preview.length === 0 ? (
          <View className="items-center px-4 py-8">
            <Text className="text-[13px] text-muted-foreground">
              这一天该分类暂无简报
            </Text>
          </View>
        ) : (
          preview.map((b, i) => (
            <BriefRow
              key={b.id}
              brief={b}
              rank={i + 1}
              onPress={() => openBrief(b.id)}
            />
          ))
        )}

        {dayItems.length > HOME_LIMIT ? (
          <Pressable
            onPress={openMore}
            className="items-center py-3 active:opacity-70"
          >
            <Text className="text-[13px] font-medium text-brand">
              查看全部 {dayItems.length} 条 ›
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
