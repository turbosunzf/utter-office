/**
 * Industry briefs mock (B 类 · PRD §4.6). Relative timestamps from now.
 * Extra days / optional images / hit tags are for the daily-push list UI.
 */

import { toDateOnly } from "@multica/core/issues/date";

export type BriefRelevance = "high" | "medium" | "low";

export type BriefHitTone = "down" | "up" | "new" | "mute";

export interface Brief {
  id: string;
  category: string;
  title: string;
  summary: string;
  body_md: string;
  source: string;
  source_url: string | null;
  relevance: BriefRelevance;
  published_at: string;
  hit?: { n: string; l: string; tone: BriefHitTone };
  /** Optional cover. Missing / empty → list row has no thumbnail. */
  image_url?: string | null;
  thumb?: string;
}

export const BRIEF_TABS: { id: string; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "AI Infra", label: "AI Infra" },
  { id: "竞品", label: "竞品" },
  { id: "政策", label: "政策" },
  { id: "融资", label: "融资" },
];

function atDay(
  now: number,
  daysAgo: number,
  hour: number,
  minute = 0,
): string {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function cover(seed: string): string {
  return `https://picsum.photos/seed/uo-${seed}/320/220`;
}

export function listMockBriefs(now = Date.now()): Brief[] {
  return [
    {
      id: "brief-1",
      category: "AI Infra",
      title: "某推理框架发布新版本，推理成本下降约 40%",
      summary: "批处理与量化带来成本下降，对鉴权/支付类服务影响需结合本仓库评估。",
      body_md: `示例正文。本期简报用于验证首页区块与详情阅读链路，内容来自 mock，带「示例数据」徽标。

与 StaffDeck「主动工作」不同：主动工作是定时任务按规则巡检并留 Trace；本页是行业资讯阅读，深挖派单才产生真实事项。

- 成本下降主要来自批处理与量化
- 对鉴权/支付类服务的影响需结合本仓库评估

\`\`\`bash
# 仅示例，勿在生产执行
curl -s https://example.com/pricing
\`\`\`

> 来自行业简报 mock
`,
      source: "36Kr",
      source_url: "https://example.com/brief-1",
      relevance: "high",
      published_at: atDay(now, 0, 8, 12),
      hit: { n: "↓40%", l: "成本", tone: "down" },
    },
    {
      id: "brief-2",
      category: "竞品",
      title: "竞品上线「数字员工工位绑定」能力，强调本地 runtime",
      summary: "对标本地 daemon 绑定体验，强调离线排队。",
      body_md: `竞品本周发布工位绑定向导，强调本地 runtime 与云端切换。

对我们来说：

1. 名册「未绑定」阻断条仍是关键路径
2. 档案能力 Tab 需继续展示 provider / mode

这不是员工自动巡检产物。
`,
      source: "TechNode",
      source_url: "https://example.com/brief-2",
      relevance: "high",
      published_at: atDay(now, 0, 9, 40),
      hit: { n: "新", l: "能力", tone: "new" },
      image_url: cover("brief-2"),
    },
    {
      id: "brief-3",
      category: "政策",
      title: "生成式 AI 服务备案指引更新（摘要）",
      summary: "强调日志留存与人工复核入口。",
      body_md: `备案指引更新摘要：日志留存、人工复核入口、未成年人保护。

对本产品：HITL 入口与运行记录保留仍是合规友好能力，不构成「已合规」声明。
`,
      source: "政策摘要",
      source_url: null,
      relevance: "medium",
      published_at: atDay(now, 1, 10, 5),
      hit: { n: "摘要", l: "合规", tone: "mute" },
    },
    {
      id: "brief-4",
      category: "融资",
      title: "垂直 Agent 平台完成 A 轮，估值报 3 亿美元",
      summary: "资金将用于企业知识库与审计能力。",
      body_md: `融资新闻摘要。重点观察其审计与权限模型是否与我们的 visibility / permission_mode 接近。`,
      source: "投中网",
      source_url: "https://example.com/brief-4",
      relevance: "low",
      published_at: atDay(now, 0, 11, 20),
      hit: { n: "$3亿", l: "估值", tone: "up" },
      image_url: cover("brief-4"),
    },
    {
      id: "brief-5",
      category: "AI Infra",
      title: "开源向量库发布增量索引，长上下文检索延迟腰斩",
      summary: "短摘要。",
      body_md: `短正文，用于验证空白与截断。`,
      source: "Hacker News",
      source_url: null,
      relevance: "medium",
      published_at: atDay(now, 0, 13, 8),
      hit: { n: "↓50%", l: "延迟", tone: "down" },
      image_url: cover("brief-5"),
    },
    {
      id: "brief-6",
      category: "竞品",
      title: "开源 Agent 运行时发布安全沙箱预览",
      summary: "强调文件与网络权限隔离。",
      body_md: `安全沙箱预览说明。对我们：runtime_bound 与 offline 排队语义仍需诚实展示，不夸大隔离能力。

\`const sandbox = true; // mock\`
`,
      source: "GitHub Trending",
      source_url: "https://example.com/brief-6",
      relevance: "medium",
      published_at: atDay(now, 0, 14, 30),
    },
    {
      id: "brief-7",
      category: "AI Infra",
      title: "云厂商下调 GPU 现货价，企业推理预算窗口打开",
      summary: "现货价回落约一成，适合评估弹性扩容。",
      body_md: `GPU 现货价回落摘要。评估弹性扩容与预留实例的切换窗口，不构成采购建议。`,
      source: "财联社",
      source_url: "https://example.com/brief-7",
      relevance: "high",
      published_at: atDay(now, 0, 15, 6),
      hit: { n: "-11%", l: "GPU", tone: "down" },
      image_url: cover("brief-7"),
    },
    {
      id: "brief-8",
      category: "政策",
      title: "数据出境申报常见退回原因公布，日志留存被点名",
      summary: "企业需核对应急与审计日志字段。",
      body_md: `申报退回原因摘要。对本产品：运行记录与 HITL 痕迹仍是加分项，不等于已过审。`,
      source: "证券时报",
      source_url: null,
      relevance: "medium",
      published_at: atDay(now, 0, 16, 44),
      hit: { n: "关注", l: "出境", tone: "mute" },
      image_url: cover("brief-8"),
    },
    {
      id: "brief-9",
      category: "融资",
      title: "知识库创业公司获战略投资，押注私有化部署",
      summary: "资金将用于本地部署与权限模型。",
      body_md: `战略投资摘要。观察其私有化部署与我们的 workspace visibility 是否同构。`,
      source: "36Kr",
      source_url: "https://example.com/brief-9",
      relevance: "low",
      published_at: atDay(now, 0, 17, 18),
      hit: { n: "+8%", l: "赛道", tone: "up" },
    },
    {
      id: "brief-y1",
      category: "竞品",
      title: "对标产品把「简报」改成主动推送，强调早 8 点送达",
      summary: "产品叙事从问答转向秘书。",
      body_md: `竞品叙事变化。我们首页简报仍是资讯阅读，主动工作落点仍是定时任务。`,
      source: "LatePost",
      source_url: "https://example.com/brief-y1",
      relevance: "high",
      published_at: atDay(now, 1, 8, 5),
      hit: { n: "新", l: "推送", tone: "new" },
      image_url: cover("brief-y1"),
    },
    {
      id: "brief-y2",
      category: "AI Infra",
      title: "开源评测显示小参数模型在私有知识问答上追平大模型",
      summary: "检索质量比参数量更关键。",
      body_md: `评测摘要。对本仓库：知识库切片与引用质量优先于换更大模型。`,
      source: "机器之心",
      source_url: null,
      relevance: "medium",
      published_at: atDay(now, 1, 11, 30),
      hit: { n: "持平", l: "评测", tone: "mute" },
      image_url: cover("brief-y2"),
    },
    {
      id: "brief-y3",
      category: "融资",
      title: "企业 AI 助手赛道本周两起并购，估值预期降温",
      summary: "买方更看重留存与权限审计。",
      body_md: `并购摘要。估值预期降温，买方关注留存与审计。`,
      source: "投中网",
      source_url: "https://example.com/brief-y3",
      relevance: "low",
      published_at: atDay(now, 1, 15, 0),
      hit: { n: "-6%", l: "估值", tone: "down" },
    },
    {
      id: "brief-y4",
      category: "政策",
      title: "地方国资发布智能体采购负面清单征求意见",
      summary: "强调数据不出域与人工复核。",
      body_md: `负面清单征求意见摘要。数据不出域、人工复核被列为硬条件。`,
      source: "政策摘要",
      source_url: null,
      relevance: "medium",
      published_at: atDay(now, 1, 18, 20),
      image_url: cover("brief-y4"),
    },
    {
      id: "brief-d2-1",
      category: "AI Infra",
      title: "上下文缓存成为推理网关标配，命中率决定账单",
      summary: "未命中时成本可差一个数量级。",
      body_md: `上下文缓存摘要。命中率成为网关计费关键指标。`,
      source: "InfoQ",
      source_url: "https://example.com/brief-d2-1",
      relevance: "high",
      published_at: atDay(now, 2, 9, 10),
      hit: { n: "×10", l: "未命中", tone: "down" },
      image_url: cover("brief-d2-1"),
    },
    {
      id: "brief-d2-2",
      category: "竞品",
      title: "海外协作套件把 Agent 会话写进事项评论流",
      summary: "会话不再独立于任务。",
      body_md: `产品动态。事项评论流承载 Agent 会话，减少上下文分裂。`,
      source: "The Verge",
      source_url: null,
      relevance: "medium",
      published_at: atDay(now, 2, 12, 45),
      hit: { n: "新", l: "评论", tone: "new" },
    },
    {
      id: "brief-d2-3",
      category: "融资",
      title: "语音纪要创业公司完成种子轮，押注会后自动待办",
      summary: "录音转事项成为下一战场。",
      body_md: `种子轮摘要。会后自动待办是其叙事核心。`,
      source: "TechCrunch",
      source_url: "https://example.com/brief-d2-3",
      relevance: "low",
      published_at: atDay(now, 2, 16, 0),
      image_url: cover("brief-d2-3"),
    },
  ];
}

export function getMockBrief(id: string): Brief | undefined {
  return listMockBriefs().find((b) => b.id === id);
}

export function briefsOnDay(briefs: Brief[], dateOnly: string): Brief[] {
  return briefs
    .filter((b) => toDateOnly(new Date(b.published_at)) === dateOnly)
    .slice()
    .sort(
      (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
    );
}

export function filterBriefsByTab(briefs: Brief[], tab: string): Brief[] {
  if (tab === "all") return briefs;
  return briefs.filter((b) => b.category === tab);
}
