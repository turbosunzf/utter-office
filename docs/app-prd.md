# utter-office（AI 秘书）产品需求文档

> 版本：v1.6（2026-08-17）｜ 状态：语音优先导航重构（B线①–⑤）全部合入 main
>
> v1.6 更新说明：B线①–⑤ 已全部合入并验证，本文档由 v1.5 规划态更新为「已实现态」，原型图同步优化后收入 `docs/assets/prototypes/`。

---

## 1. 产品概述

utter-office 是独立移动端 AI 秘书 App。核心心智：**语音是需求/任务的第一输入来源**，用户在任意场景开口即可生成任务、发起对话；文字与语音在同一会话中无缝切换。

- **形态**：iOS 优先的 RN/Expo 独立 App（fork 自桌面端 AI 秘书）
- **核心闭环**：语音录入 → 实时转写 → 任务落位 → 智能体执行 → 看板反馈
- **本期范围**：信息架构重构 + 语音优先导航 + 首页/看板/录音/聊天/我的五屏

## 2. 目标用户与核心场景

| 场景 | 用户行为 | 关键路径 |
|------|---------|---------|
| 开口派活 | 长按中央按钮说话，松开发送 | voice → 聊天 |
| 快速发起 | 短按中央按钮弹 Sheet 选「录音/翻译」 | voice → record / translate |
| 查看进度 | 打开看板看任务/智能体/报告 | board |
| 晨间回顾 | 打开首页看统计卡、待办、行业简报 | home |
| 管理个人 | 我的页切换工作区、查看事项/项目/设置 | mine |

## 3. 信息架构（5-Tab + 语音中枢）

```
底部导航（5 Tab，中央为语音按钮）
┌─────────────────────────────┐
│  首页      看板   ◉  聊天  我的  │
│ (home)   (board)  (voice)  (chat) (mine)
└─────────────────────────────┘
```

- **中央语音按钮**（RecordButton，58×58 渐变胶囊）：
  - 短按（<2s）→ 底部 Sheet：录音 / 翻译 / 长按发语音
  - 长按（≥2s）→ 触觉反馈 + EQ/波纹录音态，松开跳聊天发「你好」
- **Pushed 路由**：`/{slug}/voice-record`（录音）、`/{slug}/voice-translate`（翻译）、`/{slug}/voice-talk`（长按说话）、`/{slug}/my-issues`（我的待办）、`/{slug}/issues`、`/{slug}/projects`、`/{slug}/settings` 等
- **我的页**（mine）：iOS 设置页风格，替代原 More 弹窗

## 4. 五屏功能详述

### 4.1 首页（home）

布局顺序（自上而下）：

1. **Header**：标题「首页」+ HeaderActions
2. **问候区**：hero 问候 + 当日日期（zh-CN）
3. **统计卡 ×3**（`components/home/stats-card.tsx`）：
   - 进行中任务（我的 assigned in_progress issues）
   - 待办事项（我的 assigned issues）
   - 运行中智能体（presence 地图中 workload=working 的 agent 数）
   - 数据缺失时渲染 `—`，**禁止用 0 冒充**（PRD §13 口径）
4. **待办列表**（`todo-list.tsx`）：按状态分组的我的 assigned issues；底部「全部待办」→ `/{slug}/my-issues`
5. **行业简报**（`brief-list.tsx`）：简报卡片列表，读取行业简报官每日产出 JSON

### 4.2 看板（board）

- Header「看板」+ 时间范围分段（**日 / 周 / 月**，按查看者时区切桶）
- 三个数据块：
  1. **任务进度**（`task-progress.tsx`）：按状态/泳道的任务分布
  2. **智能体运行数据**（`agent-usage.tsx`）：三个 rollup（运行中/空闲/使用量）
  3. **数据分析报告**：数据分析官产出的自然语言报告
- **错误态**：任一 dashboard 查询失败 → 红色错误横幅 + 「重试」按钮，重试通过 `dashboardKeys.all(wsId)` 整体重取；**不回退成全 0/空态**
- 数据层：`data/queries/dashboard.ts` 六个查询的 cache key 与 option builder 均携带设备时区 `tz`（与 web `packages/core/dashboard/queries.ts` 同构）

### 4.3 录音 / 翻译（voice-record / voice-translate）

meet-think 结构（纯 UI，无真实采集/ASR）：

1. **顶栏胶囊**：状态（转写中/已暂停/已停止）+ 转写模式 + 语言
2. **实时转写列表**：带时间戳的逐句转写（当前为 mock 数据源）
3. **底部 Dock**：波形 + 计时器（MM:SS / HH:MM:SS）+ 暂停/停止 orbs + 工具行

翻译页为左右对向气泡（按住说话，松开出译），同为纯 UI 原型。

### 4.4 聊天 / 工作台（chat）

