/**
 * Work outcomes mock (B 类 · PRD §4.4).
 * 对应后续 B-5 / Run 产物回流；真源接入后删除本文件。
 */

export type OutcomeType =
  | "分析结论"
  | "日报摘要"
  | "新闻摘要"
  | "事项交付";

export interface WorkOutcome {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_title: string;
  agent_initial: string;
  agent_color: string;
  type: OutcomeType;
  title: string;
  summary: string;
  produced_at: string;
  /** Optional deep link target when wired */
  issue_id: string | null;
  brief_id: string | null;
}

const HOUR = 3600_000;

export function listMockOutcomes(now = Date.now()): WorkOutcome[] {
  return [
    {
      id: "out-1",
      agent_id: "kimi",
      agent_name: "kimi",
      agent_title: "行业情报分析师",
      agent_initial: "k",
      agent_color: "#A78BFA",
      type: "新闻摘要",
      title: "竞品动态夜巡摘要",
      summary:
        "3 条与鉴权/支付相关的竞品动态已整理，建议对照本仓库回调链路。",
      produced_at: new Date(now - 8 * HOUR).toISOString(),
      issue_id: null,
      brief_id: "brief-1",
    },
    {
      id: "out-2",
      agent_id: "codex",
      agent_name: "codex",
      agent_title: "代码交付工程师",
      agent_initial: "c",
      agent_color: "#60A5FA",
      type: "分析结论",
      title: "支付回调风险面",
      summary:
        "支付回调风险面清单：幂等键、重试窗口、日志脱敏共 6 项待办。",
      produced_at: new Date(now - 3.5 * HOUR).toISOString(),
      issue_id: null,
      brief_id: null,
    },
    {
      id: "out-3",
      agent_id: "mika",
      agent_name: "mika",
      agent_title: "需求派单助理",
      agent_initial: "m",
      agent_color: "#F87171",
      type: "日报摘要",
      title: "站会前进度汇总",
      summary:
        "站会前汇总：2 项受阻、5 项进行中；建议优先解阻 API Key。",
      produced_at: new Date(now - 1.2 * HOUR).toISOString(),
      issue_id: null,
      brief_id: null,
    },
  ];
}

export function getMockOutcome(
  id: string,
  now = Date.now(),
): WorkOutcome | undefined {
  return listMockOutcomes(now).find((o) => o.id === id);
}
