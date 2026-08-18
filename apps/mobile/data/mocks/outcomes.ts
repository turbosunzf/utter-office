/**
 * Work outcomes mock (B 类 · PRD §4.4).
 * 对应后续 B-5 / Run 产物回流；真源接入后删除本文件。
 */

export type OutcomeKind = "每日新闻" | "数据分析" | "事项交付";

export interface OutcomePerson {
  agent_id: string;
  agent_name: string;
  agent_initial: string;
  agent_color: string;
}

export interface WorkOutcome {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_title: string;
  agent_initial: string;
  agent_color: string;
  kind: OutcomeKind;
  title: string;
  summary: string;
  produced_at: string;
  metric: string;
  metric_label: string;
  spark: number[];
  /** 该次产出消耗的 tokens（曲线高度 = 时段内使用度）。 */
  tokens: number;
  /** 任务运行时长；曲线从 produced_at 往前铺满区间。 */
  duration_ms: number;
  issue_id: string | null;
  brief_id: string | null;
  /** 共同产出的数字员工；缺省则只显示主产出人。 */
  people?: OutcomePerson[];
}

const HOUR = 3600_000;
const KIMI = {
  agent_id: "kimi",
  agent_name: "kimi",
  agent_title: "行业情报分析师",
  agent_initial: "k",
  agent_color: "#A78BFA",
} as const;
const CODEX = {
  agent_id: "codex",
  agent_name: "codex",
  agent_title: "代码交付工程师",
  agent_initial: "c",
  agent_color: "#60A5FA",
} as const;
const MIKA = {
  agent_id: "mika",
  agent_name: "mika",
  agent_title: "需求派单助理",
  agent_initial: "m",
  agent_color: "#F87171",
} as const;

export function listMockOutcomes(now = Date.now()): WorkOutcome[] {
  return [
    {
      id: "out-1",
      ...KIMI,
      kind: "每日新闻",
      title: "AI Infra 早报 · 成本 ↓40%",
      summary: "3 条鉴权/支付相关动态已整理。",
      produced_at: new Date(now - 22.2 * HOUR).toISOString(),
      metric: "3",
      metric_label: "条新闻",
      spark: [0.35, 0.48, 0.42, 0.7, 0.62, 0.88, 0.78],
      tokens: 1800,
      duration_ms: 45 * 60_000,
      issue_id: null,
      brief_id: "brief-1",
      people: [KIMI, MIKA, CODEX],
    },
    {
      id: "out-1b",
      ...KIMI,
      kind: "每日新闻",
      title: "竞品定价页改版摘录",
      summary: "两家竞品公开了推理单价。",
      produced_at: new Date(now - 20.4 * HOUR).toISOString(),
      metric: "2",
      metric_label: "条动态",
      spark: [0.22, 0.3, 0.28, 0.44, 0.5, 0.62],
      tokens: 900,
      duration_ms: 20 * 60_000,
      issue_id: null,
      brief_id: "brief-1",
      people: [KIMI, CODEX],
    },
    {
      id: "out-2",
      ...CODEX,
      kind: "数据分析",
      title: "支付漏斗 · 卡点短信验证",
      summary: "转化漏斗卡点在短信验证。",
      produced_at: new Date(now - 16.3 * HOUR).toISOString(),
      metric: "+12%",
      metric_label: "转化",
      spark: [0.2, 0.32, 0.3, 0.52, 0.46, 0.82],
      tokens: 4200,
      duration_ms: 60 * 60_000,
      issue_id: null,
      brief_id: null,
      people: [CODEX, KIMI, MIKA],
    },
    {
      id: "out-2b",
      ...CODEX,
      kind: "数据分析",
      title: "鉴权耗时分位",
      summary: "P95 从 420ms 降到 280ms。",
      produced_at: new Date(now - 14.1 * HOUR).toISOString(),
      metric: "P95",
      metric_label: "280ms",
      spark: [0.7, 0.62, 0.5, 0.44, 0.38, 0.28],
      tokens: 3100,
      duration_ms: 50 * 60_000,
      issue_id: null,
      brief_id: null,
    },
    {
      id: "out-3",
      ...MIKA,
      kind: "事项交付",
      title: "站会摘要 · 解阻 API Key",
      summary: "站会前汇总：优先解阻 API Key。",
      produced_at: new Date(now - 9.7 * HOUR).toISOString(),
      metric: "6",
      metric_label: "项 · 75%",
      spark: [0.28, 0.45, 0.62, 0.9, 0.55, 0.4],
      tokens: 1200,
      duration_ms: 25 * 60_000,
      issue_id: null,
      brief_id: null,
      people: [MIKA, CODEX],
    },
    {
      id: "out-3b",
      ...KIMI,
      kind: "每日新闻",
      title: "政策备忘 · 模型备案口径",
      summary: "摘了三条与备案相关的公开口径。",
      produced_at: new Date(now - 7.4 * HOUR).toISOString(),
      metric: "3",
      metric_label: "条口径",
      spark: [0.18, 0.4, 0.36, 0.58, 0.7, 0.64],
      tokens: 800,
      duration_ms: 30 * 60_000,
      issue_id: null,
      brief_id: null,
      people: [KIMI, MIKA, CODEX],
    },
    {
      id: "out-4",
      ...CODEX,
      kind: "事项交付",
      title: "E2E 补测结论",
      summary: "支付回调路径 4 条用例已绿。",
      produced_at: new Date(now - 4.2 * HOUR).toISOString(),
      metric: "4",
      metric_label: "条用例",
      spark: [0.3, 0.48, 0.52, 0.7, 0.86, 0.9],
      tokens: 5600,
      duration_ms: 80 * 60_000,
      issue_id: null,
      brief_id: null,
      people: [CODEX, MIKA],
    },
    {
      id: "out-5",
      ...MIKA,
      kind: "事项交付",
      title: "阻塞项升级 · 权限矩阵",
      summary: "把权限矩阵核对升给负责人。",
      produced_at: new Date(now - 4.55 * HOUR).toISOString(),
      metric: "1",
      metric_label: "项升级",
      spark: [0.2, 0.25, 0.4, 0.55, 0.6, 0.72],
      tokens: 600,
      duration_ms: 40 * 60_000,
      issue_id: null,
      brief_id: null,
      people: [MIKA, KIMI],
    },
    {
      id: "out-6",
      ...KIMI,
      kind: "数据分析",
      title: "晚间热度复核",
      summary: "今日产出峰值在下班前后。",
      produced_at: new Date(now - 0.35 * HOUR).toISOString(),
      metric: "峰值",
      metric_label: "此刻",
      spark: [0.4, 0.5, 0.62, 0.7, 0.85, 0.95],
      tokens: 1400,
      duration_ms: 25 * 60_000,
      issue_id: null,
      brief_id: null,
      people: [KIMI, CODEX, MIKA],
    },
  ];
}

export function getMockOutcome(
  id: string,
  now = Date.now(),
): WorkOutcome | undefined {
  return listMockOutcomes(now).find((o) => o.id === id);
}
