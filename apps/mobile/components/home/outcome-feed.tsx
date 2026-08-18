/**
 * Home work outcomes — 24h range area chart (PRD §4.4).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient as ExpoGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { HomeSection } from "@/components/home/home-section";
import {
  OUTCOME_CHART_HEIGHT,
  OUTCOME_CHART_SVG_H,
  outcomeUsageUnit,
  outcomeUsageY,
} from "@/components/home/outcome-chart-height";
import {
  outcomeListOptions,
  USE_MOCK_OUTCOMES,
} from "@/data/queries/outcomes";
import type { WorkOutcome } from "@/data/mocks/outcomes";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { FadeSlideSheet } from "@/components/shared/fade-slide-sheet";
import { cn } from "@/lib/utils";

const SPAN = 24 * 3600_000;
const CHART_W = 1152;
const SNAP = 30 * 60_000;
const LABEL_GAP = 44;
const LABEL_W = 40;
const PIN = OUTCOME_CHART_HEIGHT.pin;

type AxisTick = {
  x: number;
  label: string;
  align: "left" | "center" | "right";
  kind: "edge" | "start" | "end";
};

type AgentFilter = "all" | string;

type AgentMeta = {
  id: string;
  name: string;
  initial: string;
  color: string;
};

type RunBand = {
  id: string;
  agent: AgentMeta;
  x0: number;
  x1: number;
  line: string;
  area: string;
  yTop: number;
  yBase: number;
};

function openOutcome(wsSlug: string | null, o: WorkOutcome) {
  if (!wsSlug) return;
  if (o.issue_id) {
    router.push(`/${wsSlug}/issue/${o.issue_id}`);
    return;
  }
  if (o.brief_id) {
    router.push(`/${wsSlug}/brief/${o.brief_id}`);
    return;
  }
  router.push(`/${wsSlug}/board`);
}

const KIND_META: Record<WorkOutcome["kind"], { accent: string }> = {
  每日新闻: { accent: "#7C3AED" },
  数据分析: { accent: "#3B6FFF" },
  事项交付: { accent: "#F87171" },
};

function sampleSpark(spark: number[], t: number): number {
  if (spark.length === 0) {
    return 0.2 + 0.65 * Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  }
  if (spark.length === 1) return Math.max(0.08, Math.min(1, spark[0]));
  const x = Math.max(0, Math.min(1, t)) * (spark.length - 1);
  const i = Math.min(spark.length - 2, Math.floor(x));
  const f = x - i;
  return Math.max(0.08, Math.min(1, spark[i] + (spark[i + 1] - spark[i]) * f));
}

function smoothLine(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function xOf(ts: number, windowStart: number): number {
  return Math.max(0, Math.min(CHART_W, ((ts - windowStart) / SPAN) * CHART_W));
}

function hm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildAxisTicks(
  runs: { start: number; end: number }[],
  windowStart: number,
  now: number,
): AxisTick[] {
  const byTs = new Map<number, "start" | "end">();
  for (const r of runs) {
    const startTs = Math.floor(r.start / SNAP) * SNAP;
    const endTs = Math.ceil(r.end / SNAP) * SNAP;
    byTs.set(startTs, "start");
    if (!byTs.has(endTs)) byTs.set(endTs, "end");
  }

  const interior: AxisTick[] = [];
  for (const [ts, kind] of [...byTs.entries()].sort((a, b) => a[0] - b[0])) {
    if (ts <= windowStart + 90_000 || ts >= now - 90_000) continue;
    const x = xOf(ts, windowStart);
    if (x < 28 || x > CHART_W - 40) continue;
    interior.push({ x, label: hm(ts), align: "center", kind });
  }

  const kept: AxisTick[] = [
    { x: 0, label: hm(windowStart), align: "left", kind: "edge" },
  ];
  for (const tick of interior) {
    const last = kept[kept.length - 1];
    if (tick.x - last.x < LABEL_GAP) {
      if (last.kind === "end" && tick.kind === "start") {
        kept[kept.length - 1] = tick;
      }
      continue;
    }
    kept.push(tick);
  }
  while (kept.length > 1 && CHART_W - kept[kept.length - 1].x < LABEL_GAP) {
    kept.pop();
  }
  kept.push({ x: CHART_W, label: "现在", align: "right", kind: "edge" });
  return kept;
}

function Heatmap({
  rows,
  agents,
  filter,
  onFilter,
  selectedId,
  onSelect,
}: {
  rows: WorkOutcome[];
  agents: AgentMeta[];
  filter: AgentFilter;
  onFilter: (next: AgentFilter) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const pinBorder = colorScheme === "dark" ? t.card : "#FFFFFF";
  const baseline =
    colorScheme === "dark" ? t.border : "rgba(220,224,232,0.9)";
  const scrollRef = useRef<ScrollView>(null);
  const svgH = OUTCOME_CHART_SVG_H;
  const yBase = svgH;
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedAgent = agents.find((a) => a.id === filter) ?? null;

  const { bands, pins, ticks, peakLabel, active } = useMemo(() => {
    const now = Date.now();
    const windowStart = now - SPAN;
    const maxTokens = Math.max(1, ...rows.map((o) => o.tokens || 1));
    const slotCounts = Array.from({ length: 48 }, () => new Set<string>());
    const bandsInner: RunBand[] = [];
    const pinMap = new Map<string, { x: number; agents: AgentMeta[] }>();
    const runs: { start: number; end: number }[] = [];

    for (const o of rows) {
      const end = Date.parse(o.produced_at);
      if (Number.isNaN(end)) continue;
      const dur = Math.max(10 * 60_000, o.duration_ms || 10 * 60_000);
      const runStart = end - dur;
      const x0 = xOf(runStart, windowStart);
      const x1 = Math.max(x0 + 8, xOf(end, windowStart));
      if (x1 <= 0 || x0 >= CHART_W) continue;
      runs.push({
        start: Math.max(runStart, windowStart),
        end: Math.min(end, now),
      });

      const samples = Math.max(8, Math.round((x1 - x0) / 10));
      const pts: { x: number; y: number }[] = [];
      let yTop = yBase;
      for (let s = 0; s <= samples; s++) {
        const tt = s / samples;
        const usage = outcomeUsageUnit(
          sampleSpark(o.spark, tt),
          o.tokens || 1,
          maxTokens,
        );
        const y = outcomeUsageY(usage, yBase);
        pts.push({ x: x0 + (x1 - x0) * tt, y });
        yTop = Math.min(yTop, y);
      }
      const line = smoothLine(pts);
      const area = `${line} L${x1.toFixed(1)} ${yBase.toFixed(1)} L${x0.toFixed(1)} ${yBase.toFixed(1)} Z`;
      const meta: AgentMeta = {
        id: o.agent_id,
        name: o.agent_name,
        initial: o.agent_initial,
        color: o.agent_color,
      };
      bandsInner.push({
        id: o.id,
        agent: meta,
        x0,
        x1,
        line,
        area,
        yTop,
        yBase,
      });

      const pinKey = `${Math.round(x0 / 16)}`;
      const existing = pinMap.get(pinKey);
      if (existing) {
        if (!existing.agents.some((a) => a.id === meta.id)) {
          existing.agents.push(meta);
        }
      } else {
        pinMap.set(pinKey, { x: x0, agents: [meta] });
      }

      const fromSlot = Math.max(
        0,
        Math.floor(((runStart - windowStart) / SPAN) * 48),
      );
      const toSlot = Math.min(
        47,
        Math.floor(((end - windowStart) / SPAN) * 48),
      );
      for (let i = fromSlot; i <= toSlot; i++) {
        slotCounts[i].add(o.agent_id);
      }
    }

    bandsInner.sort((a, b) => a.x0 - b.x0 || a.x1 - b.x1);

    let peakIdx = 0;
    let peakN = 0;
    slotCounts.forEach((set, i) => {
      if (set.size > peakN) {
        peakN = set.size;
        peakIdx = i;
      }
    });
    const peakAt = new Date(windowStart + ((peakIdx + 0.5) / 48) * SPAN);

    return {
      bands: bandsInner,
      pins: [...pinMap.values()],
      ticks: buildAxisTicks(runs, windowStart, now),
      peakLabel: `${String(peakAt.getHours()).padStart(2, "0")}:${String(peakAt.getMinutes()).padStart(2, "0")}`,
      active: new Set(rows.map((o) => o.agent_id)).size,
    };
  }, [rows, yBase]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [rows.length, filter]);

  useEffect(() => {
    if (selectedId && !rows.some((o) => o.id === selectedId)) {
      onSelect(null);
    }
  }, [rows, selectedId, onSelect]);

  function pickBand(x: number) {
    const hits = bands.filter((b) => x >= b.x0 && x <= b.x1);
    if (hits.length === 0) {
      onSelect(null);
      return;
    }
    hits.sort((a, b) => a.x1 - a.x0 - (b.x1 - b.x0));
    const id = hits[0].id;
    onSelect(selectedId === id ? null : id);
  }

  const ordered = selectedId
    ? [
        ...bands.filter((b) => b.id !== selectedId),
        ...bands.filter((b) => b.id === selectedId),
      ]
    : bands;

  return (
    <View className="overflow-hidden">
      <ExpoGradient
        colors={
          colorScheme === "dark"
            ? ["rgba(59,111,255,0.22)", t.card]
            : ["rgba(59,111,255,0.14)", "#FFFFFF"]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-row items-center justify-between gap-2 px-4 pt-2.5 pb-1.5">
        <View
          className="flex-row items-center h-6 rounded-md px-1.5"
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Text className="text-[11px] text-muted-foreground">
            高峰 {peakLabel}
          </Text>
          <View
            className="w-px h-3 mx-1.5"
            style={{ backgroundColor: t.border }}
          />
          <Text className="text-[11px] text-muted-foreground">
            活跃 {active}
          </Text>
        </View>
        <Pressable
          onPress={() => setPickerOpen(true)}
          hitSlop={6}
          accessibilityLabel="选择人员"
          className="flex-row items-center h-6 rounded-full pl-1 pr-1.5 gap-1"
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          {selectedAgent ? (
            <>
              <View
                className="size-5 rounded-full items-center justify-center"
                style={{ backgroundColor: selectedAgent.color }}
              >
                <Text className="text-[9px] font-bold text-white">
                  {selectedAgent.initial.toUpperCase()}
                </Text>
              </View>
              <Text
                className="text-[12px] font-semibold text-foreground"
                numberOfLines={1}
                style={{ maxWidth: 72 }}
              >
                {selectedAgent.name}
              </Text>
            </>
          ) : (
            <Text className="text-[12px] font-semibold text-foreground pl-1">
              全部
            </Text>
          )}
          <Icon name="ChevronDown" size={14} color={t.mutedForeground} />
        </Pressable>
      </View>
      <FadeSlideSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
      >
        <Text className="text-[15px] font-extrabold text-foreground px-1 pb-2">
          选择人员
        </Text>
        <Pressable
          onPress={() => {
            onFilter("all");
            setPickerOpen(false);
          }}
          className={cn(
            "flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-secondary",
            filter === "all" && "bg-secondary",
          )}
        >
          <View className="size-8 rounded-full items-center justify-center bg-muted">
            <Icon name="Users" size={16} color={t.mutedForeground} />
          </View>
          <Text className="flex-1 text-[14px] font-semibold text-foreground">
            全部
          </Text>
          {filter === "all" ? (
            <Icon name="Check" size={18} color={t.brand} />
          ) : null}
        </Pressable>
        {agents.map((a) => {
          const on = filter === a.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => {
                onFilter(a.id);
                setPickerOpen(false);
              }}
              className={cn(
                "flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-secondary",
                on && "bg-secondary",
              )}
            >
              <View
                className="size-8 rounded-full items-center justify-center"
                style={{ backgroundColor: a.color }}
              >
                <Text className="text-[12px] font-bold text-white">
                  {a.initial.toUpperCase()}
                </Text>
              </View>
              <Text className="flex-1 text-[14px] font-semibold text-foreground">
                {a.name}
              </Text>
              {on ? <Icon name="Check" size={18} color={t.brand} /> : null}
            </Pressable>
          );
        })}
      </FadeSlideSheet>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}
        onContentSizeChange={() => {
          scrollRef.current?.scrollToEnd({ animated: false });
        }}
      >
        <View style={{ width: CHART_W }}>
          <View style={{ height: svgH }}>
            <Svg width={CHART_W} height={svgH} pointerEvents="none">
              <Defs>
                {bands.map((b) => {
                  const on = selectedId === b.id;
                  const idle = selectedId != null && !on;
                  return (
                    <LinearGradient
                      key={b.id}
                      id={`run-${b.id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <Stop
                        offset="0%"
                        stopColor={b.agent.color}
                        stopOpacity={idle ? 0.16 : on ? 0.62 : 0.42}
                      />
                      <Stop
                        offset="100%"
                        stopColor={b.agent.color}
                        stopOpacity={idle ? 0.03 : on ? 0.12 : 0.05}
                      />
                    </LinearGradient>
                  );
                })}
              </Defs>
              <Line
                x1={0}
                x2={CHART_W}
                y1={yBase}
                y2={yBase}
                stroke={baseline}
                strokeWidth={1}
              />
              {ordered.map((b) => (
                <Path key={`a-${b.id}`} d={b.area} fill={`url(#run-${b.id})`} />
              ))}
              {ordered.map((b) => {
                const on = selectedId === b.id;
                const idle = selectedId != null && !on;
                return (
                  <Path
                    key={`l-${b.id}`}
                    d={b.line}
                    stroke={b.agent.color}
                    strokeWidth={on ? 2.4 : 1.7}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={idle ? 0.28 : 0.95}
                  />
                );
              })}
              {ordered.map((b) => {
                const on = selectedId === b.id;
                const idle = selectedId != null && !on;
                return (
                  <G key={`br-${b.id}`}>
                    <Line
                      x1={b.x0}
                      x2={b.x0}
                      y1={b.yTop}
                      y2={b.yBase}
                      stroke={b.agent.color}
                      strokeWidth={on ? 2 : 1.2}
                      strokeOpacity={idle ? 0.22 : 0.75}
                    />
                    <Line
                      x1={b.x1}
                      x2={b.x1}
                      y1={b.yTop}
                      y2={b.yBase}
                      stroke={b.agent.color}
                      strokeWidth={on ? 2 : 1.2}
                      strokeOpacity={idle ? 0.22 : 0.75}
                    />
                  </G>
                );
              })}
            </Svg>
            <Pressable
              accessibilityLabel="选择产出区间"
              onPress={(e) => pickBand(e.nativeEvent.locationX)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              }}
            />
            {pins.map((p, i) => {
              const stackW = PIN + Math.max(0, p.agents.length - 1) * 12;
              return (
                <View
                  key={`pin-${i}`}
                  className="absolute flex-row"
                  pointerEvents="none"
                  style={{
                    top: 0,
                    left: p.x,
                    transform: [{ translateX: -stackW / 2 }],
                  }}
                >
                  {p.agents.map((a, j) => (
                    <View
                      key={a.id}
                      className="rounded-full items-center justify-center"
                      style={{
                        width: PIN,
                        height: PIN,
                        backgroundColor: a.color,
                        marginLeft: j === 0 ? 0 : -6,
                        borderWidth: 2,
                        borderColor: pinBorder,
                      }}
                    >
                      <Text className="text-[8px] font-bold text-white">
                        {a.initial.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
          <View className="relative h-4 mt-0.5">
            {ticks.map((tick, i) =>
              tick.align === "center" ? (
                <View
                  key={`axis-${i}`}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: tick.x - LABEL_W / 2,
                    width: LABEL_W,
                    alignItems: "center",
                  }}
                >
                  <Text className="text-[10px] font-semibold text-muted-foreground text-center">
                    {tick.label}
                  </Text>
                </View>
              ) : (
                <Text
                  key={`axis-${i}`}
                  className="absolute text-[10px] font-semibold text-muted-foreground"
                  style={
                    tick.align === "left" ? { left: 0 } : { right: 0 }
                  }
                >
                  {tick.label}
                </Text>
              ),
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_PAD = 16;
const TITLE_SIZE = 13;
const TITLE_LINE = 18;
const META_SIZE = 13;

function cardPeople(o: WorkOutcome) {
  if (o.people && o.people.length > 0) return o.people.slice(0, 3);
  return [
    {
      agent_id: o.agent_id,
      agent_name: o.agent_name,
      agent_initial: o.agent_initial,
      agent_color: o.agent_color,
    },
  ];
}

function OutcomeCard({
  o,
  active,
  onPress,
}: {
  o: WorkOutcome;
  active?: boolean;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const kind = KIND_META[o.kind];
  const hairline = colorScheme === "dark" ? t.border : "rgba(15,23,42,0.08)";

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${o.title}，${o.agent_name}，${o.metric} ${o.metric_label}`}
      className="active:opacity-90"
      style={{ width: 228 }}
    >
      <View
        className="overflow-hidden rounded-[20px] bg-card"
        style={{
          borderWidth: 1,
          borderColor: active ? o.agent_color : t.border,
          shadowOpacity: 0,
          elevation: 0,
        }}
      >
        <View
          className="flex-row items-center"
          style={{
            paddingTop: CARD_PAD,
            paddingRight: CARD_PAD,
            paddingBottom: CARD_PAD,
          }}
        >
          <View
            style={{
              width: 4,
              height: TITLE_LINE,
              backgroundColor: kind.accent,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              borderTopRightRadius: 999,
              borderBottomRightRadius: 999,
            }}
          />
          <Text
            className="flex-1 text-foreground"
            style={{
              fontSize: TITLE_SIZE,
              fontWeight: "700",
              lineHeight: TITLE_LINE,
              marginLeft: 10,
            }}
            numberOfLines={1}
          >
            {o.title}
          </Text>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: hairline,
            marginHorizontal: 12,
          }}
        />

        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 12, paddingVertical: CARD_PAD }}
        >
          <View className="flex-row items-center">
            {cardPeople(o).map((p, i) => (
              <View
                key={p.agent_id}
                className="size-7 rounded-full items-center justify-center"
                style={{
                  backgroundColor: p.agent_color,
                  borderWidth: 2,
                  borderColor: colorScheme === "dark" ? t.card : "#FFFFFF",
                  marginLeft: i === 0 ? 0 : -8,
                  zIndex: i + 1,
                }}
              >
                <Text className="text-[11px] font-bold text-white">
                  {p.agent_initial.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Icon name="CheckCircle2" size={14} color={t.mutedForeground} />
            <Text
              className="font-semibold"
              style={{ fontSize: META_SIZE, color: t.mutedForeground }}
            >
              {o.metric} {o.metric_label}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function OutcomeFeed() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: outcomes = [] } = useQuery(outcomeListOptions(wsId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AgentFilter>("all");

  const rows = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return outcomes
      .filter((o) => Date.parse(o.produced_at) >= cutoff)
      .sort((a, b) => Date.parse(a.produced_at) - Date.parse(b.produced_at));
  }, [outcomes]);

  const agents = useMemo(() => {
    const map = new Map<string, AgentMeta>();
    for (const o of rows) {
      if (!map.has(o.agent_id)) {
        map.set(o.agent_id, {
          id: o.agent_id,
          name: o.agent_name,
          initial: o.agent_initial,
          color: o.agent_color,
        });
      }
    }
    return [...map.values()];
  }, [rows]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((o) => o.agent_id === filter)),
    [rows, filter],
  );

  const tiles = useMemo(() => {
    if (!selectedId) return visible;
    const hit = visible.find((o) => o.id === selectedId);
    return hit ? [hit] : visible;
  }, [visible, selectedId]);

  return (
    <View className="px-4">
      <HomeSection
        title="工作成果"
        badge={USE_MOCK_OUTCOMES ? "示例" : undefined}
        right={
          <Pressable
            onPress={() => {
              if (wsSlug) router.push(`/${wsSlug}/reports`);
            }}
            hitSlop={8}
            accessibilityLabel="打开完整报告"
          >
            <Text className="text-[12px] font-medium text-brand">完整报告 ›</Text>
          </Pressable>
        }
        flush
      >
        {rows.length === 0 ? (
          <View className="px-4 py-8 items-center gap-1.5">
            <Text className="text-sm font-semibold text-foreground">
              近 24 小时暂无产出
            </Text>
            <Text className="text-[12px] text-muted-foreground text-center">
              派单或开启定时任务后会出现在这里
            </Text>
          </View>
        ) : (
          <>
            <Heatmap
              rows={visible}
              agents={agents}
              filter={filter}
              onFilter={setFilter}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 16,
                paddingBottom: 16,
                paddingTop: 8,
              }}
            >
              {tiles.map((o) => (
                <OutcomeCard
                  key={o.id}
                  o={o}
                  active={selectedId === o.id}
                  onPress={() => openOutcome(wsSlug, o)}
                />
              ))}
            </ScrollView>
          </>
        )}
      </HomeSection>
    </View>
  );
}
