/**
 * Shared AgentTask status vocabulary for the agent-runs surfaces. Extracted
 * from `components/issue/run-row.tsx` so the run transcript (and any future
 * run surface) reuses the exact same labels / colours / failure mapping —
 * extend this module, don't fork copies.
 */
import type { AgentTask } from "@multica/core/types";

/** Canonical fallback summary for a task with no `trigger_summary`. */
export function fallbackSummary(task: AgentTask): string {
  switch (task.kind) {
    case "comment":
      return "Comment task";
    case "autopilot":
      return "Autopilot run";
    case "chat":
      return "Chat task";
    case "quick_create":
      return "Quick create";
    case "direct":
    default:
      return "Task";
  }
}

/** Task statuses treated as "active" (an in-flight run with a Cancel). */
export const ACTIVE_STATUSES: readonly AgentTask["status"][] = [
  "queued",
  "dispatched",
  "running",
];

export const STATUS_LABEL: Record<AgentTask["status"], string> = {
  queued: "排队中",
  dispatched: "启动中",
  waiting_local_directory: "等待目录",
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

export const STATUS_CLASS: Record<AgentTask["status"], string> = {
  queued: "text-muted-foreground",
  dispatched: "text-brand",
  waiting_local_directory: "text-muted-foreground",
  running: "text-brand",
  completed: "text-muted-foreground",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
};

// Short badge copy — deliberately terser than lib/failure-reason-label.ts,
// which backs a full-width chat bubble; this one shares a single line with the
// status word and a timestamp.
//
// Keyed by the raw wire value, not a closed enum: `failure_reason` is an open
// string that grows as classifier rules land. It held only the six
// pre-MUL-1949 coarse values until MUL-5370, so every refined `agent_error.*`
// the backend has written since fell through and the badge read just "Failed".
// An unrecognised reason still does — a compact badge is the one place where
// web's raw-wire-value fallback would overflow the row.
export const FAILURE_REASON_LABEL: Record<string, string> = {
  queued_expired: "Queue expired",
  runtime_offline: "Runtime offline",
  runtime_recovery: "Runtime recovery",
  timeout: "Timeout",
  iteration_limit: "Iteration limit",
  agent_blocked: "Needs input",
  api_invalid_request: "Request rejected",
  skill_bundle_unavailable: "Skill download failed",

  "agent_error.provider_auth_or_access": "Auth failed",
  "agent_error.provider_quota_limit": "Quota exhausted",
  "agent_error.provider_capacity_or_rate_limit": "Rate limited",
  "agent_error.provider_server_error": "Provider error",
  "agent_error.provider_network": "Network error",
  "agent_error.process_failure": "Process crashed",
  "agent_error.empty_or_unparseable_output": "No usable output",
  "agent_error.agent_timeout": "Agent timeout",
  "agent_error.context_overflow": "Context overflow",
  "agent_error.missing_config": "Config missing",
  "agent_error.model_not_found_or_unavailable": "Model unavailable",
  "agent_error.runtime_version_unsupported": "CLI unsupported",
  "agent_error.runtime_missing_executable": "CLI not installed",
  "agent_error.unknown": "Agent error",

  agent_error: "Agent error",
  codex_semantic_inactivity: "Codex inactivity",
  manual: "Manual",
};
