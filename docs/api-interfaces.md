# AI 秘书（utter-office）API 接口清单

> 最后更新：2026-08-16
> API 基座：`api.multica.ai`
> 鉴权：邮箱验证码登录 → Bearer token；请求头带 `X-Workspace-Slug`（无 cookie / CSRF）

本文档是移动端实际对接的后端接口全量清单，标注每个接口的**状态**与**来源文件**，便于搜索与维护。

## 状态图例

| 标记 | 含义 |
|---|---|
| ✅ 已上线 | 已在 `main` 分支，移动端已对接并可用 |
| 🚧 未合入 | 在 B 线 ③④⑤ 分支（评审中），尚未合入 `main` |
| ⬜ 占位 | UI 已搭好，尚未对接真实数据源 |

## 架构说明（mirror, don't import）

移动端只镜像 `packages/core/api/client.ts` 中真正用到的子集，在 `apps/mobile/data/api.ts` 独立实现（重试 / 超时 / 401 处理），类型与 zod schema 从 `@multica/core` 只读导入（零运行时耦合）。

| 层 | 来源文件 |
|---|---|
| REST 封装（全部端点） | `apps/mobile/data/api.ts` |
| 查询缓存（TanStack Query） | `apps/mobile/data/queries/*.ts` |
| 变更（mutations） | `apps/mobile/data/mutations/*.ts` |
| 实时推送（WebSocket） | `apps/mobile/data/realtime/ws-client.ts` + `use-*-realtime.ts` |
| 鉴权 / token | `apps/mobile/data/auth-store.ts` + `secure-storage.ts`（`expo-secure-store`，key `multica_token`） |

---

## 一、鉴权 / 用户

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/auth/send-code` | POST | ✅ | `data/api.ts:365` `sendCode` |
| `/auth/verify-code` | POST | ✅ | `data/api.ts:372` `verifyCode` |
| `/api/me` | GET | ✅ | `data/api.ts:379` `getMe` |
| `/api/me` | PATCH | ✅ | `data/api.ts:390` `updateMe` |
| `/api/notification-preferences` | GET | ✅ | `data/api.ts:404` `getNotificationPreferences` |
| `/api/notification-preferences` | PATCH | ✅ | `data/api.ts:414` `updateNotificationPreferences` |

## 二、工作区 / 成员 / 智能体 / 运行时 / 战队

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/workspaces` | GET | ✅ | `data/api.ts:433` `listWorkspaces` |
| `/api/workspaces/{wsId}/members` | GET | ✅ | `data/api.ts:495` `listMembers` |
| `/api/agents` | GET | ✅ | `data/api.ts:504` `listAgents` |
| `/api/runtimes` | GET | ✅ | `data/api.ts:516` `listRuntimes` |
| `/api/agent-task-snapshot` | GET | ✅ | `data/api.ts:532` `getAgentTaskSnapshot` |
| `/api/squads` | GET | ✅ | `data/api.ts:541` `listSquads` |

## 三、收件箱（Inbox）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/inbox` | GET | ✅ | `data/api.ts:444` `listInbox` |
| `/api/inbox/{id}/read` | POST | ✅ | `data/api.ts:453` `markInboxRead` |
| `/api/inbox/{id}/archive` | POST | ✅ | `data/api.ts:462` `archiveInbox` |
| `/api/inbox/mark-all-read` | POST | ✅ | `data/api.ts:466` `markAllInboxRead` |
| `/api/inbox/archive-all` | POST | ✅ | `data/api.ts:472` `archiveAllInbox` |
| `/api/inbox/archive-all-read` | POST | ✅ | `data/api.ts:478` `archiveAllReadInbox` |
| `/api/inbox/archive-completed` | POST | ✅ | `data/api.ts:484` `archiveCompletedInbox` |

## 四、事项（Issues）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/issues` | GET | ✅ | `data/api.ts:568` `listIssues` |
| `/api/issues/search` | GET | ✅ | `data/api.ts:592` `searchIssues` |
| `/api/issues/{id}` | GET | ✅ | `data/api.ts:605` `getIssue` |
| `/api/issues` | POST | ✅ | `data/api.ts:617` `createIssue` |
| `/api/issues/{id}` | PUT | ✅ | `data/api.ts:806` `updateIssue` |
| `/api/issues/{id}` | DELETE | ✅ | `data/api.ts:816` `deleteIssue` |
| `/api/issues/{id}/timeline` | GET | ✅ | `data/api.ts:634` `listIssueTimeline` |
| `/api/issues/{id}/attachments` | GET | ✅ | `data/api.ts:650` `listIssueAttachments` |
| `/api/issues/{id}/active-task` | GET | ✅ | `data/api.ts:666` `getIssueActiveTask` |
| `/api/issues/{id}/task-runs` | GET | ✅ | `data/api.ts:682` `listIssueTaskRuns` |

