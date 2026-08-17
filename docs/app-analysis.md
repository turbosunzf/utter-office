# utter-office 移动端 App 完整分析报告

> 最后更新：2026-08-17
> 分析对象：`apps/mobile`（@multica/mobile）+ `packages/core`（@multica/core）
> 文档性质：结构 / 内容 / 原型现状全面分析，供后续开发（语音、BLE、StaffDeck 整合等）作为基础参照。
> **StaffDeck 整合**：§16 已过期；现行以 `docs/staffdeck-analysis.md` + `docs/app-prd.md` v1.6 + `docs/assets/prototypes/` 为准。

---

## 目录

1. [产品定位与概念](#1-产品定位与概念)
2. [仓库与包结构](#2-仓库与包结构)
3. [技术栈基线](#3-技术栈基线)
4. [核心领域模型](#4-核心领域模型)
5. [架构分层总览](#5-架构分层总览)
6. [路由与导航结构](#6-路由与导航结构)
7. [屏幕功能清单](#7-屏幕功能清单)
8. [组件库清单](#8-组件库清单)
9. [数据层](#9-数据层)
10. [语音 / BLE 原型现状](#10-语音--ble-原型现状)
11. [多环境与构建发布](#11-多环境与构建发布)
12. [认证与安全](#12-认证与安全)
13. [测试与质量](#13-测试与质量)
14. [现有文档索引](#14-现有文档索引)
15. [当前状态与待办缺口](#15-当前状态与待办缺口)
16. [与 StaffDeck 的整合切入点](#16-与-staffdeck-的整合切入点)

---

## 1. 产品定位与概念

utter-office（AI 秘书）是从 Multica 独立出来的 **移动端优先的 AI 助手 App**，核心假设：

> **语音 + BLE 硬件** 是需求 / 任务的首选输入源 —— 用户开口（或按硬件按钮）说出需求，App 转写后派发为 issue / 任务，其余沿用 Multica 后端（web / 桌面 / 后端不改）。

当前仓库为**最小可构建骨架**（issue COD-13），只含移动端 + 通信层，尚未接入语音 / BLE / ASR。

- 移动端是「手机上的客户端的产物」，UI 与交互允许与 web/桌面不同，但**产品语义必须一致**（见 `apps/mobile/CLAUDE.md` §Behavioral parity）。
- 本质上是一个 issue 项目管理客户端：issue / project / comment / chat / inbox / agent / squad 是核心概念，voice 是差异化入口。

---

## 2. 仓库与包结构

```
utter-office/
├── apps/
│   └── mobile/                  # Expo / React Native 主 App（expo-router + nativewind）
│       ├── app/                 # 路由（expo-router 文件路由）
│       ├── components/          # UI 组件（ui / issue / project / chat / inbox / voice 等域）
│       ├── data/                # 数据层：ApiClient / queries / mutations / realtime / stores
│       ├── lib/                 # 领域规则与工具函数（镜像 web）
│       ├── docs/                # 组件 / Markdown 专项文档
│       ├── ios/                 # prebuild 生成的 iOS 原生工程（UtterOfficeDev.xcworkspace）
│       └── CLAUDE.md            # 移动端规则（技术基线 + 必读规范）
├── packages/
│   ├── core/                    # 通信层：API client / hooks / 领域逻辑 / types（源码复制，非发布包）
│   ├── eslint-config/           # 共享 ESLint 基座
│   └── tsconfig/                # 共享 TS 基座
├── package.json                 # 根：pnpm scripts（dev / ios:* / typecheck / lint / test / build）
├── pnpm-workspace.yaml          # workspace + catalog（版本与 multica 源锁文件对齐）
└── turbo.json                   # turbo 任务（裁剪至 mobile + core）
```

要点：

- **包名**：仓库名改为 `utter-office`，App 显示名 `Utter Office`（slug `utter-office`、scheme `utteroffice`）；内部 workspace 包名保留 `@multica/*`（132 处 `@multica/core` 引用，骨架阶段不改名以保证可构建性）。
- **`packages/core` 采用方案 A**：直接复制源码为内部包，不发布。移动端**只允许** `import type` 自 `@multica/core/types/*` 与纯函数；其余数据/UI 全部 mobile 自持（mirror, don't import）。
- `packages/core` 覆盖的领域远大于移动端实际使用（agents / autopilots / billing / dashboard / diagnostics / feature-flags / github / lark / slack / wecom / dingtalk / vcs / composio / skills / shortcuts / i18n / navigation / onboarding / realtime / search / feedback / client-usage 等），移动端只用了其中与 issue / project / chat / agent / squad / inbox / pin 相关的子集。

---

## 3. 技术栈基线

来源：`apps/mobile/package.json`（实装）与 `apps/mobile/CLAUDE.md` §Tech-stack baseline（锁定基线）。

| 层 | 选型 | 版本（package.json 实装） |
|---|---|---|
| 运行时 | Expo SDK | `expo ~55.0.23` |
| 原生 | React Native | `react-native 0.83.6` |
| 渲染 | React | `react 19.2.0` |
| 路由 | Expo Router（文件路由） | `expo-router ~55.0.14` |
| 样式 | NativeWind 4 + Tailwind 3.4 | `nativewind ^4.1.23`、`tailwindcss ^3.4.17` |
| 组件基座 | react-native-reusables（RNR，shadcn 等价）+ RN-Primitives | `@rn-primitives/* ^1.4.0` |
| 服务端状态 | TanStack Query 5 | catalog 锁定 |
| 本地状态 | Zustand | catalog 锁定 |
| 鉴权存储 | expo-secure-store | `~55.0.13` |
| 表单/校验 | zod | catalog 锁定 |
| 开发客户端 | expo-dev-client | `^55.0.32` |
| 主题 | CSS variables（`global.css`）+ class 级 dark mode | NativeWind `darkMode: 'class'` |
| 构建 | CocoaPods / Xcode（ios 原生目录）；turbo 编排 | — |
| 测试 | vitest（纯逻辑单测） | catalog 锁定 |

补充：

- TypeScript **strict**。`main: "expo-router/entry"`。
- Markdown 渲染：混合方案（正文走 `react-native-enriched-markdown`，代码块走 `react-native-shiki-engine`，图片走 `expo-image` + lightbox），详见 `apps/mobile/docs/markdown-rendering-adr.md` / `markdown-renderer-research.md`。
- 图标：`@expo/vector-icons`（Ionicons）+ `react-native-svg`。
- 其余：`@shopify/flash-list`（长列表）、`react-native-reanimated` / `worklets`、`react-native-gesture-handler`、`react-native-keyboard-controller`、`input-otp-native`（OTP）、`rn-emoji-keyboard`（表情选择）、`@react-native-community/datetimepicker`、`expo-image-picker` / `expo-document-picker` / `expo-haptics` / `expo-clipboard` / `expo-linear-gradient` / `expo-linking` / `expo-system-ui`、`@react-native-community/netinfo`、`@react-native-segmented-control/segmented-control`、`@tanstack/react-query`、`zustand`、`class-variance-authority`、`clsx`、`tailwind-merge`、`marked`。

> ⚠️ CLAUDE.md 基线写的是 RN 0.82 / React 19.1，而 package.json 实际锁定 RN 0.83.6 / React 19.2.0 —— 以 package.json 为准，基线文档待同步。

---

## 4. 核心领域模型

类型全部来自 `packages/core/types/*`，移动端只读引用。以下为移动端实际用到的核心实体。

### 4.1 Workspace / 成员

- **Workspace**：`id / name / slug / description / context / settings / repos[] / issue_prefix / avatar_url`。`issue_prefix` 用于 `MUL-NN` 这种标识。
- **Member**：`workspace_id / user_id / role`（owner | admin | member）。
- **User**：`name / email / avatar_url / profile_description / timezone / language / onboarding_questionnaire / starter_content_state`。
- **Invitation**：pending / accepted / declined / expired。

### 4.2 Issue（事项）

```
IssueStatus   = backlog | todo | in_progress | in_review | done | blocked | cancelled
IssuePriority = urgent | high | medium | low | none
IssueAssigneeType = member | agent | squad        # 分配对象可以是人 / AI 智能体 / 战队
```

`Issue` 字段要点：`number`（工作区递增）、`identifier`（`MUL-NN`）、`title`、`description`、`status`、`priority`、`assignee_type / assignee_id`、`creator_type / creator_id`、`parent_issue_id`（父子事项）、`project_id`、`position`、`stage`（有界批次组）、`start_date / due_date`（date-only "YYYY-MM-DD"，禁止 `new Date()` 本地格式化）、`metadata`（agent 用的扁平 KV）、`properties`（自定义属性）、`reactions[] / labels[]`。

### 4.3 Project（项目）

```
ProjectStatus   = planned | in_progress | paused | completed | cancelled
ProjectPriority = urgent | high | medium | low | none
```

`Project`：`title / icon / status / priority / lead_type / lead_id / start_date / due_date / issue_count / done_count / resource_count`。**ProjectResource** 是项目到外部资源的指针：`github_repo`（云侧 git 检出）或 `local_directory`（指定 daemon 上原地执行）。

### 4.4 Agent（智能体）/ Runtime / Task

- **Agent**：`runtime_id / runtime_bound`、`name / description / instructions / system_instructions`（system agent 如 mika）、`runtime_mode`（local | cloud）、`model / thinking_level / service_tier`、`status`（idle | working | blocked | error | offline）、`max_concurrent_tasks`、`visibility`（workspace | private）、`permission_mode`（private | public_to）+ `invocation_targets`（谁能触发/指派/@它）、`skills[]`、`mcp_config`（MCP 服务器）、`composio_toolkit_allowlist`、`owner_id`、`archived_at`。
- **Runtime（RuntimeDevice）**：daemon 注册的执行环境，`runtime_mode / provider / status（online|offline）/ visibility / owner_id / profile_id`。协议族白名单含 claude / codebuddy / codex / copilot / opencode / openclaw / hermes / pi / cursor / kimi / qwen / grok 等。
- **AgentTask**：`agent_id / runtime_id / issue_id`（空串=聊天/autopilot 产生）、`status`（queued | dispatched | waiting_local_directory | running | completed | failed | cancelled）、`priority`、`chat_session_id / autopilot_run_id / parent_task_id / attempt`、`trigger_comment_id / coalesced_comment_ids / delivered_comment_ids / trigger_summary / handoff_note`、`kind`（comment | autopilot | chat | quick_create | direct）、`work_dir / relative_work_dir`、`attribution`（责任链：谁指派、证据）、`usage[]`（token 用量）。

### 4.5 Squad（战队）

`Squad`：`name / description / instructions / leader_id / member_count / member_preview[]`；`SquadMember`（agent | member + role）；`SquadActivityLog`（outcome: action | no_action | failed）；`SquadMemberStatus`（working | idle | offline | unstable | archived）。

### 4.6 Chat

- **ChatSession**：`agent_id / creator_id / project_id? / title / status（active|archived）/ has_unread / unread_count / last_message / pinned`。
- **ChatMessage**：`role（user|assistant）/ content / task_id / attachments / failure_reason / elapsed_ms / message_kind（message|no_response|onboarding_kickoff|onboarding_opening）/ quick_actions[]`。quick_actions 是 AI 回复附带的「快捷追问」。
- **ChatPendingTask / ChatQueuedTask**：会话内任务排队状态（follow-up queue）。

### 4.7 Comment / Reaction

`Comment`：`author_type（member|agent|system）/ content / type（comment|status_change|progress_update|system）/ parent_id（线程回复）/ reactions / attachments / resolved_* / source_task_id / quick_action_id / trigger_outcomes[]`。`@agent` / `@squad` 提及会触发 agent 运行（`CommentTriggerOutcome`：queued | coalesced | deferred | blocked）。

### 4.8 Inbox（收件箱）

`InboxItem`：`recipient_type（member|agent）/ actor_type / type / severity（action_required|attention|info）/ issue_id / title / body / issue_status / read / archived / details`。**18 种 type**（issue_assigned / status_changed / new_comment / mentioned / task_completed / task_failed / agent_blocked / agent_completed / quick_create_done / quick_create_unconfirmed …）。

### 4.9 Pin / Label / Notification Preferences

- **Pin**：`item_type（issue|project|view）/ item_id / position`（置顶项，标题等从详情查询派生，响应 `issue:updated`）。
- **Label**：事项标签。
- **NotificationPreferences**：6 组收件箱偏好 + 系统开关。

### 4.10 WebSocket 事件协议

`WSEventType` 联合类型覆盖 issue / comment / agent / task / inbox / workspace / member / daemon / skill / subscriber / activity / reaction / chat / project / squad / label / issue_properties / property / pin / invitation / github / pull_request 共 **70+ 事件**。移动端只订阅有 UI 消费方的事件（见 §9.4）。

---

## 5. 架构分层总览

```
┌─────────────────────────────────────────────────────────────┐
│  UI 层    app/（路由 + 屏幕） · components/（组件）           │
│           交互：iOS 原生 > RNR > 内联组合（三原则）            │
├─────────────────────────────────────────────────────────────┤
│  状态层    TanStack Query（服务端状态 / 缓存）                │
│           Zustand（mobile 本地 UI 状态：草稿/选择器/视图）    │
├─────────────────────────────────────────────────────────────┤
│  实时层    ws-client（单 socket 三态）→ realtime-provider     │
│           → use-*-realtime（每特性订阅，patch-over-invalidate）│
├─────────────────────────────────────────────────────────────┤
│  通信层    data/api.ts（移动端自持 ApiClient）                │
│           fetchValidated / fetchValidatedWith + zod 校验     │
│           30s 超时 · AbortController · 401 回调 · X-Request-ID│
├─────────────────────────────────────────────────────────────┤
│  共享层    @multica/core：仅 import type + 纯函数（mirror）    │
│  后端      Multica 服务端（web/桌面/后端沿用，本仓库不含）      │
└─────────────────────────────────────────────────────────────┘
```

三条贯穿性硬约束（`apps/mobile/CLAUDE.md`）：

1. **数据契约镜像 web/desktop** —— 端点、请求体、响应 schema、乐观补丁、缓存 key 前缀与 web 一致；UI/交互可自由分歧。
2. **行为语义一致** —— 计数/可见性、权限、状态枚举/流转、数据身份，四项必须与 web 一致（历史事故：inbox 去重缺失导致红点不一致，2026-05-09）。
3. **mirror, don't import** —— 数据/实时层自持移动端版本（如 `data/realtime/issue-ws-updaters.ts`），不 import `packages/core` 的 updaters（key 工厂绑定 + 缓存形态差异）。

---

## 6. 路由与导航结构

expo-router 文件路由，完整树（URL → 文件 → 类型）：

### 根 / 认证

| URL | 文件 | 类型 |
|---|---|---|
| `/` | `app/_layout.tsx` | 根 Stack：Providers（GestureHandler / SafeArea / Keyboard / QueryClient / Theme）+ AuthInitializer（401→登出清缓存→/login；预 warm Shiki） |
| `/` | `app/index.tsx` | 入口重定向：无 user→/login；无 slug→/select-workspace；否则→`/{slug}/home` |
| `/login` | `(auth)/login.tsx` | 邮箱验证码登录（无密码） |
| `/verify` | `(auth)/verify.tsx` | 6 位 OTP 校验，自动提交，60s 重发冷却 |
| `/select-workspace` | `(app)/select-workspace.tsx` | 选择工作区 |

### 工作区 Tab（`app/(app)/[workspace]/(tabs)/`）

Tab 顺序：**首页 · 看板 · 录音（中央，自定义按钮）· 聊天 · 我的**。

| URL | 文件 | 内容 |
|---|---|---|
| `/{slug}/home` | `home.tsx` | 收件箱（去重 + 滑动归档 + 批量操作） |
| `/{slug}/board` | `board.tsx` | 看板 = AI 秘书 dashboard（7/30/90 天范围 + 2×2 指标带 + 任务进度 / 智能体运行数据 / 数据分析报告占位），数据源 `data/queries/dashboard.ts` |
| `/{slug}/voice` | `voice.tsx` | **桩**——tab 被 `RecordButton` 拦截，永不直接导航 |
| `/{slug}/chat` | `chat.tsx` | 聊天（单屏 IA：消息列表 + composer + 实时任务时间线） |
| `/{slug}/mine` | `mine.tsx` | 我的（身份卡 / 工作区卡 / 工作 / 设置导航） |
| `/{slug}/my-issues` | `my-issues.tsx` | 我的事项（push 屏，Assigned / Created / Agents 三 scope，按 `BOARD_STATUSES` 分组；从 board tab 迁出） |

### 详情 / 编辑（push / modal）

| URL | 文件 | 类型 |
|---|---|---|
| `/{slug}/issue/[id]` | `issue/[id].tsx` | 事项详情（时间线 + 内联评论 + 属性 chip 行 + 每记录实时订阅） |
| `/{slug}/issue/[id]/edit` | `issue/[id]/edit.tsx` | modal，标题 + 描述 |
| `/{slug}/issue/[id]/runs` | `issue/[id]/runs.tsx` | formSheet，Agent 运行记录（Active / Past，可取消；终态行可点击进回放） |
| `/{slug}/issue/[id]/runs/[taskId]` | `issue/[id]/runs/[taskId].tsx` | formSheet，单次 run 回放（触发 + ChatTimeline 执行步骤 + 文本行 + 结果/错误 + 用量） |
| `/{slug}/issue/[id]/comment/[commentId]/emoji-picker` | `…/emoji-picker.tsx` | formSheet，评论表情选择 |
| `/{slug}/issue/[id]/emoji-picker` | `issue/[id]/emoji-picker.tsx` | formSheet，issue 表情选择（来自反应行 "+" → More reactions…） |
| `/{slug}/project/[id]` | `project/[id].tsx` | 项目详情（属性 / 资源 / 相关事项） |
| `/{slug}/project/[id]/edit` | `project/[id]/edit.tsx` | modal |
| `/{slug}/project/[id]/add-resource` | `project/[id]/add-resource.tsx` | formSheet，附加 GitHub 仓库资源 |
| `/{slug}/project/new` | `project/new.tsx` | modal，新建项目 |
| `/{slug}/new-issue` | `new-issue.tsx` | modal，新建事项（草稿 store 支撑） |
| `/{slug}/search` | `search.tsx` | modal，工作区搜索（issue + project，300ms 防抖） |

### 工作区级 formSheet

| URL | 文件 | 内容 |
|---|---|---|
| `/{slug}/chat-sessions` | `chat-sessions.tsx` | 会话切换器 |
| `/{slug}/switch-workspace` | `switch-workspace.tsx` | 工作区切换 |
| `/{slug}/issues-filter` | `issues-filter.tsx` | 状态 + 优先级筛选 |
| `/{slug}/mention-picker` | `mention-picker.tsx` | @提及选择（comment / chat 两模式） |

### 语音（push，原型）

| URL | 文件 | 内容 |
|---|---|---|
| `/{slug}/voice-record` | `voice-record.tsx` | **占位**（录音，无功能） |
| `/{slug}/voice-talk` | `voice-talk.tsx` | hold-to-talk 模拟（松手发送硬编码"你好"） |
| `/{slug}/voice-translate` | `voice-translate.tsx` | **占位**（翻译，无功能） |

### 更多 / 设置

`more/issues.tsx`（全工作区事项）、`more/projects.tsx`、`more/agents.tsx`（**智能体名册**：名称/可用性/负载/进行中事项 + 战队区块，read-only v1）、`more/pins.tsx`、`more/settings.tsx`（设置中心 + 主题）、`more/settings/profile.tsx`、`more/settings/notifications.tsx`。

### Picker 路由族（全部 formSheet）

- **事项属性**：`issue/[id]/picker/{status,priority,assignee,label,project,due-date}.tsx` —— 读写真实缓存（useUpdateIssue）。
- **新建事项草稿**：`new-issue-picker/{status,priority,project,due-date,assignee}.tsx` —— 读写 `useNewIssueDraftStore`（issue 尚不存在，无缓存可读）。
- **新建项目草稿**：`new-project-picker/{status,priority}.tsx`。
- **项目属性**：`project/[id]/picker/{status,priority,lead}.tsx`。

### Sheet 呈现约定（SHEET_OPTIONS）

所有 picker/选择类 sheet 走统一 `SHEET_OPTIONS`：`presentation:"formSheet"` + `sheetGrabberVisible:true` + `sheetAllowedDetents:[0.6, 0.95]` + `sheetCornerRadius:20` + `headerShown:false`（`[workspace]/_layout.tsx` 常量）。理由：iOS 26 + Expo 55 的 `fitToContents` 有零尺寸 bug；chip 行内多 picker 手势必须一致（Linear / Things / 苹果备忘录同款）。部分 picker 用原生 `UISearchController`（assignee / project / mention / lead）。**已知不一致**：label / project picker 调了 `useNativeSearchBar` 但 layout 未开 `headerShown`。

---

## 7. 屏幕功能清单

### 7.1 首页（Inbox）
- `deduplicateInboxItems`（`lib/inbox-display.ts`，镜像 web）→ 过滤 archived、按 issue_id 分组取新、降序。
- 行：状态图标 + 类型感知标签 + 右侧堆叠信息；**滑动只显示归档按钮、不自动触发**，过阈值一次 haptic（`swipeable-inbox-row.tsx`）。
- 点行 → 标记已读（`onMutate` 里 **先** `setQueryData` 再 `cancelQueries`，避免 iOS 快照冻结未读样式）→ push 事项详情（可带评论高亮）。
- 批量：ActionSheet（全部已读 / 归档已读 / 归档已完成 / 全部归档）。
- 未读数徽标：home 与 chat tab，截断 "99+"。

### 7.2 我的事项（My Issues，`app/(app)/[workspace]/my-issues.tsx`）
- 从 board tab 迁出的 push 屏（board 现为 dashboard，见 §6 路由表）；布局注册 title "我的事项"。
- 三 scope：Assigned（`assignee_id`）/ Created（`creator_id`）/ Agents（`involves_user_id`，含所属 agent + 相关 squad）。
- `SectionList` 按 `BOARD_STATUSES` 分组（cancelled 不显示），空状态 section 过滤。
- 状态 + 优先级筛选 → `issues-filter?scope=my`，筛选状态存 `useMyIssuesViewStore`，切换工作区时清空。
- "Assigned / Created / Agents" 标签在 SE3 上压缩为 "Agents"（343pt 可用宽度）。

### 7.3 聊天（Chat）
- 单屏 IA（无 `/chat/[id]` 子路由）：当前会话消息列表 + `MessageComposer`。
- 发送：手写乐观突发（seed 消息 → seed pendingTask → POST → 用真实 task_id 打补丁），非 TanStack mutation。
- 会话切换：`chat-sessions` formSheet（未读点、长按删除），经 `useChatSessionPickerStore` 跨路由传参。
- 头部：会话标题（可点开切换器）+ "⋯"（删除/新建）+ agent 选择 Modal。
- 实时：`use-chat-session-realtime(sessionId)`，任务时间线（`chat-timeline.tsx`，thinking/tool calls 可折叠）、quick_actions 骨架。
- 横幅：无可用 agent（`no-agent-banner`）、runtime 离线（`offline-banner`）、runtime 未绑定（`runtime-required-banner`）。

### 7.4 事项详情
- 时间线 FlashList（ASC、下拉刷新、从 inbox 深链可高亮）。
- 评论线程（parent_id 内联回复，孤儿回复提升）、@提及、附件、反应、quick_actions 生成的折叠卡。
- 属性 chip 行（status / priority / assignee / label / project / due-date）→ 各自 formSheet picker。
- 头部：`MUL-NN` + 标题 + ambient agent badge（agent 工作中，点按 → runs sheet）+ "⋯" ActionSheet（置顶 / 复制 / 打开 web / 编辑 / 删除）。
- 每记录实时：`useIssueRealtime(id, onDeleted)`。

### 7.5 项目详情
- 头部卡（emoji icon + 标题 + 描述 + 进度条）。
- 属性区（status / priority / lead 可点行）。
- 资源区：外部资源链接（GitHub 仓库），点击打开、长按删除。
- 相关事项：按 Open / Done 分组（**列表不是 kanban，有意为之**）。

### 7.6 搜索
- issue + project 同屏，300ms 防抖 + abort 策略；分类排序（项目 → 活跃事项 → 已取消）；Recent 事项；评论匹配带高亮 + 片段。

### 7.7 设置 / 我的
- 主题选择（light / dark / system，持久化到 SecureStore key `theme-preference`）。
- 个人资料编辑（改名 + 换头像，原生 ActionSheet 选图 + PATCH /api/me 回写）。
- 通知偏好：6 组 + 系统开关，乐观 PATCH（同一工作区串行化）。

---

## 8. 组件库清单

`components/` 按域组织，通用原语在 `components/ui/`（RNR/shadcn 风格），领域组件在 `components/<domain>/`。三原则：**已有模式优先 / 默认值优先 / iOS 原生 > RNR > 讨论**；新通用原语门槛 = 3 个调用方且 RNR 没有。

| 域 | 组件 |
|---|---|
| `ui/` | actor-avatar、app-header-actions、autosize-textarea、avatar、avatar-stack、button、card、collapsible、dropdown-menu、radio-group、separator、skeleton、switch、tabs、header、icon-button、input-tokens、input（shim）、modal-close-button、nav-row、section-group、otp-input、presence-dot、pulse-dot、priority-icon、status-icon、project-icon、project-priority-icon、project-status-icon、text、text-field |
| `brand/` | multica-logo |
| `composer/` | message-composer（聊天与评论共用：折叠 pill → 展开：回复 chip / @/图片/文件 / 工具栏） |
| `editor/` | markdown-toolbar、use-file-attach（图片/文档选择 + /api/upload-file） |
| `chat/` | agent-picker-sheet、chat-composer、chat-empty-state、chat-message-list、chat-session-actions、chat-timeline、chat-title-button、message-long-press、no-agent-banner、offline-banner、runtime-required-banner、status-pill |
| `issue/` | activity-row、agent-activity-row、agent-header-badge、attribute-chip、attribute-row、comment-attachment-list、comment-card、comment-context-menu、composer-attachment-row、create-form-attribute-row、description-field、inline-comment-composer、issue-description、issue-header-card、issue-reaction-row、reaction-bar、issue-row、issues-loading、mention-suggestion-bar、run-row、submit-issue-button、timeline-list、pickers/*（assignee/due-date/label/mention/priority/project/status 纯体） |
| `project/` | project-header-card、project-properties-section、project-related-issues、project-resources-section、project-row、pickers/* |
| `inbox/` | inbox-row、swipeable-inbox-row、detail-label |
| `voice/` | record-button、voice-overlay、voice-prototype-placeholder |
| `workspace/` | workspace-avatar |

> 注：RNR 迁移进行中（`apps/mobile/docs/rnr-migration.md`），部分 `components/ui/` 为迁移前手写遗留（21 个），规则是「只有为真实原因改动该文件时才顺带升级（Tier C）」——**禁止顺手重写**。

---

## 9. 数据层

### 9.1 ApiClient（`data/api.ts`）
- 移动端自持、mirror core 子集。Base URL 取 `EXPO_PUBLIC_API_URL`（缺失则 module 加载即抛错）。
- 鉴权：Bearer token（`api.setToken`）；请求头含 `X-Workspace-Slug` / `X-Client-Platform:mobile` / `X-Client-OS:ios` / `X-Client-Version` / `X-Request-ID`。**无 cookie / CSRF**（移动端不需要）。
- `fetchValidated(path, schema, fallback, opts)` / `fetchValidatedWith(...)`：fetch + `parseWithFallback` 封装，新只读方法必须用。fallback 对象须与成功类型完全一致（`EMPTY_USER` / `EMPTY_*` 哨兵模式）。
- **30s 硬超时**（`FETCH_TIMEOUT_MS`）：手动 AbortController + setTimeout（Hermes 无 `AbortSignal.timeout/any`）；调用方 `signal` 经 "abort" 事件监听转发。
- 401：`onUnauthorized` 回调（登出 + 清工作区 + 清 Query 缓存 + 去 /login，`signingOutRef` 幂等）。
- 请求日志：`[api] → METHOD path {rid}` / `[api] ← STATUS path {rid, duration}`，5xx error / 404 warn / 成功 log。
- 方法域：auth/me、notification-preferences、workspaces、inbox、members/agents/runtimes/agent-task-snapshot/squads、issues（含 timeline/attachments/task-runs）、comments/reactions、labels、projects（含 resources）、chat（sessions/messages/pending-task/cancel）、pins、`uploadFile`（multipart，不走 `this.fetch`）。
- 完整端点清单见 `docs/api-interfaces.md`（含状态图例与来源行号）。

### 9.2 查询层（`data/queries/`）
- 每个工作区级特性暴露 **3 段 key 工厂**（`["inbox", wsId, "list"]` 形状，与 web 对齐）。
- 工厂：`issue-keys`（含 myList 按 scope/filter 分 key）、`inbox`、`chat`（messages/pendingTask/taskMessages 按会话/任务 key；chat 查询 `staleTime: Infinity`，靠 WS 保鲜）、`projects`（byProject 挂在 issues 前缀下，使 issue:* 失效可达）、`labels`、`members`、`agents`、`notification-preferences`、`pins`（per-user-per-workspace）、`workspaces`、`agent-task-snapshot`（**跳过** task:progress/message 防失效风暴）、`runtimes`、`squads`。
- 硬规则：每个 `queryFn` 必须解构 `{ signal }` 传给 api（grep `queryFn: () =>` 应为 0 命中）。

### 9.3 变更层（`data/mutations/`）
- 乐观模式：快照 → 补丁 → 失败回滚 → settle 失效；「同步 setQueryData 先于 await cancelQueries」是硬规则（iOS 快照）。
- `issues.ts`：createComment（乐观合成时间线项，**失败不回滚**，配合 `failed-comments-store` 内联 Retry/Discard）、toggle/edit/delete comment、resolve/unresolve、issue reaction、updateIssue、attach/detach label（幂等去重）、createIssue（不乐观）、deleteIssue（setQueriesData 前缀清理）、cancelTask。
- `projects.ts`：create/update/delete project + resource（同步 `resource_count`）。
- `chat.ts`：create/delete session、mark read；**发送消息不是 mutation**（聊天屏手写乐观突发）。
- `inbox.ts`：markRead（含快照规则）、archive（同 issue_id 全归档）、批量归档（只失效，服务端谓词不在行上）。
- `pins.ts`：create（乐观桩 + max+1）、delete。
- `notification-preferences.ts`：derive patch 用 core 纯函数；`scope` 串行化同工作区并发切换。

### 9.4 实时层（`data/realtime/`）
三层栈：

```
L1  ws-client.ts          单 socket、无 React；三态 idle/active/paused；
                           指数退避 + 全抖动（1s 基、30s 顶、exp6）
L2  realtime-provider.tsx 持有 WSClient；随 auth + workspace + AppState + NetInfo 挂载/卸载
L3  use-<feature>-realtime 每特性订阅：事件 → 缓存变更
```

- **挂载策略**：列表级全局（`<RealtimeSubscriptions />` 在 `[workspace]/_layout.tsx`，无参数、工作区生命周期）vs 每记录（屏幕内以路由 id 参数挂载、卸载即清理）。
- **patch-over-invalidate**：payload 带完整对象就 `setQueryData`，仅在「只有 id / 缓存形态不匹配 / 事件稀少 / 重连后」才 invalidate（蜂窝流量法则）。
- **事件必胜**：乐观态与后续 WS 事件冲突时，WS 覆盖（服务端为真，不搞时间戳比较）。
- **重连处理**：每个 hook 只失效自己的 key（无全局全失效扫荡）。
- **跨特性补丁**：被补丁的特性拥有 updater 并订阅外来事件（inbox 拥有 `patchInboxIssueStatus` / `dropInboxItemsByIssue`，订阅 issue:updated/deleted）。
- **更新器**：`issue-ws-updaters.ts`（最大：patchIssueDetail / appendTimelineEntry / removeCommentCascade(BFS) / patchMyIssuesList / 反应 / commentToTimelineEntry）、`inbox-ws-updaters.ts`、`chat-ws-updaters.ts`（applyChatDoneToCache + echo-guard / quick_actions 先取消在途 refetch / pending 任务种子与晋升 / appendTaskMessage 按 seq 去重）、`project-ws-updaters.ts`。
- **hooks**：inbox / my-issues / issues / issue / chat-sessions / chat-session / pins / presence / projects / project。

### 9.5 本地状态（Zustand）
- `data/stores/`：chat-drafts、chat-session-picker（跨路由通道）、failed-comments（乐观失败待重发）、issues-view（全工作区事项筛选）、last-viewed（"New since last view" 分界线）、mention-draft（评论 @提及 chip）、my-issues-view、new-issue-draft、new-project-draft、reply-target、voice（sheetOpen/recording 协调按钮与浮层）。
- 顶层：`auth-store`（token 仅 verifyCode 成功时写入）、`workspace-store`（slug 持久化到 SecureStore `multica_current_workspace_slug`）、`secure-storage`（token key `multica_token`，与 web/desktop 一致）、`chat-select-store` / `comment-select-store`（文本选择模式）、`viewed-issues-store`（LRU cap 10 最近查看，供 @提及 Recent）。

### 9.6 Schema / fallback（`data/schemas.ts`）
- 宽松默认：`.loose()` 放行未知字段、enum `.catch()` 降级未知值、`.default()` 补缺失数组、空串 id = "漂移/未找到" 哨兵。
- 覆盖 attachments / comments / notification-preferences / labels / projects / chat（含 pending-task / task-message 清洗）/ search / agent-tasks / boot 实体（user / workspace / pin / inbox / member）/ agents / runtimes（status catch 到 offline）/ squads。
- 部分 schema 复用 `@multica/core/api/schemas.ts`（纯 zod 导出，在移动端白名单内）。

### 9.7 lib/ 领域规则（`lib/`）
- 镜像规则：`issue-status`（BOARD_STATUSES）、`project-status`、`filter-issues`、`timeline-coalesce`（连续同类活动合并）、`timeline-thread`（评论整链归并）、`inbox-display`（去重 + 标题）、`unread-counts`、`attachment-dedup` / `attachment-url`、`can-assign-agent`、`is-agent-runtime-bound`、`failure-reason-label`、`workspace-agent-availability`、`format-activity` / `format-elapsed` / `time-ago`、`inline-color`、`quick-emojis`、`auth-error`、`mention-serialize`。
- 基础设施：`parse-response`（parseWithFallback，漂移防御边界）、`request-id`、`utils`（cn）、`theme`。
- Hooks：`use-agent-presence`（30s tick 门控 AppState）、`use-workspace-presence-prefetch`、`use-ws-subscriptions`、`use-clear-filters-on-workspace-change`、`use-color-scheme`、`use-mention-input`、`use-native-search-bar`、`use-scroll-to-top-on-change`、`use-send-voice-message`。
- `lib/markdown/`：混合渲染（markdown.tsx / shiki.ts / split-markdown / preprocess / code-block / image-sequence / lightbox-provider / markdown-image）。

---

## 10. 语音 / BLE 原型现状

### 已实现（真实、端到端）
1. **Tab 即动作交互**（`components/voice/record-button.tsx`）：2s 阈值区分点按与长按。短按 → 打开语音底栏；长按 ≥2s → haptic + 4 柱均衡器动画"录音中"；松手 → haptic 成功 + `useSendVoiceMessage().send("你好")` + 切到聊天 tab。**无真实麦克风采集，是状态机演示**。
2. **语音底栏 + 浮层**（`components/voice/voice-overlay.tsx`）：短按底栏三项「录音 / 翻译 / 发送语音」→ push `voice-record` / `voice-translate` / `voice-talk`；全屏录音浮层（同心波纹 + 计时器，`pointerEvents="none"`，手指保持在按钮上）。
3. **hold-to-talk 发送通道**（`app/(app)/[workspace]/voice-talk.tsx`）：按住说话 → 松手发送硬编码文本 **"你好"**。`useSendVoiceMessage`（`lib/use-send-voice-message.ts`）解析第一个非归档 agent + 第一个非归档会话（无则创建），POST 真实聊天消息，失效聊天缓存。**发送的是真实文本消息，不是音频**。
4. **状态 store**（`data/stores/voice-store.ts`）：内存 Zustand（`sheetOpen` / `recording`），协调 Tab 内按钮与兄弟浮层，无持久化。

### 占位（无功能）
- `voice-record.tsx`（录音）与 `voice-translate.tsx`（翻译）：渲染 `VoicePrototypePlaceholder`（"原型占位 · 功能开发中"），真实采集 + ASR / 翻译待后续 issue。
- 语音 tab 的 backing route `(tabs)/voice.tsx` 是纯桩（Redirect）。

### 结论
**当前没有音频录制、ASR、翻译、BLE 任何真实能力**。语音产品线只验证了「语音入口交互 + 把文本送进聊天通道」这条链路。后续方向（语音录制 / BLE 硬件接入 / ASR 转写）见 §15。

---

## 11. 多环境与构建发布

### 11.1 环境脚本（根 package.json / `apps/mobile/package.json`）

| 命令 | 行为 | 后端 |
|---|---|---|
| `pnpm dev` / `dev:mobile` | 仅 Metro（复用已装变体） | `.env.development.local`（本地） |
| `dev:mobile:staging` / `dev:mobile:prod` | 仅 Metro | `.env.staging` / `.env.production` |
| `pnpm ios` / `ios:mobile` | 完整重建 + 装到 **iOS 模拟器**，Debug | local |
| `ios:mobile:staging` / `ios:mobile:prod` | 同上 | staging / production |
| `pnpm ios:device` / `ios:mobile:device` | 完整重建 + 装到 **USB iPhone**，Debug | local |
| `ios:mobile:device:staging[:release]` | 装到真机 | staging |
| `ios:mobile:device:prod[:release]` | 装到真机，Release（独立） | production |

- `dev:*` 只起 Metro；`ios:*` 全量原生重建 + 安装。
- `APP_ENV` 由脚本注入（`cross-env`），`app.config.ts` 按 `development|staging|production` 切换 **bundleIdentifier 与显示名**，三变体可同机共存：
  - dev：`ai.multica.mobile.dev`（可被 `EXPO_BUNDLE_IDENTIFIER_DEV` 覆盖）；显示名 "Utter Office (Dev)"
  - staging：`ai.multica.mobile.staging`（不可覆盖）；"Utter Office (Staging)"
  - prod：`ai.multica.mobile`（可被 `EXPO_BUNDLE_IDENTIFIER_PROD` 覆盖）；"Utter Office"

> ⚠️ 磁盘上 `apps/mobile/ios/` 原生工程当前的 bundle id 是 **`com.utteroffice.mobile`**、team `9BN9DFZTBY`（Automatic）。若跑 `expo prebuild --clean` 会按 app.config.ts 重新生成，bundle id 变化需重装。

### 11.2 env 文件

| 文件 | 用途 | 现状 |
|---|---|---|
| `.env.example` | 模板 | 注释说明了所有脚本的读取关系 |
| `.env.development.local` | 本地开发（gitignore） | `EXPO_PUBLIC_API_URL=https://api.multica.ai`（**临时指向真实 multica 后端做对等验证**）+ `EXPO_BUNDLE_IDENTIFIER_DEV=com.utteroffice.mobile` |
| `.env.staging` | staging（提交） | `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL` 占位 host |
| `.env.production` | production（提交） | 占位 host |
| `.env.production.local` | prod 本地覆盖（gitignore） | 指向 api.multica.ai |

> `EXPO_PUBLIC_*` 在 Metro 启动时内联进 JS bundle；改文件需重启 Metro。Release 构建把值烤进内嵌 bundle，只能重建。**真机必须能访问该 URL**（本地开发用 Mac 局域网 IP，勿用 localhost）。

### 11.3 发布

- CI 主流水线（`.github/workflows/ci.yml`）`--filter='!@multica/mobile'`，移动端失败不阻塞 web/桌面。
- `mobile-verify.yml`：`apps/mobile/**` 或 `packages/core/types/**` 变更时跑 typecheck/lint/test（无 IPA 构建）。
- `mobile-release.yml`：`mobile-v*.*.*` tag → `eas build` + `eas submit`。
- OTA：EAS Update，仅 JS 变更不换 runtime 版本时推 preview/production channel。移动端发布节奏与主 `v*.*.*` 解耦。

### 11.4 真机运行

```bash
pnpm ios:device          # 或 pnpm ios:mobile:device:staging / :prod
pnpm ios:device:prod:release   # 独立 Release 装到 iPhone
```

前提：Mac + Xcode、Apple ID 加入 Xcode Accounts、iPhone 开 Developer Mode 并信任电脑。免费 Apple ID 签名 7 天有效。首次构建拉 CocoaPods + 从源码编 RN，约 10–20 分钟；后续复用缓存。签名报 "No matching provisioning profiles" 时换一个自己拥有的 reverse-domain bundle id 重跑。

---

## 12. 认证与安全

- **密码邮箱验证码**：`/auth/send-code` → `/auth/verify-code` 换 `{token, user}`；token 存 `expo-secure-store`（key `multica_token`，与 web/桌面一致）。
- 冷启动：auth-store `initialize` → workspace-store `restoreSlug` → `api.getMe`；**仅 401 清 token**。
- 401 全链路：`onUnauthorized` → 清 token + 清 workspace + 清 Query 缓存 + 去 /login（`signingOutRef` 幂等）。
- 移动端**无 cookie / 无 CSRF**（Bearer 鉴权，攻击面不存在）。
- 运行时：每个请求 30s 超时 + AbortController；请求日志带 `X-Request-ID` 便于与后端遥测交叉定位。
- 主题偏好持久化到 SecureStore（`theme-preference`）。

---

## 13. 测试与质量

- `pnpm typecheck` / `pnpm lint`（turbo 编排，core + mobile）。
- `pnpm test`：vitest。core 121 文件 / 1343 tests；mobile 11 文件 / 62 tests（骨架交付时状态）。
- 移动端测试覆盖集中在**纯逻辑**：schema（`data/chat-schema.test.ts`、`data/inbox-schema.test.ts`）、realtime updaters（`chat-ws-updaters` / `issue-ws-updaters` / `ws-client`）、领域规则（`lib/agent-schema`、`attachment-dedup`、`attachment-url`、`inbox-display`、`markdown/preprocess`、`search-rows`）。
- 无组件/E2E 测试（骨架阶段）。

---

## 14. 现有文档索引

| 路径 | 内容 |
|---|---|
| `README.md`（根） | 产品定位、仓库结构、快速开始、真机运行 |
| `apps/mobile/README.md` | 移动端脚本表、真机两步走（Dev / Release） |
| `apps/mobile/CLAUDE.md` | 技术基线 + 全部移动端规则（必读） |
| `docs/api-interfaces.md` | **API 全量清单**（状态图例 + 来源文件行号） |
| `apps/mobile/docs/rnr-migration.md` | RNR 迁移计划（三档分类 + 阶段） |
| `apps/mobile/docs/markdown-rendering-adr.md` | Markdown 渲染 ADR |
| `apps/mobile/docs/markdown-renderer-research.md` | Markdown 渲染器调研 |

---

## 15. 当前状态与待办缺口

### 已验证（骨架交付时）
- `pnpm install` / `typecheck` / `lint` / `test` / `build`（expo export android）通过。
- `expo start` 可启动，Metro 8081 正常。

### 待办（README + 代码注释汇总）
1. **语音**：录音采集 / ASR 转写 / 翻译接口（voice-record / voice-translate 目前占位）。
2. **BLE 硬件接入**：硬件按钮作为需求输入（现状只有 hold-to-talk 模拟）。
3. **后端真实联调**：`.env.staging` / `.env.production` 是占位 host；当前 `dev` 变体临时指向 `api.multica.ai` 做对等验证，待 utter-office 自有后端就绪后替换。
4. **B 线功能状态**：④ 看板 dashboard 已合入 main（commit `1aec912`/`75f15bf`，6 个 `/api/dashboard/*` 端点 ✅，但服务端需上线并加入 API mirror 白名单）；③ 首页（统计卡/待办复用现有接口，行业简报占位）；⑤ 语音页（纯 UI）。
5. **core 发布**为内部 npm 包（方案 B）。
6. **建远端仓库**。
7. RNR 迁移剩余工作（见 `apps/mobile/docs/rnr-migration.md`）。

---

## 16. 与 StaffDeck 的整合切入点

> ⚠️ **本节已过期（2026-08-17）**。下文仍保留历史草稿，**不得再当作现行整合方案**。
>
> 现行依据：
> - 借鉴边界与 A/B/C 分级：[`docs/staffdeck-analysis.md`](./staffdeck-analysis.md) §10–§11
> - 移动端落地与分期：[`docs/app-prd.md`](./app-prd.md) v1.6（§2.1 / §2.5 / §7 / M4）
> - 可点击原型：[`docs/assets/prototypes/00-index.html`](./assets/prototypes/00-index.html)
>
> **明确废止的切入点**（与现行 C 级 / PRD §2.1 冲突）：看板加「竞价中」列、移植 OKF、竞标 arena、员工市场/安装带 SOP 的模板。本期只借治理层表达（员工即上下文、能力计数、档案分层、阻断提示、HITL），不移植 SOP 状态机 / OKF / 广场 / 竞标。

> ~~本节省略版。StaffDeck（面壁智能 / OpenBMB，2026-07-16 开源）是「企业数字员工平台」…~~（以下正文为历史草稿，仅供对照）

StaffDeck（面壁智能 / OpenBMB，2026-07-16 开源）是「企业数字员工平台」：把 AI agent 当正式员工治理——工号、岗位（财务/法务/HR/IT/行政）、能力边界、工作记录、KPI；agent 遵循 SOP（状态机）、依赖企业知识库（OKF 五层）、靠反馈进化；支持**多智能体团队**（TL、3 轮 HP 竞价 arena、团队黑板、任务生命周期 pending→bidding→in_progress→review→done/cancelled/escalated）、HITL、全链路审计、数字员工市场。

两者结合点非常自然——utter-office 已经有 agent/squad 实体、issue 任务流、语音/BLE 秘书入口：

| StaffDeck 概念 | utter-office 已有 | 缺的 |
|---|---|---|
| 数字员工（工号/岗位/KPI/工作记录） | 后端 `agent` 实体 + `involves_user_id`（MUL-2397） | 员工身份层展示 |
| 任务生命周期 + 竞价 arena | issue `BOARD_STATUSES` 状态流 | ~~`bidding` 状态 + arena 动作~~ **已废止** |
| 团队 TL / 黑板书 | chat 按 agent 分会话（voice-talk 已能发消息进会话） | ~~team 语义注入~~ **已废止为 StaffDeck 竞标子系统**；战队只读 |
| 知识库 OKF / 引用溯源 | 项目资源（`add-resource.tsx`）+ 评论 + pins | ~~知识分层~~ **已废止（领域不匹配）** |
| 进化闭环（负面反馈→SOP 修复） | 评论/回复/状态/实时 WS | 反馈自动分类→修复工单（仍可远期评估，非本期） |
| 数字员工市场 | 项目新建/选择流程 | 登记 B-7，非本期 |

**三个最自然的切入点**（历史草稿；现行以 PRD M4 为准）：

1. **Agents 标签页**（`more/agents.tsx` 占位）→ 数字员工名册（工号/岗位/在手任务/KPI）。**仍有效，见 PRD §7.5。**
2. ~~**语音输入 → 秘书派单 → 竞价**~~：**废止竞价**；保留语音 → 默认员工 / 派单。
3. ~~**看板加「竞价中」列**~~：**废止**；`IssueStatus` 扩展需跨端评审，见 PRD §14.2。

**落地路径**（历史）：P1 身份层 → … → P5 市场。**现行**：按 PRD M1–M4；后端缺口只登记 §10.2。

**硬约束与风险**：
- **行为语义一致性**（CLAUDE.md 铁律）：数字员工模型必须先进后端（`packages/core` + Multica 服务端），移动端只是渲染层，不能做成移动端独有覆盖层。
- 批判视角：多数公司 SOP 未成熟到可严格机器执行；"员工"隐喻易误导管理预期——应框定为「受治理的软件角色」（模型+知识+流程+工具+权限+记忆+监督的封装单元）。
- 治理：prompt 注入、记忆留存/编辑、隐私、知识归属需与现有权限逻辑对齐。
- 现实约束：当前未连真实后端、语音/ASR/BLE 未接入，P1–P5 现阶段主要是设计工作。

Sources:
- [OpenBMB/StaffDeck (GitHub)](https://github.com/OpenBMB/StaffDeck)
- [feat(teams): multi-agent team support with TL, bidding arena, and blackboard · PR #96](https://github.com/OpenBMB/StaffDeck/pull/96)
- [面壁智能开源企业AI数字员工平台StaffDeck](https://www.lumevalley.com/article-5541.html)
- [StaffDeck - 开源的企业级数字员工平台（百科）](https://baike.baidu.com/item/StaffDeck/68295930)
- [ModelBest Open-Sources StaffDeck: Betting Digital Employees Can Outgrow Chatbots](https://www.remio.ai/post/modelbest-open-sources-staffdeck-betting-digital-employees-can-outgrow-chatbots)
