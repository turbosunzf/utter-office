/**
 * Staff profile — `/{slug}/staff/[id]` (PRD §7.6 / prototype 08).
 * Header + 3 tabs: 工作记录 / 能力 / 会话. KPI stays —— until B-9.
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import type { Agent } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { agentListOptions } from "@/data/queries/agents";
import { agentTaskSnapshotOptions } from "@/data/queries/agent-task-snapshot";
import { chatSessionsOptions } from "@/data/queries/chat";
import { issueListOptions } from "@/data/queries/issues";
import { runtimeListOptions } from "@/data/queries/runtimes";
import { useActorLookup } from "@/data/use-actor-name";
import { useChatSessionPickerStore } from "@/data/stores/chat-session-picker-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { isAgentRuntimeBound } from "@/lib/is-agent-runtime-bound";
import {
  listAgentTools,
  resolveToolCount,
  skillCountLabel,
} from "@/lib/agent-tool-counts";
import { useAgentPresence } from "@/lib/use-agent-presence";
import { cn } from "@/lib/utils";

const ACTIVE = new Set([
  "queued",
  "dispatched",
  "waiting_local_directory",
  "running",
]);

type Tab = "work" | "cap" | "sess";

function formatJoinDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

const TASK_STATUS_ZH: Record<string, string> = {
  queued: "排队中",
  dispatched: "已派发",
  waiting_local_directory: "等待工位",
  running: "运行中",
  completed: "完成",
  failed: "失败",
  cancelled: "已取消",
};

function skillNames(agent: Agent): string[] {
  return (agent.skills ?? []).map((s, i) => {
    if (typeof s === "object" && s && "name" in s) {
      return String((s as { name?: string }).name ?? `skill-${i}`);
    }
    return String(s);
  });
}

function relativeDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 3600_000) return "刚刚";
  if (diff < 24 * 3600_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 48 * 3600_000) return "昨天";
  return `${Math.floor(diff / 86400_000)} 天前`;
}

function statusLine(
  agent: Agent,
  availability: string | undefined,
  workload: string | undefined,
  ownerName: string,
): { label: string; live: boolean } {
  let st = "离线";
  let live = false;
  if (workload === "working") {
    st = "工作中";
    live = true;
  } else if (workload === "queued") st = "排队中";
  else if (availability === "online") {
    st = "在岗";
    live = true;
  } else if (availability === "unstable") st = "不稳定";
  return {
    label: `${st} · @${ownerName} · 入职 ${formatJoinDate(agent.created_at)}`,
    live,
  };
}

function firstSentence(text: string | undefined | null): string {
  if (!text) return "";
  const t = text.trim();
  if (!t) return "";
  const m = t.match(/^[^。！？.!?\n]+/);
  return (m?.[0] ?? t).trim();
}

function roleTitle(agent: Agent): string {
  const s = firstSentence(agent.description);
  if (s && s.length <= 20 && !/[；;]/.test(s)) return s;
  return agent.name;
}

function Block({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-card p-3 mb-2.5">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[13px] font-semibold text-foreground">
          {title}
        </Text>
        {extra}
      </View>
      {children}
    </View>
  );
}

function KpiCell({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "good" | "bad";
}) {
  const bg =
    tone === "good"
      ? "bg-[#ECFDF5] border-[#D1FAE5]"
      : tone === "bad"
        ? "bg-[#FEF2F2] border-[#FECACA]"
        : "bg-card border-border";
  const valueColor =
    tone === "good"
      ? "text-[#059669]"
      : tone === "bad"
        ? "text-[#DC2626]"
        : "text-muted-foreground";
  return (
    <View className={cn("flex-1 rounded-xl border p-3 items-center", bg)}>
      <Text className={cn("text-[20px] font-bold leading-[1.15]", valueColor)}>
        {value}
      </Text>
      <Text className="text-[11px] text-muted-foreground mt-1">{label}</Text>
    </View>
  );
}

function AssetCard({
  title,
  count,
  body,
  empty,
  dark,
  onPress,
}: {
  title: string;
  count: string;
  body?: string;
  empty?: string;
  dark?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <View className="flex-row items-center justify-between">
        <Text
          className={cn(
            "text-xs font-semibold",
            dark ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </Text>
        <Text
          className={cn(
            "text-sm",
            dark ? "text-white/40" : "text-muted-foreground",
          )}
        >
          ›
        </Text>
      </View>
      <Text
        className={cn(
          "text-2xl font-bold mt-1.5 mb-2 leading-none",
          dark ? "text-white" : "text-foreground",
        )}
      >
        {count}
      </Text>
      {empty ? (
        <Text
          className={cn(
            "text-xs flex-1",
            dark ? "text-white/50" : "text-muted-foreground",
          )}
        >
          {empty}
        </Text>
      ) : (
        <Text
          className={cn(
            "text-[11px] leading-[1.5] flex-1",
            dark ? "text-white/60" : "text-muted-foreground",
          )}
          numberOfLines={3}
        >
          {body}
        </Text>
      )}
    </>
  );

  if (dark) {
    return (
      <Pressable onPress={onPress} disabled={!onPress} className="flex-1 min-h-[108px]">
        <LinearGradient
          colors={["#1A1F36", "#151A2E"]}
          className="flex-1 rounded-xl p-3 min-h-[108px]"
          style={{ borderRadius: 12, padding: 12, minHeight: 108, flex: 1 }}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-1 min-h-[108px] rounded-xl border border-border bg-card p-3"
    >
      {inner}
    </Pressable>
  );
}

export default function StaffProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const [tab, setTab] = useState<Tab>("work");
  const { getName } = useActorLookup();
  const requestAgentFocus = useChatSessionPickerStore(
    (s) => s.requestAgentFocus,
  );

  const { data: agents = [], isPending } = useQuery(agentListOptions(wsId));
  const agent = agents.find((a) => a.id === id) ?? null;
  const presence = useAgentPresence(wsId, id);
  const { data: snapshot = [], isError: snapshotErr } = useQuery(
    agentTaskSnapshotOptions(wsId),
  );
  const { data: sessions = [] } = useQuery(chatSessionsOptions(wsId));
  const { data: issues = [] } = useQuery(issueListOptions(wsId));
  const { data: runtimes = [] } = useQuery(runtimeListOptions(wsId));

  const activeTasks = useMemo(
    () =>
      snapshot.filter((t) => t.agent_id === id && ACTIVE.has(t.status)),
    [snapshot, id],
  );

  const recentTerminal = useMemo(
    () =>
      snapshot
        .filter(
          (t) =>
            t.agent_id === id &&
            (t.status === "completed" ||
              t.status === "failed" ||
              t.status === "cancelled"),
        )
        .slice(0, 5),
    [snapshot, id],
  );

  const agentSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.agent_id === id && s.status !== "archived")
        .slice(0, 20),
    [sessions, id],
  );

  const issueById = useMemo(() => {
    const m = new Map(issues.map((i) => [i.id, i]));
    return m;
  }, [issues]);

  const activity = useMemo(() => {
    const now = Date.now();
    const windowStart = now - 24 * 3600_000;
    const slot = 2 * 3600_000;
    const buckets = Array.from({ length: 12 }, () => 0);
    const add = (iso?: string | null) => {
      if (!iso) return;
      const ts = Date.parse(iso);
      if (Number.isNaN(ts) || ts < windowStart) return;
      const i = Math.min(11, Math.floor((ts - windowStart) / slot));
      buckets[i] += 1;
    };
    agentSessions.forEach((s) => add(s.updated_at));
    snapshot
      .filter((t) => t.agent_id === id)
      .forEach((t) => add(t.started_at ?? t.created_at));
    const max = Math.max(1, ...buckets);
    const peakVal = Math.max(...buckets);
    return {
      bars: buckets.map((c) => Math.max(0.08, c / max)),
      on: buckets.map((c) => c > 0 && c === peakVal),
      has: buckets.some((c) => c > 0),
    };
  }, [agentSessions, snapshot, id]);

  if (isPending) {
    return (
      <View className="flex-1 p-4 gap-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </View>
    );
  }

  if (!agent) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-muted-foreground">找不到该数字员工</Text>
      </View>
    );
  }

  const availability =
    presence === "loading" ? undefined : presence.availability;
  const workload = presence === "loading" ? undefined : presence.workload;
  const ownerName = agent.owner_id
    ? getName("member", agent.owner_id)
    : "—";
  const tools = resolveToolCount(agent);
  const toolList = listAgentTools(agent);
  const skills = skillNames(agent);
  const activeCount = snapshotErr ? null : activeTasks.length;
  const rt = runtimes.find((r) => r.id === agent.runtime_id);
  const provider =
    (agent.runtime_config?.provider as string | undefined) ||
    rt?.provider ||
    "未知";
  const st = statusLine(agent, availability, workload, ownerName);

  const todayLabel = `${new Date().getMonth() + 1}.${new Date().getDate()} · 日`;

  const openChat = () => {
    if (!wsSlug) return;
    requestAgentFocus(agent.id);
    router.navigate(`/${wsSlug}/workbench`);
  };

  const openDispatch = () => {
    if (!wsSlug) return;
    router.push({
      pathname: "/[workspace]/staff-picker",
      params: { workspace: wsSlug, intent: "dispatch" },
    });
  };

  const openIssueRuns = (issueId: string) => {
    if (!wsSlug || !issueId) return;
    router.push({
      pathname: "/[workspace]/issue/[id]/runs",
      params: { workspace: wsSlug, id: issueId },
    });
  };

  const openIssue = (issueId: string) => {
    if (!wsSlug || !issueId) return;
    router.push(`/${wsSlug}/issue/${issueId}`);
  };

  const role = roleTitle(agent);
  const handleLine =
    role === agent.name
      ? [agent.model].filter(Boolean).join(" · ")
      : agent.name;

  return (
    <View className="flex-1 bg-background">
      <View className="bg-card border-b border-border px-4 pt-3 pb-3.5">
        <View className="flex-row gap-3 items-start">
          <ActorAvatar type="agent" id={agent.id} size={64} showPresence />
          <View className="flex-1 min-w-0">
            <Text className="text-[20px] font-bold text-foreground" numberOfLines={1}>
              {role}
            </Text>
            {handleLine ? (
              <Text className="text-[13px] text-muted-foreground mt-0.5" numberOfLines={1}>
                {handleLine}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
              <View
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: st.live ? "#3B6FFF" : "#94A3B8",
                }}
              />
              <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                {st.label}
              </Text>
            </View>
          </View>
        </View>
        {agent.description ? (
          <Text
            className="text-[13px] text-foreground mt-3 leading-[1.55]"
            numberOfLines={3}
          >
            {agent.description}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap gap-1.5 mt-3">
          <View className="rounded-lg bg-secondary px-2.5 py-1">
            <Text className="text-[11px] font-semibold">
              {skillCountLabel(agent)} 技能
            </Text>
          </View>
          <View className="rounded-lg bg-secondary px-2.5 py-1">
            <Text
              className={cn(
                "text-[11px] font-semibold",
                tools.kind !== "count" && "text-muted-foreground",
              )}
            >
              {tools.kind === "count" ? `${tools.label} 工具` : `${tools.label} 工具`}
            </Text>
          </View>
          <View className="rounded-lg bg-secondary px-2.5 py-1">
            <Text
              className={cn(
                "text-[11px] font-semibold",
                activeCount == null && "text-muted-foreground",
              )}
            >
              {activeCount == null ? "—" : String(activeCount)} 在手
            </Text>
          </View>
          <View className="rounded-lg bg-secondary px-2.5 py-1">
            <Text className="text-[11px] font-semibold text-muted-foreground">
              — 定时
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2 mt-3.5">
          <Pressable
            onPress={openChat}
            className="flex-1 h-10 rounded-[10px] bg-brand items-center justify-center active:opacity-80"
          >
            <Text className="text-sm font-semibold text-white">去对话</Text>
          </Pressable>
          <Pressable
            onPress={openDispatch}
            className="flex-1 h-10 rounded-[10px] bg-brand/15 items-center justify-center active:opacity-80"
          >
            <Text className="text-sm font-semibold text-brand">派单给他</Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row bg-card border-b border-border">
        {(
          [
            ["work", "工作记录"],
            ["cap", "能力"],
            ["sess", "会话"],
          ] as const
        ).map(([k, label]) => (
          <Pressable
            key={k}
            onPress={() => setTab(k)}
            className={cn(
              "flex-1 items-center py-3 border-b-2",
              tab === k ? "border-brand" : "border-transparent",
            )}
          >
            <Text
              className={cn(
                "text-[13px]",
                tab === k
                  ? "text-brand font-semibold"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-3 pb-12"
      >
        {tab === "work" ? (
          <>
            <View className="flex-row gap-2 mb-2">
              <KpiCell value="——" label="今日终态" />
              <KpiCell value="——" label="近 30 天运行" />
            </View>
            <View className="flex-row gap-2 mb-2">
              <KpiCell value="——" label="近 30 天失败" />
              <KpiCell value="——" label="近 30 天失败率" />
            </View>
            <Text className="text-[11px] text-muted-foreground text-center mb-3">
              统计接口待接入 · 不冒充累计
            </Text>

            <Block
              title="今日活动"
              extra={
                <Text className="text-xs font-medium text-brand">{todayLabel}</Text>
              }
            >
              <Text className="text-[11px] text-muted-foreground mb-2">
                {activity.has ? "按小时分布 · 会话与运行落点" : "近 24h 暂无活动落点"}
              </Text>
              <View className="flex-row items-end gap-[3px] h-14 mb-2">
                {activity.bars.map((h, i) => (
                  <View
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${h * 100}%`,
                      minHeight: 4,
                      backgroundColor: activity.on[i]
                        ? "#3B6FFF"
                        : activity.has
                          ? "rgba(59,111,255,0.18)"
                          : "rgba(59,111,255,0.1)",
                    }}
                  />
                ))}
              </View>
            </Block>

            <Block title="在手任务">
              {snapshotErr ? (
                <Text className="text-xs text-muted-foreground">
                  无法加载在手任务
                </Text>
              ) : activeTasks.length === 0 ? (
                <Text className="text-xs text-muted-foreground">暂无在手任务</Text>
              ) : (
                activeTasks.map((t, idx) => {
                  const issue = t.issue_id
                    ? issueById.get(t.issue_id)
                    : undefined;
                  const stZh = TASK_STATUS_ZH[t.status] ?? t.status;
                  return (
                    <View
                      key={t.id}
                      className={cn("py-2.5", idx > 0 && "border-t border-border")}
                    >
                      {issue ? (
                        <Text className="text-[11px] font-bold text-brand">
                          {issue.identifier}
                        </Text>
                      ) : null}
                      <Text className="text-[13px] font-semibold mt-0.5" numberOfLines={2}>
                        {issue?.title ||
                          t.trigger_summary ||
                          t.kind ||
                          t.id.slice(0, 8)}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground mt-0.5">
                        {stZh}
                        {t.status === "running" ? " · 进行中" : ""}
                      </Text>
                      {t.issue_id ? (
                        <View className="flex-row flex-wrap gap-1.5 mt-2">
                          <Pressable
                            onPress={() => openIssueRuns(t.issue_id)}
                            className="rounded-lg bg-brand/15 px-2.5 py-1"
                          >
                            <Text className="text-[11px] text-brand">看运行</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => openIssue(t.issue_id)}
                            className="rounded-lg bg-brand/15 px-2.5 py-1"
                          >
                            <Text className="text-[11px] text-brand">评论</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => openIssueRuns(t.issue_id)}
                            className="rounded-lg bg-brand/15 px-2.5 py-1"
                          >
                            <Text className="text-[11px] text-brand">取消</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </Block>

            <Block title="最近运行">
              {recentTerminal.length === 0 ? (
                <Text className="text-xs text-muted-foreground">
                  {snapshotErr ? "暂不可用" : "暂无终态记录（仅快照窗口）"}
                </Text>
              ) : (
                recentTerminal.map((t, idx) => {
                  const issue = t.issue_id
                    ? issueById.get(t.issue_id)
                    : undefined;
                  const ok = t.status === "completed";
                  return (
                    <View
                      key={t.id}
                      className={cn(
                        "flex-row items-center gap-2 py-2",
                        idx > 0 && "border-t border-border",
                      )}
                    >
                      <View
                        className={cn(
                          "rounded px-1.5 py-0.5",
                          ok ? "bg-[#ECFDF5]" : "bg-[#FEF2F2]",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-[10px] font-bold",
                            ok ? "text-[#059669]" : "text-[#DC2626]",
                          )}
                        >
                          {TASK_STATUS_ZH[t.status] ?? t.status}
                        </Text>
                      </View>
                      <Text className="flex-1 text-xs" numberOfLines={1}>
                        {issue
                          ? `${issue.identifier} ${issue.title}`
                          : t.trigger_summary || "任务"}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        {relativeDay(t.completed_at ?? t.created_at)}
                      </Text>
                    </View>
                  );
                })
              )}
            </Block>

            <Block title="成长记录">
              <Text className="text-[11px] text-muted-foreground mb-2">
                暂不支持。需要后端能力变更事件流（B-6）。
              </Text>
              <View className="flex-row pt-1 pb-1">
                {["—", "—", "—"].map((d, i) => (
                  <View key={i} className="flex-1 items-center px-1">
                    <View className="w-full h-0.5 bg-border absolute top-[4px]" />
                    <View className="size-2.5 rounded-full bg-border z-10 mb-2" />
                    <Text className="text-[11px] font-bold text-muted-foreground">
                      {d}
                    </Text>
                  </View>
                ))}
              </View>
            </Block>

            <Text className="text-xs font-semibold text-muted-foreground mb-2 mt-1">
              能力资产
            </Text>
            <View className="flex-row gap-2 mb-2">
              <AssetCard
                title="技能"
                count={String(skills.length)}
                body={skills.slice(0, 6).join(" / ") || undefined}
                empty={skills.length === 0 ? "暂无" : undefined}
                onPress={() => setTab("cap")}
              />
              <AssetCard
                title="工具"
                count={tools.kind === "count" ? tools.label : "—"}
                body={
                  toolList.mode === "list"
                    ? toolList.entries
                        .slice(0, 4)
                        .map((e) => e.name)
                        .join(" / ")
                    : tools.kind === "configured"
                      ? "已配置"
                      : undefined
                }
                empty={
                  toolList.mode === "empty" || toolList.mode === "unknown"
                    ? tools.label
                    : undefined
                }
                onPress={() => setTab("cap")}
              />
            </View>
            <View className="flex-row gap-2 mb-2">
              <AssetCard title="知识库" count="—" empty="暂不支持" />
              <AssetCard title="定时任务" count="—" empty="暂无启用" dark />
            </View>
          </>
        ) : null}

        {tab === "cap" ? (
          <>
            <Block title="工位">
              {!isAgentRuntimeBound(agent) ? (
                <View
                  className="flex-row items-center gap-1.5 rounded-lg px-2.5 py-2"
                  style={{ backgroundColor: "rgba(245,158,11,0.12)" }}
                >
                  <Text className="text-[13px] text-[#A16207]">
                    ⚠ 未绑定 · 任务无法执行
                  </Text>
                </View>
              ) : (
                <>
                  <Text className="text-xs text-foreground py-1">
                    provider · {provider}
                  </Text>
                  <Text className="text-xs text-foreground py-1 border-t border-border">
                    runtime_mode ·{" "}
                    {agent.runtime_mode === "cloud"
                      ? "云端"
                      : agent.runtime_mode === "local"
                        ? "本地"
                        : agent.runtime_mode}{" "}
                    · {availability === "online" ? "在线" : "离线/未知"}
                  </Text>
                </>
              )}
            </Block>

            <Block title="模型与参数">
              <Text className="text-xs text-foreground py-1">
                模型 · {agent.model || "默认租户模型"}
              </Text>
              <Text className="text-xs text-foreground py-1 border-t border-border">
                thinking · {agent.thinking_level || "—"}
              </Text>
            </Block>

            <Block title="技能">
              {(agent.skills?.length ?? 0) === 0 ? (
                <Text className="text-xs text-muted-foreground">暂无技能</Text>
              ) : (
                <View className="flex-row flex-wrap">
                  {agent.skills.map((s, i) => {
                    const name =
                      typeof s === "object" && s && "name" in s
                        ? String((s as { name?: string }).name ?? "skill")
                        : String(s);
                    return (
                      <View
                        key={`${name}-${i}`}
                        className="rounded-md bg-brand/15 px-2 py-1 mr-1 mb-1"
                      >
                        <Text className="text-[11px] text-brand">{name}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Block>

            <Block title="工具">
              {toolList.mode === "redacted" ? (
                <Text className="text-xs text-muted-foreground">
                  已配置，无权限查看详情
                </Text>
              ) : toolList.mode === "unknown" ? (
                <Text className="text-xs text-muted-foreground">
                  工具详情未知 · 接口未返回配置
                </Text>
              ) : toolList.mode === "empty" ? (
                <Text className="text-xs text-muted-foreground">未配置工具</Text>
              ) : (
                toolList.entries.map((e) => (
                  <View
                    key={e.id}
                    className="py-2 border-t border-border first:border-t-0"
                  >
                    <Text className="text-xs text-foreground">
                      {e.name}{" "}
                      <Text className="text-[10px] text-muted-foreground bg-secondary">
                        {e.kind === "mcp" ? "MCP" : "toolkit"}
                      </Text>
                    </Text>
                    <Text className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {e.id}
                    </Text>
                  </View>
                ))
              )}
            </Block>

            <Block title="权限">
              <Text className="text-xs text-foreground py-1">
                visibility · {String(agent.visibility)}
              </Text>
              <Text className="text-xs text-foreground py-1 border-t border-border">
                permission_mode · {agent.permission_mode}
              </Text>
            </Block>

            <View className="flex-row gap-2 mb-2">
              <AssetCard title="知识库" count="—" empty="暂不支持" />
              <AssetCard title="长期记忆" count="—" empty="暂不支持" />
            </View>
            <View className="flex-row gap-2">
              <AssetCard title="定时任务" count="—" empty="暂无启用" dark />
              <AssetCard title="SOP" count="—" empty="暂不支持" />
            </View>
          </>
        ) : null}

        {tab === "sess" ? (
          <Block title="该员工的会话">
            {agentSessions.length === 0 ? (
              <Text className="text-xs text-muted-foreground">暂无会话</Text>
            ) : (
              agentSessions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    useChatSessionPickerStore.getState().requestSelect(s.id);
                    requestAgentFocus(agent.id);
                    if (wsSlug) router.navigate(`/${wsSlug}/workbench`);
                  }}
                  className="flex-row items-center gap-2.5 py-2.5 border-t border-border"
                >
                  {s.has_unread ? (
                    <View className="size-2 rounded-full bg-destructive" />
                  ) : (
                    <View className="size-2" />
                  )}
                  <Text
                    className="flex-1 text-xs text-foreground"
                    numberOfLines={1}
                  >
                    {s.title || "未命名会话"}
                  </Text>
                  <Text className="text-muted-foreground">›</Text>
                </Pressable>
              ))
            )}
          </Block>
        ) : null}
      </ScrollView>
    </View>
  );
}