## 五、评论 / 反应（Comments / Reactions）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/issues/{id}/comments` | GET | ✅ | `data/api.ts:699` `listIssueComments` |
| `/api/issues/{id}/comments` | POST | ✅ | `data/api.ts:699` `createComment` |
| `/api/comments/{id}` | PUT | ✅ | `data/api.ts:722` `updateComment` |
| `/api/comments/{id}` | DELETE | ✅ | `data/api.ts:739` `deleteComment` |
| `/api/comments/{id}/resolve` | POST | ✅ | `data/api.ts:745` `resolveComment` |
| `/api/comments/{id}/resolve` | DELETE | ✅ | `data/api.ts:756` `unresolveComment` |
| `/api/comments/{id}/reactions` | POST | ✅ | `data/api.ts:770` `addReaction` |
| `/api/comments/{id}/reactions` | DELETE | ✅ | `data/api.ts:777` `removeReaction` |
| `/api/issues/{id}/reactions` | POST | ✅ | `data/api.ts:788` `addIssueReaction` |
| `/api/issues/{id}/reactions` | DELETE | ✅ | `data/api.ts:795` `removeIssueReaction` |

## 六、标签（Labels）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/labels` | GET | ✅ | `data/api.ts:823` `listLabels` |
| `/api/labels` | POST | ✅ | `data/api.ts:838` `createLabel` |
| `/api/issues/{id}/labels` | POST | ✅ | `data/api.ts:849` `attachLabel` |
| `/api/issues/{id}/labels/{labelId}` | DELETE | ✅ | `data/api.ts:863` `detachLabel` |

## 七、项目（Projects）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/projects` | GET | ✅ | `data/api.ts:872` `listProjects` |
| `/api/projects/search` | GET | ✅ | `data/api.ts:895` `searchProjects` |
| `/api/projects/{id}` | GET | ✅ | `data/api.ts:910` `getProject` |
| `/api/projects` | POST | ✅ | `data/api.ts:926` `createProject` |
| `/api/projects/{id}` | PATCH | ✅ | `data/api.ts:936` `updateProject` |
| `/api/projects/{id}` | DELETE | ✅ | `data/api.ts:943` `deleteProject` |
| `/api/projects/{id}/resources` | GET | ✅ | `data/api.ts:952` `listProjectResources` |
| `/api/projects/{id}/resources` | POST | ✅ | `data/api.ts:968` `createProjectResource` |
| `/api/projects/{id}/resources/{resourceId}` | PATCH/DELETE | ✅ | `data/api.ts:981` `update/deleteProjectResource` |

## 八、聊天（Chat）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/chat/sessions` | GET | ✅ | `data/api.ts:994` `listChatSessions` |
| `/api/chat/sessions` | POST | ✅ | `data/api.ts:1011` `createChatSession` |
| `/api/chat/sessions/{id}` | DELETE | ✅ | `data/api.ts:1026` `deleteChatSession` |
| `/api/chat/sessions/{id}/messages` | GET | ✅ | `data/api.ts:1034` `listChatMessages` |
| `/api/chat/sessions/{id}/messages` | POST | ✅ | `data/api.ts:1062` `sendChatMessage` |
| `/api/chat/sessions/{id}/pending-task` | GET | ✅ | `data/api.ts:1083` `getChatPendingTask` |
| `/api/chat/sessions/{id}/read` | POST | ✅ | `data/api.ts:1096` `markChatSessionRead` |

## 九、任务运行（Task runs）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/tasks/{id}/cancel` | POST | ✅ | `data/api.ts:1102` `cancelTaskById` |
| `/api/tasks/{id}/messages` | GET | ✅ | `data/api.ts:1115` `listTaskMessages` |

## 十、置顶 / 文件（Pins / Files）

