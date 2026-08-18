/**
 * Industry briefs mock (B 类 · PRD §4.6). Relative timestamps from now.
 */

export type BriefRelevance = "high" | "medium" | "low";

export type BriefHitTone = "down" | "new" | "mute";

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
  thumb?: string;
}

const HOUR = 3600_000;

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
      published_at: new Date(now - 2 * HOUR).toISOString(),
      hit: { n: "↓40%", l: "成本", tone: "down" },
      thumb: "讯",
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
      published_at: new Date(now - 5 * HOUR).toISOString(),
      hit: { n: "新", l: "能力", tone: "new" },
      thumb: "竞",
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
      published_at: new Date(now - 26 * HOUR).toISOString(),
      hit: { n: "摘要", l: "合规", tone: "mute" },
      thumb: "政",
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
      published_at: new Date(now - 8 * HOUR).toISOString(),
      hit: { n: "$3亿", l: "估值", tone: "new" },
      thumb: "融",
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
      published_at: new Date(now - 12 * HOUR).toISOString(),
      hit: { n: "↓50%", l: "延迟", tone: "down" },
      thumb: "讯",
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
      published_at: new Date(now - 10 * HOUR).toISOString(),
    },
  ];
}

export function getMockBrief(id: string): Brief | undefined {
  return listMockBriefs().find((b) => b.id === id);
}
