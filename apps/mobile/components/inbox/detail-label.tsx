/**
 * Mobile InboxDetailLabel — type-aware second-line for inbox rows.
 *
 * Behaviour mirrors packages/views/inbox/components/inbox-detail-label.tsx
 * (same type branches / detail fields). Display copy is Chinese per PRD §9.5.
 */
import { View } from "react-native";
import type {
  InboxItem,
  InboxItemType,
  IssueStatus,
  IssuePriority,
} from "@multica/core/types";
import { formatDateOnly } from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { useActorLookup } from "@/data/use-actor-name";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/lib/issue-status";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<InboxItemType, string> = {
  issue_assigned: "已指派",
  issue_subscribed: "已订阅",
  unassigned: "已取消指派",
  assignee_changed: "已改派",
  status_changed: "状态已变更",
  priority_changed: "优先级已变更",
  start_date_changed: "开始日期已变更",
  due_date_changed: "截止日期已变更",
  new_comment: "新评论",
  mentioned: "被提及",
  review_requested: "请求评审",
  task_completed: "任务已完成",
  task_failed: "任务失败",
  agent_blocked: "数字员工受阻",
  agent_completed: "数字员工已完成",
  reaction_added: "新增反应",
  quick_create_done: "快速创建完成",
  quick_create_failed: "快速创建失败",
  quick_create_unconfirmed: "快速创建待确认",
};

function shortDate(dateStr: string): string {
  return formatDateOnly(dateStr, { month: "short", day: "numeric" }, "zh-CN");
}

function singleLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function InboxDetailLabel({
  item,
  className,
}: {
  item: InboxItem;
  className?: string;
}) {
  const { getName } = useActorLookup();
  const details = item.details ?? {};

  if (item.type === "status_changed" && details.to) {
    const status = details.to as IssueStatus;
    return (
      <View className={cn("flex-row items-center gap-1", className)}>
        <Text className="text-xs text-muted-foreground">状态改为</Text>
        <StatusIcon status={status} size={12} />
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {STATUS_LABEL[status] ?? status}
        </Text>
      </View>
    );
  }

  if (item.type === "priority_changed" && details.to) {
    const priority = details.to as IssuePriority;
    return (
      <View className={cn("flex-row items-center gap-1", className)}>
        <Text className="text-xs text-muted-foreground">优先级改为</Text>
        <PriorityIcon priority={priority} size={12} />
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {PRIORITY_LABEL[priority] ?? priority}
        </Text>
      </View>
    );
  }

  const text = (() => {
    switch (item.type) {
      case "issue_assigned":
      case "assignee_changed":
        if (details.new_assignee_id) {
          const name = getName(
            (details.new_assignee_type ?? "member") as "member" | "agent",
            details.new_assignee_id,
          );
          return `指派给 ${name}`;
        }
        return TYPE_LABEL[item.type];
      case "unassigned":
        return "已移除负责人";
      case "due_date_changed":
        return details.to
          ? `截止日期改为 ${shortDate(details.to)}`
          : "已移除截止日期";
      case "new_comment":
        return singleLine(item.body) || TYPE_LABEL[item.type];
      case "reaction_added":
        return details.emoji
          ? `反应 ${details.emoji}`
          : TYPE_LABEL[item.type];
      case "quick_create_done":
        return details.identifier
          ? `已由数字员工创建：${details.identifier}`
          : TYPE_LABEL[item.type];
      case "quick_create_failed": {
        const detail = singleLine(details.error) || singleLine(item.body);
        return detail ? `失败：${detail}` : TYPE_LABEL[item.type];
      }
      case "quick_create_unconfirmed": {
        const detail = singleLine(details.error) || singleLine(item.body);
        return detail || TYPE_LABEL[item.type];
      }
      default:
        return TYPE_LABEL[item.type] ?? item.type;
    }
  })();

  return (
    <Text
      className={cn("text-xs text-muted-foreground", className)}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
}
