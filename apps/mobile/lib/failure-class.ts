/**
 * Mobile mirror of `packages/core/dashboard/failure-class.ts` — kept
 * behaviorally identical so the 看板 (board) failure rollup folds reasons
 * into the same seven display classes web uses. Mirrored (not imported)
 * because `@multica/core/dashboard/failure-class` is not in the core
 * package's `exports` map; the mobile whitelist only admits `@multica/core`
 * subpaths that are explicitly exported, and `dashboard/index.ts` re-exports
 * the query module (which drags in the core ApiClient) — the exact runtime
 * coupling mobile avoids. When the source map changes upstream, port it here.
 *
 * `failure_reason` carries the backend's canonical failure taxonomy (the
 * 22 `taskfailure.Reason` values plus `"unclassified"`) EXCEPT the empty
 * string, which is the *succeeded* bucket in the failure rollups. Callers
 * must not pass `""` through — it resolves to "other" so a leaked one lands
 * in a visible bucket instead of silently corrupting the error rate.
 */
export const FAILURE_CLASSES = [
  "auth",
  "rate_limit",
  "timeout",
  "provider",
  "runtime",
  "agent",
  "other",
] as const;

export type FailureClass = (typeof FAILURE_CLASSES)[number];

// Reason → class. Keys are the wire values written by the backend, plus the
// "unclassified" sentinel and pre-MUL-1949 coarse values. Anything absent
// falls through to "other" — including a reason from a backend newer than
// this client.
const REASON_CLASS: Record<string, FailureClass> = {
  "agent_error.provider_auth_or_access": "auth",
  "agent_error.missing_config": "auth",

  "agent_error.provider_capacity_or_rate_limit": "rate_limit",
  "agent_error.provider_quota_limit": "rate_limit",

  timeout: "timeout",
  "agent_error.agent_timeout": "timeout",
  codex_semantic_inactivity: "timeout",

  "agent_error.provider_server_error": "provider",
  "agent_error.provider_network": "provider",
  "agent_error.model_not_found_or_unavailable": "provider",
  api_invalid_request: "provider",

  runtime_offline: "runtime",
  runtime_recovery: "runtime",
  queued_expired: "runtime",
  "agent_error.runtime_missing_executable": "runtime",
  "agent_error.runtime_version_unsupported": "runtime",
  skill_bundle_unavailable: "runtime",

  "agent_error.process_failure": "agent",
  codex_resume_oversized: "agent",
  "agent_error.empty_or_unparseable_output": "agent",
  "agent_error.context_overflow": "agent",
  iteration_limit: "agent",
  agent_blocked: "agent",

  "agent_error.unknown": "other",
  agent_error: "other",
  manual: "other",
  unclassified: "other",
};

/**
 * Fold a raw `failure_reason` into its display class. Unknown reasons — including
 * ones a newer backend introduced — resolve to "other" rather than being dropped,
 * so class totals always reconcile with the raw failure count.
 */
export function failureClassOf(reason: string): FailureClass {
  return REASON_CLASS[reason] ?? "other";
}