| 接口 | 方法 | 状态 | 来源文件 |
|---|---|---|---|
| `/api/pins` | GET | ✅ | `data/api.ts:1129` `listPins` |
| `/api/pins` | POST | ✅ | `data/api.ts:1142` `addPin` |
| `/api/pins/{type}/{id}` | DELETE | ✅ | `data/api.ts:1161` `deletePin` |
| `/api/pins/reorder` | POST | ✅ | `data/api.ts:1167` `reorderPins` |
| `/api/upload-file` | POST | ✅ | `data/api.ts:1199` `uploadFile`（multipart） |
| `/api/attachments/{id}/download` | GET | ✅ | URL 拼接，非独立 fetch；取自服务端返回的 `download_url`/`markdown_url` 字段，见 `lib/attachment-dedup.ts` |

---

## 十一、实时推送（WebSocket）

- 连接：`wss://host/ws`（无 query，客户端自行拼接，见 `data/realtime/ws-client.ts:51`）
- 订阅事件（`data/realtime/use-*-realtime.ts` 逐个声明）：

| 域 | 事件 |
|---|---|
| issue | `issue:created` `issue:updated` `issue:deleted` `issue_attachments:changed` `issue_labels:changed` `issue_reaction:added/removed` |
| comment | `comment:created` `comment:updated` `comment:deleted` `comment:resolved` `comment:unresolved` |
| inbox | `inbox:new` `inbox:read` `inbox:archived` `inbox:unarchived` `inbox:batch-read` `inbox:batch-archived` `inbox:unread` |
| chat | `chat:message` `chat:done` `chat:session_updated` `chat:session_read` `chat:session_deleted` `chat:quick_actions` |
| project | `project:created` `project:updated` `project:deleted` |
| pin | `pin:created` `pin:deleted` `pin:reordered` |
| agent | `agent:created` `agent:archived` `agent:restored` `agent:status` |
| 其他 | `task:cancelled` `activity:created` `daemon:register` `reaction:added/removed` |

---

## 十二、B 线新增（未合入 `main`）

### ④ 看板（分支 `agent/mmsan/4376479f`）

6 个 `/api/dashboard/*` 聚合端点，方法定义在**该分支的** `data/api.ts:708-806`，查询工厂在 `data/queries/dashboard.ts`：

| 接口 | 方法 | 状态 | 来源文件（分支内） |
|---|---|---|---|
| `/api/dashboard/usage/daily` | GET | 🚧 | `data/api.ts:708` `getDashboardUsageDaily` |
| `/api/dashboard/usage/by-agent` | GET | 🚧 | `data/api.ts:724` `getDashboardUsageByAgent` |
| `/api/dashboard/agent-runtime` | GET | 🚧 | `data/api.ts:740` `getDashboardAgentRunTime` |
| `/api/dashboard/runtime/daily` | GET | 🚧 | `data/api.ts:758` `getDashboardRunTimeDaily` |
| `/api/dashboard/failures/daily` | GET | 🚧 | `data/api.ts:776` `getDashboardFailuresDaily` |
| `/api/dashboard/failures/by-agent` | GET | 🚧 | `data/api.ts:794` `getDashboardFailuresByAgent` |

> ⚠️ 这 6 个端点是新面：服务端需先上线并加入平台 **API mirror 白名单**，否则真机请求会 404（④ 的两版实现均已标注此待办）。

### ③ 首页（分支 `agent/mmsan/2ec29e87`）

| 区块 | 数据源 | 状态 |
|---|---|---|
| 统计卡 / 待办 | 复用现有 `/api/issues`（个人事项） | ✅ |
| 行业简报 | **占位**（`简报生成中` 空态），真实数据源等 A 线 COD-16 落地 | ⬜ |

### ⑤ 语音页（分支 `agent/mmsan/voice-meet-think`）

| 能力 | 状态 |
|---|---|
| 录音 / 翻译 / 发语音（meet-think 结构） | ⬜ 纯 UI，无真实采集 / ASR / 翻译接口 |

---

## 维护说明

- 端点新增/删除时同步更新本文档的**状态**与**来源文件行号**（行号随 `data/api.ts` 变化，定位时以方法名为准）。
- 状态流转：`🚧 未合入` → 分支合并到 `main` 后改为 `✅ 已上线`；`⬜ 占位` → 数据源对接后改为 `✅ 已上线`。
