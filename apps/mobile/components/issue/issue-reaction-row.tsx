/**
 * Issue-level reaction row. Sits right under the description, mirroring
 * web's `issue-detail.tsx:785` placement.
 *
 * Reads issue.reactions from the detail cache passed by the parent. No
 * separate query — single source of truth on the detail object.
 *
 * Always renders a row: existing reactions (toggleable chips) plus a "+"
 * chip that opens a native ActionSheetIOS with the 5 quick emojis +
 * "More reactions…" → the full issue emoji-picker formSheet. Same product
 * semantics as the comment reaction entry (`comment-context-menu.tsx`).
 */
import { useCallback, useMemo } from "react";
import { ActionSheetIOS, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Issue, IssueReaction } from "@multica/core/types";
import { ReactionBar } from "./reaction-bar";
import { useToggleIssueReaction } from "@/data/mutations/issues";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { QUICK_EMOJIS } from "@/lib/quick-emojis";

const QUICK_ROW_SIZE = 5;

export function IssueReactionRow({ issue }: { issue: Issue }) {
  const userId = useAuthStore((s) => s.user?.id);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const reactions = useMemo<IssueReaction[]>(
    () => issue.reactions ?? [],
    [issue.reactions],
  );
  const toggle = useToggleIssueReaction(issue.id);

  const onToggle = useCallback(
    (emoji: string) => {
      const existing = reactions.find(
        (r) =>
          r.emoji === emoji &&
          r.actor_type === "member" &&
          r.actor_id === userId,
      );
      toggle.mutate({ emoji, existing });
    },
    [reactions, userId, toggle],
  );

  const onAdd = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    const emojis = QUICK_EMOJIS.slice(0, QUICK_ROW_SIZE);
    const options = [...emojis, "More reactions…", "Cancel"];
    const cancelButtonIndex = options.length - 1;

    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex },
      (i) => {
        if (i === cancelButtonIndex) return;
        if (i === emojis.length) {
          if (!wsSlug) return;
          router.push({
            pathname: "/[workspace]/issue/[id]/emoji-picker",
            params: { workspace: wsSlug, id: issue.id },
          });
          return;
        }
        const emoji = emojis[i];
        if (!emoji) return;
        onToggle(emoji);
      },
    );
  }, [wsSlug, issue.id, onToggle]);

  return (
    <View className="px-4 pb-3">
      <ReactionBar
        reactions={reactions}
        currentUserId={userId}
        onToggle={onToggle}
        onAdd={onAdd}
      />
    </View>
  );
}
