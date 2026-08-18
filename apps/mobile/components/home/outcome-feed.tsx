/**
 * Home work outcomes — 24h range area chart (PRD §4.4).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { Text } from "@/components/ui/text";
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

function clockLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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

function sparkPath(values: number[], w = 64, h = 28): string {
  if (values.length === 0) return "";
  const step = w / Math.max(1, values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - Math.max(0.08, Math.min(1, v)) * (h - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

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
  selectedId,
  onSelect,
}: {
  rows: WorkOutcome[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const pinBorder = colorScheme === "dark" ? t.card : "#FFFFFF";
  const baseline =
    colorScheme === "dark" ? t.border : "rgba(220,224,232,0.9)";
  const scrollRef = useRef<ScrollView>(null);
  const [filter, setFilter] = useState<AgentFilter>("all");
  const svgH = OUTCOME_CHART_SVG_H;
  const yBase = svgH;

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

  const visibleRows = useMemo(
    () => (filter === "all" ? rows : rows.filter((o) => o.agent_id === filter)),
    [rows, filter],
  );

  const { bands, pins, ticks, peakLabel, parallel, active } = useMemo(() => {
    const now = Date.now();
    const windowStart = now - SPAN;
    const maxTokens = Math.max(1, ...visibleRows.map((o) => o.tokens || 1));
    const slotCounts = Array.from({ length: 48 }, () => new Set<string>());
    const bandsInner: RunBand[] = [];
    const pinMap = new Map<string, { x: number; agents: AgentMeta[] }>();
    const runs: { start: number; end: number }[] = [];

    for (const o of visibleRows) {
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
      parallel: Math.max(0, ...slotCounts.map((s) => s.size)),
      active: new Set(visibleRows.map((o) => o.agent_id)).size,
    };
  }, [visibleRows, yBase]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [rows.length, filter]);

  useEffect(() => {
    if (selectedId && !visibleRows.some((o) => o.id === selectedId)) {
      onSelect(null);
    }
  }, [visibleRows, selectedId, onSelect]);

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
    <View className="pt-2.5 pb-1">
      <View className="flex-row items-center gap-2 mb-2 px-3">
        <View className="flex-1 flex-row items-center gap-2 min-w-0">
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            高峰 <Text className="font-bold text-foreground">{peakLabel}</Text>
          </Text>
          <View className="w-px h-2.5 bg-border" />
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            并行 <Text className="font-bold text-foreground">{parallel}</Text>
          </Text>
          <View className="w-px h-2.5 bg-border" />
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            活跃 <Text className="font-bold text-foreground">{active}</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => setFilter("all")}
            className={cn(
              "h-6 px-2 rounded-full items-center justify-center",
              filter === "all" ? "bg-brand" : "bg-secondary",
            )}
          >
            <Text
              className={cn(
                "text-[10px] font-bold",
                filter === "all" ? "text-white" : "text-muted-foreground",
              )}
            >
              全部
            </Text>
          </Pressable>
          {agents.map((a) => {
            const on = filter === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setFilter(on ? "all" : a.id)}
                accessibilityLabel={`${a.name}的产出`}
                className="rounded-full"
                style={{
                  borderWidth: 2,
                  borderColor: on ? a.color : "transparent",
                }}
              >
                <View
                  className="size-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: a.color }}
                >
                  <Text className="text-[8px] font-bold text-white">
                    {a.initial}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 2 }}
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
                        {a.initial}
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
                  <Text className="text-[9px] font-semibold text-muted-foreground text-center">
                    {tick.label}
                  </Text>
                </View>
              ) : (
                <Text
                  key={`axis-${i}`}
                  className="absolute text-[9px] font-semibold text-muted-foreground"
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

function Tile({
  o,
  active,
  onPress,
}: {
  o: WorkOutcome;
  active?: boolean;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const well = colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "#F5F7FC";
  const line =
    o.kind === "每日新闻"
      ? "#A78BFA"
      : o.kind === "数据分析"
        ? "#3B6FFF"
        : "#F87171";
  const numColor =
    o.kind === "每日新闻"
      ? "#7C3AED"
      : o.kind === "数据分析"
        ? "#3B6FFF"
        : "#F87171";
  const d = sparkPath(o.spark);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl p-2 gap-1.5 active:opacity-90"
      style={{
        width: active ? 220 : 132,
        backgroundColor: well,
        borderWidth: active ? 1.5 : 0,
        borderColor: active ? o.agent_color : "transparent",
      }}
    >
      <View className="flex-row items-center gap-1.5">
        <View
          className="size-5 rounded-full items-center justify-center"
          style={{ backgroundColor: o.agent_color }}
        >
          <Text className="text-[9px] font-bold text-white">
            {o.agent_initial}
          </Text>
        </View>
        <Text className="flex-1 text-[11px] font-bold text-foreground" numberOfLines={1}>
          {o.agent_name}
        </Text>
        <Text className="text-[9px] text-muted-foreground">
          {clockLabel(o.produced_at)}
        </Text>
      </View>
      <View
        className="h-10 rounded-lg px-2 flex-row items-center gap-1.5 overflow-hidden"
        style={{ backgroundColor: colorScheme === "dark" ? "rgba(0,0,0,0.2)" : "#FFFFFF" }}
      >
        <Svg width={40} height={28} viewBox="0 0 64 28">
          <Path d={`${d} L64 28 L0 28 Z`} fill={line} fillOpacity={0.16} />
          <Path
            d={d}
            stroke={line}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <View>
          <Text className="text-[14px] font-extrabold" style={{ color: numColor }}>
            {o.metric}
          </Text>
          <Text className="text-[8px] font-semibold text-muted-foreground">
            {o.metric_label}
          </Text>
        </View>
      </View>
      <Text className="text-[9px] font-bold text-brand">{o.kind}</Text>
      <Text className="text-[11px] font-semibold text-foreground" numberOfLines={1}>
        {o.title}
      </Text>
      {active && o.summary ? (
        <Text className="text-[10px] leading-4 text-muted-foreground" numberOfLines={2}>
          {o.summary}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function OutcomeFeed() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: outcomes = [] } = useQuery(outcomeListOptions(wsId));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return outcomes
      .filter((o) => Date.parse(o.produced_at) >= cutoff)
      .sort((a, b) => Date.parse(a.produced_at) - Date.parse(b.produced_at));
  }, [outcomes]);

  const tiles = useMemo(() => {
    if (!selectedId) return rows;
    const hit = rows.find((o) => o.id === selectedId);
    return hit ? [hit] : rows;
  }, [rows, selectedId]);

  return (
    <View className="px-4">
      <HomeSection
        title="工作成果"
        meta={
          <Text className="text-[11px] text-muted-foreground">
            过去 24h ·{" "}
            <Text className="font-bold text-foreground">{rows.length}</Text> 份
          </Text>
        }
        badge={USE_MOCK_OUTCOMES ? "示例" : undefined}
        right={
          <Pressable
            onPress={() => {
              if (wsSlug) router.push(`/${wsSlug}/reports`);
            }}
            hitSlop={8}
          >
            <Text className="text-[11px] font-medium text-brand">完整报告 ›</Text>
          </Pressable>
        }
        flush
      >
        {rows.length === 0 ? (
          <View className="px-4 py-8 items-center gap-1.5">
            <Text className="text-sm font-semibold text-foreground">
              过去 24 小时暂无产出
            </Text>
            <Text className="text-[12px] text-muted-foreground text-center">
              派单或开启定时任务后会出现在这里
            </Text>
          </View>
        ) : (
          <>
            <Heatmap
              rows={rows}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingHorizontal: 12,
                paddingBottom: 10,
              }}
            >
              {tiles.map((o) => (
                <Tile
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
