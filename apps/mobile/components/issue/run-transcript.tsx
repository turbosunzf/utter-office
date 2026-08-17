/**
 * Run transcript — a single AgentTask's execution log, shown in the
 * `issue/[id]/runs/[taskId]` formSheet. Header (agent + status + trigger),
 * then the process steps via the shared `ChatTimeline`, then the text rows as
 * Markdown, then the terminal result / error, then privacy-safe meta
 * (relative work dir, token usage).
 *
 * All status / failure vocabulary comes from `./task-status` — the same
 * source as the runs list — never fork a second mapping.
 *
 * Privacy: only `relative_work_dir` is ever shown (the server has stripped
 * home prefixes / usernames); the raw `work_dir` is never rendered.
 */
import { useMemo } from "react";
import { View } from "react-native";
import type {
  AgentTask,
  TaskMessagePayload,
  TaskUsage,
} from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { Markdown } from "@/lib/markdown";
import { ChatTimeline } from "@/components/chat/chat-timeline";
import { useActorLookup } from "@/data/use-actor-name";
import { timeAgo } from "@/lib/time-ago";
import {
  FAILURE_REASON_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  fallbackSummary,
} from "./task-status";

interface Props {
  task: AgentTask;
  messages: TaskMessagePayload[];
}

export function RunTranscript({ task, messages }: Props) {
  const { getName } = useActorLookup();

  const ordered = useMemo(
    () => [...messages].sort((a, b) => a.seq - b.seq),
    [messages],
  );
  const textRows = ordered.filter((m) => m.type === "text");

  const summary = task.trigger_summary?.trim() || fallbackSummary(task);
  const statusLabel = STATUS_LABEL[task.status] ?? task.status;
  const statusCls = STATUS_CLASS[task.status] ?? "text-muted-foreground";
  const failureReason =
    task.status === "failed" && task.failure_reason
      ? FAILURE_REASON_LABEL[task.failure_reason]
      : undefined;

  return (
    <View className="gap-4 px-4 pb-8">
      {/* Header: agent + status + when it finished. */}
      <View className="flex-row items-center gap-3 pt-2">
        <ActorAvatar type="agent" id={task.agent_id} size={36} showPresence />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">
            {getName("agent", task.agent_id)}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className={`text-xs ${statusCls}`}>
              {failureReason ? `${statusLabel} · ${failureReason}` : statusLabel}
            </Text>
            {task.completed_at ? (
              <Text className="text-xs text-muted-foreground">
                {timeAgo(task.completed_at)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Trigger — the handoff instruction / comment text that started this run. */}
      <View className="gap-1">
        <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Trigger
        </Text>
        <Text className="text-sm text-foreground">{summary}</Text>
        {task.handoff_note ? (
          <Text className="text-xs text-muted-foreground">
            Handoff: {task.handoff_note}
          </Text>
        ) : null}
      </View>

      {/* Execution log: process steps (ChatTimeline) + text rows (Markdown). */}
      {ordered.length > 0 ? (
        <View className="gap-2">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Execution
          </Text>
          <ChatTimeline items={ordered} />
          {textRows.map((m) => (
            <Markdown
              key={`${m.task_id}-${m.seq}`}
              content={m.content ?? ""}
            />
          ))}
        </View>
      ) : null}

      <TerminalState task={task} />
      <MetaRows task={task} />
    </View>
  );
}

function TerminalState({ task }: { task: AgentTask }) {
  if (task.status === "failed") {
    return (
      <View className="gap-1">
        <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Result
        </Text>
        <Text className="text-sm text-destructive">
          {task.error || "Task failed."}
        </Text>
      </View>
    );
  }
  if (task.status === "completed") {
    const result = formatResult(task.result);
    if (!result) return null;
    return (
      <View className="gap-1">
        <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Result
        </Text>
        <Text className="text-sm text-foreground">{result}</Text>
      </View>
    );
  }
  return null;
}

function formatResult(result: unknown): string | null {
  if (result == null) return null;
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function MetaRows({ task }: { task: AgentTask }) {
  const usage = task.usage;
  const rows: { label: string; value: string }[] = [];

  if (task.relative_work_dir) {
    rows.push({ label: "Working directory", value: task.relative_work_dir });
  }

  // Usage semantics (core type doc): `undefined` (old backend) and `[]`
  // (hydrated, no recorded usage) both mean "no number to show" — render an
  // em dash, never 0. A run that predates usage reporting was not free.
  rows.push({ label: "Tokens", value: usageTokens(usage) });

  return (
    <View className="gap-1">
      <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Details
      </Text>
      {rows.map((r) => (
        <View key={r.label} className="flex-row justify-between gap-3">
          <Text className="text-sm text-muted-foreground">{r.label}</Text>
          <Text className="flex-1 text-right text-sm text-foreground">
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function usageTokens(usage: TaskUsage[] | undefined): string {
  if (!Array.isArray(usage) || usage.length === 0) return "—";
  const total = usage.reduce(
    (sum, u) =>
      sum +
      (u.input_tokens || 0) +
      (u.output_tokens || 0) +
      (u.cache_read_tokens || 0) +
      (u.cache_write_tokens || 0),
    0,
  );
  return String(total);
}
