/**
 * Reaction chip bar. Mobile RN port of
 * `packages/ui/components/common/reaction-bar.tsx`. Same `groupReactions`
 * algorithm so counts and "reacted by me" detection match web exactly —
 * counts-must-agree parity rule from apps/mobile/CLAUDE.md.
 *
 * Empty state: when there are zero reactions and no `onAdd` affordance the
 * bar renders nothing. When `onAdd` is provided a trailing "+" chip is
 * rendered (also when `grouped` is empty) so the caller can always open its
 * add-reaction entry point. Tapping an existing chip still toggles the
 * current user's reaction (add/remove) via `onToggle`.
 */
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ReactionItem {
  id: string;
  actor_type: string;
  actor_id: string;
  emoji: string;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

function groupReactions(
  reactions: ReactionItem[],
  currentUserId: string | undefined,
): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>();
  for (const r of reactions) {
    let group = map.get(r.emoji);
    if (!group) {
      group = { emoji: r.emoji, count: 0, reacted: false };
      map.set(r.emoji, group);
    }
    group.count += 1;
    if (r.actor_type === "member" && r.actor_id === currentUserId) {
      group.reacted = true;
    }
  }
  return Array.from(map.values());
}

interface Props {
  reactions: ReactionItem[];
  currentUserId: string | undefined;
  onToggle: (emoji: string) => void;
  /** When set, renders a trailing "+" chip (also with zero reactions). */
  onAdd?: () => void;
  className?: string;
}

export function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  onAdd,
  className,
}: Props) {
  const grouped = groupReactions(reactions, currentUserId);
  // No reactions and no add entry point → render nothing (web parity).
  if (grouped.length === 0 && !onAdd) return null;

  return (
    <View
      className={cn("flex-row flex-wrap items-center gap-1.5", className)}
    >
      {grouped.map((g) => (
        <Pressable
          key={g.emoji}
          onPress={() => onToggle(g.emoji)}
          className={cn(
            "flex-row items-center gap-1 rounded-full border px-2 py-0.5",
            g.reacted
              ? "border-brand/30 bg-brand/10"
              : "border-border bg-background",
          )}
        >
          <Text className="text-xs">{g.emoji}</Text>
          <Text
            className={cn(
              "text-xs tabular-nums",
              g.reacted ? "text-brand" : "text-muted-foreground",
            )}
          >
            {g.count}
          </Text>
        </Pressable>
      ))}
      {onAdd ? (
        <Pressable
          onPress={onAdd}
          className="flex-row items-center justify-center rounded-full border border-border bg-background px-2 py-0.5"
        >
          <Text className="text-xs text-muted-foreground">+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
