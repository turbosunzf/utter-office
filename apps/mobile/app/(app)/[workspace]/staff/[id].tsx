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

function statusLine(
  agent: Agent,
  availability: string | undefined,
  workload: string | undefined,
  ownerName: string,
): string {
  let st = "离线";
  if (workload === "working") st = "工作中";
  else if (workload === "queued") st = "排队中";
  else if (availability === "online") st = "在岗";
  else if (availability === "unstable") st = "不稳定";
  return `● ${st} · 归属 @${ownerName} · 入职 ${formatJoinDate(agent.created_at)}`;
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

function CapPlaceholder({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View className="rounded-xl border border-dashed border-border bg-secondary/40 p-3 mb-2.5">
      <Text className="text-[13px] font-semibold text-muted-foreground">
        {title}
      </Text>
      <Text className="text-[11px] text-muted-foreground mt-1 leading-[1.45]">
        {body}
      </Text>
    </View>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-card p-3 mb-2.5">
      <Text className="text-[13px] font-semibold text-foreground mb-2">
        {title}
      </Text>
      {children}
    </View>
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
  const activeCount = snapshotErr ? null : activeTasks.length;
  const rt = runtimes.find((r) => r.id === agent.runtime_id);
  const provider =
    (agent.runtime_config?.provider as string | undefined) ||
    rt?.provider ||
    "未知";

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
            <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
              {role}
            </Text>
            {handleLine ? (
              <Text className="text-[13px] text-muted-foreground mt-0.5" numberOfLines={1}>
                {handleLine}
              </Text>
            ) : null}
            <Text className="text-xs text-muted-foreground mt-1.5" numberOfLines={2}>
              {statusLine(agent, availability, workload, ownerName)}
            </Text>
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
            <View className="flex-row flex-wrap gap-2 mb-2">
              {(
                [
                  "今日终态",
                  "近 30 天运行",
                  "近 30 天失败",
                  "近 30 天失败率",
                ] as const
              ).map((l) => (
                <View
                  key={l}
                  className="w-[48%] rounded-xl border border-border bg-card p-3 items-center"
                >
                  <Text className="text-[15px] font-semibold text-muted-foreground">
                    未开放
                  </Text>
                  <Text className="text-[10px] text-muted-foreground mt-1">
                    {l}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="text-[11px] text-muted-foreground text-center mb-3">
              统计接口待接入 · 显示「未开放」而非冒充累计
            </Text>

            <Block title="在手任务">
              {snapshotErr ? (
                <Text className="text-xs text-muted-foreground">
                  无法加载在手任务
                </Text>
              ) : activeTasks.length === 0 ? (
                <Text className="text-xs text-muted-foreground">暂无在手任务</Text>
              ) : (
                activeTasks.map((t) => {
                  const issue = t.issue_id
                    ? issueById.get(t.issue_id)
                    : undefined;
                  const label = issue
                    ? `${issue.identifier} ${issue.title}`
                    : t.trigger_summary || t.kind || t.id.slice(0, 8);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() =>
                        t.issue_id ? openIssue(t.issue_id) : undefined
                      }
                      className="py-1.5 border-t border-border first:border-t-0"
                    >
                      <Text className="text-xs text-foreground" numberOfLines={2}>
                        {t.status === "running" ? "◐ " : "○ "}
                        {label} · {t.status}
                      </Text>
                    </Pressable>
                  );
                })
              )}
              {activeTasks.some((t) => t.issue_id) ? (
                <View className="flex-row flex-wrap gap-1.5 mt-2">
                  {(() => {
                    const first = activeTasks.find((t) => t.issue_id);
                    if (!first?.issue_id) return null;
                    return (
                      <>
                        <Pressable
                          onPress={() => openIssueRuns(first.issue_id)}
                          className="rounded-lg bg-brand/15 px-2.5 py-1.5"
                        >
                          <Text className="text-[11px] text-brand">
                            查看运行记录
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => openIssue(first.issue_id)}
                          className="rounded-lg bg-brand/15 px-2.5 py-1.5"
                        >
                          <Text className="text-[11px] text-brand">
                            追加评论
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => openIssueRuns(first.issue_id)}
                          className="rounded-lg bg-brand/15 px-2.5 py-1.5"
                        >
                          <Text className="text-[11px] text-brand">取消任务</Text>
                        </Pressable>
                      </>
                    );
                  })()}
                </View>
              ) : null}
            </Block>

            <Block title="最近运行">
              {recentTerminal.length === 0 ? (
                <Text className="text-xs text-muted-foreground">
                  {snapshotErr ? "暂不可用" : "暂无终态记录（仅快照窗口）"}
                </Text>
              ) : (
                recentTerminal.map((t) => {
                  const issue = t.issue_id
                    ? issueById.get(t.issue_id)
                    : undefined;
                  return (
                    <Text
                      key={t.id}
                      className="text-xs text-foreground py-1.5 border-t border-border"
                      numberOfLines={1}
                    >
                      {issue?.identifier ?? "任务"} · {t.status}
                    </Text>
                  );
                })
              )}
            </Block>

            <CapPlaceholder
              title="成长记录"
              body="暂不支持。需要后端能力变更事件流（B-6）。不会假装有「今天新增技能」时间线。"
            />
          </>
        ) : null}

        {tab === "cap" ? (
          <>
            <Block title="工位">
              {!isAgentRuntimeBound(agent) ? (
                <Text className="text-xs text-warning">未绑定 ⚠</Text>
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

            <CapPlaceholder
              title="知识库"
              body="暂不支持。StaffDeck OKF 与 ProjectResource 语义不等价，不做空壳。"
            />
            <CapPlaceholder
              title="长期记忆"
              body="暂不支持。员工目前不会跨会话记住你的偏好，每次对话都是独立上下文。"
            />
            <CapPlaceholder
              title="定时任务"
              body="暂不支持。主动工作（B-5）确认 REST 可用性后再做。页头「定时」显示「未开放」，不是 0。"
            />
            <CapPlaceholder
              title="SOP"
              body="暂不支持。领域不匹配（工程事项 ≠ 审批流状态机）。"
            />
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