- Header：中间 ChatTitleButton（会话标题）+ 右侧 SessionActions
- 消息时间线 + 会话切换（chat-sessions sheet）
- 底部 ChatComposer（语音快捷入口，disabled 态清晰）
- 会话数据经 `data/mutations/chat-send.ts` 乐观 burst 发送

### 4.5 我的（mine）

iOS 设置页风格：

- **身份卡**：头像 / 姓名 / 邮箱 → 设置
- **工作区卡**：当前工作区 → switch-workspace（单工作区用户禁用）
- **分组一（工作）**：置顶 / 事项 → `more/issues` / 项目 → `more/projects` / 数字员工
- **分组二（设置）**：设置 / 个人资料 / 通知

## 5. 语音优先交互规范

| 交互 | 触发 | 反馈 | 目标 |
|------|------|------|------|
| 短按中央按钮 | <2s | 底部 Sheet（录音/翻译/长按发语音） | 选路 |
| 长按中央按钮 | ≥2s | 触觉 + EQ/波纹录音态 | 直接发语音 |
| 长按发送 | 按住 | 「正在录音」态（麦克风+波形） | 松开跳聊天 |
| 松开 | — | 跳聊天并发「你好」（模拟） | 链路闭环 |

## 6. 信息架构决策（不得回退）

1. **报告卡=工作区维度，待办=个人维度**，两者 scope 不同，不共用一个 query key
2. **staff-picker 提前到 M1**（formSheet 路由 `?intent=dispatch`/`?intent=default`），默认员工设置与中央按钮目标逻辑在 M2 落地
3. **more/agents = 删除并重定向到 /staff**（M4）；我的页「数字员工」行指向 `more/agents` 过渡
4. **M4 扩展移动端 AgentSchema**（mcp_config / mcp_config_redacted / composio_toolkit_allowlist），后端零改动
5. **5-Tab 语义**：首页 / 看板 / 录音 / 聊天 / 我的（中央按钮非导航目标）

## 7. 全局状态与降级（6 态）

Loading / Empty / Error / Partial / Offline / Refreshing 六态齐全，统一 `stat-placeholder`（缺失显示 `—`）与空态/错误组件。

- A 类数据**无一处用 0 或假数字冒充**
- 任一百分比指标分母 < 5 时不显示百分比，改显示样本量

## 8. 文案中文化

Stack 标题、`STATUS_LABEL`、`PRIORITY_LABEL`、空态/错误/按钮全部中文化，治理中英混用。

## 9. 非功能要求

- `tsc --noEmit` 零错误；vitest 全绿；eslint 0 error
- Release 构建（`expo run:ios --configuration Release`）真机可运行
- 非 UTC 时区「近 N 天」日桶无 ±1 天边界差异
- 数据缺失降级，不出现误导性数字

## 10. 里程碑与交付状态

| 里程碑 | 内容 | 状态 |
|--------|------|------|
| M1 信息架构落位 | 路由迁移 + 首页壳 + 我的页 + staff-picker + 中文化 | ✅ done |
| M2 首页报告与简报 | 报告卡 + 简报 mock + 秘书设置 | ✅ done |
| M3 看板可视化 | 列视图/泳道 + dashboard 数据层 | ✅ done |
| M4 工作台融合 | chat → 工作台 + 员工 rail + 阻断提示条 + AgentSchema 扩展 | ✅ done |
| B线① 导航骨架 | 5-Tab 重排 + 中央录音按钮 + 底部 sheet | ✅ done |
| B线② 我的页迁移 | More 弹窗能力迁入 mine | ✅ done |
| B线③ 首页 | 统计卡 + 待办 + 行业简报 | ✅ done（`8e3d6f8`） |
| B线④ 看板 | 任务进度 + 运行数据 + 分析报告 | ✅ done（`c037aef`） |
| B线⑤ 录音/翻译 | meet-think 结构 | ✅ done |
| 语音 MVP | 底部语音按钮 + 弹窗 + 录音/翻译原型 | ✅ done |

## 11. 原型图索引

见 `docs/assets/prototypes/`（6 张，当前态）：

| 文件 | 内容 |
|------|------|
| `01-tab-ia.png` | 5-Tab 信息架构 + 中央语音按钮 |
| `02-home.png` | 首页：问候 + 统计卡×3 + 待办 + 简报 |
| `03-board.png` | 看板：任务进度 + 运行数据 + 分析报告 |
| `04-voice.png` | 录音页 meet-think：顶栏胶囊 + 实时转写 + 底部 Dock |
| `05-chat.png` | 聊天/工作台：标题 + 消息时间线 + Composer |
| `06-mine.png` | 我的：身份卡 + 工作区卡 + 分组列表 |

## 12. 遗留与后续

- 真机 Release 冒烟验证受签名阻塞待补
- 真实录音 / ASR 转写 / 真实翻译能力（后续 issue）
- BLE 硬件接入（后续 issue）
- 真实语音消息格式与后端协议（后续 issue）
