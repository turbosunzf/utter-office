/**
 * Full emoji picker for an issue reaction — opened from the "+" chip in
 * `IssueReactionRow` (via its ActionSheetIOS "More reactions…" entry).
 * Mirrors the per-comment emoji-picker route; same product semantics (the
 * full emoji set must be reachable, not only the 8 quick picks).
 *
 * Reads issue.reactions from the detail cache to detect an already-applied
 * reaction by the current user, then fires `useToggleIssueReaction` with the
 * right `existing` value so re-tapping an active emoji removes it (matches
 * web behaviour and the inline ReactionBar toggle semantics).
 */
import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmojiKeyboard, type EmojiType } from "rn-emoji-keyboard";
import type { IssueReaction } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { issueDetailOptions } from "@/data/queries/issues";
import { useToggleIssueReaction } from "@/data/mutations/issues";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function IssueEmojiPickerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const userId = useAuthStore((s) => s.user?.id);
  const toggle = useToggleIssueReaction(id);
  const { colorScheme } = useColorScheme();

  const { data } = useQuery(issueDetailOptions(wsId, id));
  const reactions = useMemo<IssueReaction[]>(
    () => data?.reactions ?? [],
    [data?.reactions],
  );

  const onSelect = useCallback(
    (picked: EmojiType) => {
      const existing = reactions.find(
        (r) =>
          r.emoji === picked.emoji &&
          r.actor_type === "member" &&
          r.actor_id === userId,
      );
      toggle.mutate({ emoji: picked.emoji, existing });
      router.back();
    },
    [reactions, userId, toggle],
  );

  const theme = THEME[colorScheme];

  return (
    <View className="flex-1">
      <View className="px-4 pt-3 pb-2">
        <Text className="text-lg font-semibold text-foreground">
          Add Reaction
        </Text>
      </View>
      <View className="flex-1">
        <EmojiKeyboard
          onEmojiSelected={onSelect}
          enableSearchBar
          enableRecentlyUsed
          categoryPosition="top"
          theme={{
            backdrop: theme.background,
            knob: theme.mutedForeground,
            container: theme.popover,
            header: theme.foreground,
            skinTonesContainer: theme.secondary,
            category: {
              icon: theme.mutedForeground,
              iconActive: theme.foreground,
              container: theme.popover,
              containerActive: theme.secondary,
            },
            search: {
              background: theme.secondary,
              text: theme.foreground,
              placeholder: theme.mutedForeground,
              icon: theme.mutedForeground,
            },
            customButton: {
              icon: theme.mutedForeground,
              iconPressed: theme.foreground,
              background: theme.secondary,
              backgroundPressed: theme.muted,
            },
            emoji: {
              selected: theme.secondary,
            },
          }}
        />
      </View>
    </View>
  );
}
