/**
 * Home todo preview mock (B 类). Live assigned issues take over when present.
 * 对应 PRD §4.5；有真实待办后自动不再使用。
 */
import type { Issue } from "@multica/core/types";
import { addDaysDateOnly, todayDateOnly } from "@multica/core/issues/date";

const HOUR = 3600_000;

function isoHoursAgo(hours: number, now = Date.now()): string {
  return new Date(now - hours * HOUR).toISOString();
}

function issue(
  partial: Pick<Issue, "id" | "number" | "identifier" | "title" | "status"> &
    Partial<Issue>,
  now = Date.now(),
): Issue {
  return {
    workspace_id: "mock",
    description: null,
    priority: "medium",
    assignee_type: "agent",
    assignee_id: "kimi",
    creator_type: "member",
    creator_id: "mock-user",
    parent_issue_id: null,
    project_id: null,
    position: 0,
    stage: null,
    start_date: null,
    due_date: null,
    metadata: {},
    properties: {},
    created_at: isoHoursAgo(20, now),
    updated_at: isoHoursAgo(6, now),
    ...partial,
  };
}

export function listMockTodos(now = Date.now()): Issue[] {
  const today = todayDateOnly();
  return [
    issue(
      {
        id: "mock-todo-blocked",
        number: 42,
        identifier: "MUL-42",
        title: "鉴权中间件在 staging 被 CORS 拦下",
        status: "blocked",
        priority: "urgent",
        assignee_type: "agent",
        assignee_id: "codex",
        due_date: addDaysDateOnly(-1),
        updated_at: isoHoursAgo(30, now),
      },
      now,
    ),
    issue(
      {
        id: "mock-todo-review",
        number: 45,
        identifier: "MUL-45",
        title: "支付回调补测等你确认边界用例",
        status: "in_review",
        priority: "high",
        assignee_type: "member",
        assignee_id: null,
        due_date: today,
        updated_at: isoHoursAgo(8, now),
      },
      now,
    ),
    issue(
      {
        id: "mock-todo-running",
        number: 48,
        identifier: "MUL-48",
        title: "整理本周鉴权改造的风险面",
        status: "in_progress",
        assignee_type: "agent",
        assignee_id: "kimi",
        due_date: today,
        updated_at: isoHoursAgo(2, now),
      },
      now,
    ),
    issue(
      {
        id: "mock-todo-todo",
        number: 51,
        identifier: "MUL-51",
        title: "补 sqlc 查询与错误码映射",
        status: "todo",
        assignee_type: "agent",
        assignee_id: "codex",
        due_date: addDaysDateOnly(1),
        updated_at: isoHoursAgo(12, now),
      },
      now,
    ),
    issue(
      {
        id: "mock-todo-backlog",
        number: 53,
        identifier: "MUL-53",
        title: "权限矩阵文档同步到知识库",
        status: "backlog",
        assignee_type: "agent",
        assignee_id: "mika",
        due_date: addDaysDateOnly(3),
        updated_at: isoHoursAgo(18, now),
      },
      now,
    ),
  ];
}

export function isMockTodoId(id: string): boolean {
  return id.startsWith("mock-todo-");
}