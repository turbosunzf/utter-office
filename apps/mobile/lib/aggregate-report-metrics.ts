/**
 * Client-side workspace issue aggregation for the home report card (PRD §4.4).
 * Runtime / tokens / failures stay —— without dashboard endpoints.
 */
import type { Issue, IssueStatus } from "@multica/core/types";
import type { ReportPeriod } from "@/data/stores/home-view-store";

export interface ReportMetrics {
  period: ReportPeriod;
  created: number | null;
  completed: number | null;
  runtimeLabel: string;
  tokensLabel: string;
  inProgress: number | null;
  inReview: number | null;
  blocked: number | null;
  backlog: number | null;
  todo: number | null;
  openTotal: number | null;
  /** Last 7 calendar days completed counts (oldest → newest). */
  dailyCompleted: number[] | null;
  failedLabel: string;
  partialNote: string | null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function periodRange(period: ReportPeriod, now = new Date()): { from: Date; to: Date } {
  const to = now;
  const from = startOfDay(now);
  if (period === "week") {
    from.setDate(from.getDate() - 6);
  } else if (period === "month") {
    from.setDate(1);
  }
  return { from, to };
}

function inRange(iso: string | null | undefined, from: Date, to: Date): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t >= from.getTime() && t <= to.getTime();
}

const OPEN: IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
];

export function aggregateReportMetrics(
  issues: Issue[] | undefined,
  period: ReportPeriod,
  opts?: { issuesReady?: boolean },
): ReportMetrics {
  const runtimeLabel = "暂无";
  const tokensLabel = "暂无";
  const failedLabel = "暂无";
  const partialNote = "部分统计接口未上线 · 运行时长 / Tokens / 失败暂不可用";

  if (!opts?.issuesReady || issues == null) {
    return {
      period,
      created: null,
      completed: null,
      runtimeLabel,
      tokensLabel,
      inProgress: null,
      inReview: null,
      blocked: null,
      backlog: null,
      todo: null,
      openTotal: null,
      dailyCompleted: null,
      failedLabel,
      partialNote,
    };
  }

  const { from, to } = periodRange(period);
  let created = 0;
  let completed = 0;
  let inProgress = 0;
  let inReview = 0;
  let blocked = 0;
  let backlog = 0;
  let todo = 0;
  let openTotal = 0;

  const dayStarts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - i);
    dayStarts.push(d.getTime());
  }
  const dailyCompleted = [0, 0, 0, 0, 0, 0, 0];

  for (const issue of issues) {
    if (inRange(issue.created_at, from, to)) created += 1;
    if (issue.status === "done" && inRange(issue.updated_at, from, to)) {
      completed += 1;
    }
    if (issue.status === "done" && issue.updated_at) {
      const t = Date.parse(issue.updated_at);
      if (!Number.isNaN(t)) {
        for (let i = 0; i < 7; i++) {
          const start = dayStarts[i];
          const end = start + 86_400_000;
          if (t >= start && t < end) {
            dailyCompleted[i] += 1;
            break;
          }
        }
      }
    }
    if (OPEN.includes(issue.status)) {
      openTotal += 1;
      if (issue.status === "in_progress") inProgress += 1;
      if (issue.status === "in_review") inReview += 1;
      if (issue.status === "blocked") blocked += 1;
      if (issue.status === "backlog") backlog += 1;
      if (issue.status === "todo") todo += 1;
    }
  }

  return {
    period,
    created,
    completed,
    runtimeLabel,
    tokensLabel,
    inProgress,
    inReview,
    blocked,
    backlog,
    todo,
    openTotal,
    dailyCompleted,
    failedLabel,
    partialNote,
  };
}

export function formatMetric(n: number | null): string {
  return n == null ? "…" : String(n);
}

/** Soft label for metrics that have no data source yet (avoid bare ——). */
export function formatPendingMetric(label: string): string {
  return label === "——" || label === "" ? "暂无" : label;
}
