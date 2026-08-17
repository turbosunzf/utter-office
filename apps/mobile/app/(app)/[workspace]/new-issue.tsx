/**
 * New issue creation modal — manual only.
 *
 * Prefill: `assigneeId` + `assigneeType` URL params (from staff-picker
 * dispatch) are applied in useLayoutEffect so the assignee chip is set
 * before the first paint (avoids a flash of「负责人」占位).
 * Optional `title` / `description` (e.g. brief squad launch).
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import type { IssueAssigneeType } from "@multica/core/types";
import { SubmitIssueButton } from "@/components/issue/submit-issue-button";
import { CreateFormAttributeRow } from "@/components/issue/create-form-attribute-row";
import { MentionSuggestionBar } from "@/components/issue/mention-suggestion-bar";
import { DescriptionField } from "@/components/issue/description-field";
import { MOBILE_PLACEHOLDER_COLOR } from "@/components/ui/input-tokens";
import { useCreateIssue } from "@/data/mutations/issues";
import { useNewIssueDraftStore } from "@/data/stores/new-issue-draft-store";
import { useMentionInput } from "@/lib/use-mention-input";

const ASSIGNEE_TYPES: ReadonlySet<IssueAssigneeType> = new Set([
  "member",
  "agent",
  "squad",
]);

function seedDraftFromParams(
  assigneeId: string | undefined,
  assigneeType: string | undefined,
) {
  const store = useNewIssueDraftStore.getState();
  store.reset();
  if (
    assigneeId &&
    assigneeType &&
    ASSIGNEE_TYPES.has(assigneeType as IssueAssigneeType)
  ) {
    store.setAssignee({
      type: assigneeType as IssueAssigneeType,
      id: assigneeId,
    });
  }
}

export default function NewIssueModal() {
  const {
    assigneeId,
    assigneeType,
    title: titleParam,
    description: descriptionParam,
  } = useLocalSearchParams<{
    assigneeId?: string;
    assigneeType?: string;
    title?: string;
    description?: string;
  }>();
  // Seed during render (before paint) so CreateFormAttributeRow never
  // flashes the empty「负责人」placeholder when opened from staff-picker.
  const seedKey = `${assigneeId ?? ""}:${assigneeType ?? ""}`;
  const lastSeedKey = useRef<string | null>(null);
  if (lastSeedKey.current !== seedKey) {
    lastSeedKey.current = seedKey;
    seedDraftFromParams(assigneeId, assigneeType);
  }

  const [title, setTitle] = useState(
    typeof titleParam === "string" ? titleParam : "",
  );
  const description = useMentionInput();
  const seededDesc = useRef(false);
  useLayoutEffect(() => {
    if (seededDesc.current) return;
    if (typeof descriptionParam === "string" && descriptionParam) {
      seededDesc.current = true;
      description.setText(descriptionParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once
  }, [descriptionParam]);
  const status = useNewIssueDraftStore((s) => s.status);
  const priority = useNewIssueDraftStore((s) => s.priority);
  const assignee = useNewIssueDraftStore((s) => s.assignee);
  const dueDate = useNewIssueDraftStore((s) => s.dueDate);
  const project = useNewIssueDraftStore((s) => s.project);

  useLayoutEffect(() => {
    return () => {
      useNewIssueDraftStore.getState().reset();
    };
  }, []);

  const createIssue = useCreateIssue();
  const isSubmitting = createIssue.isPending;

  const canSubmit = !isSubmitting && title.trim().length > 0;

  const onSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) return;
    const finalDescription = description.serialize().trim();
    try {
      await createIssue.mutateAsync({
        title: trimmedTitle,
        description: finalDescription || undefined,
        status,
        priority,
        ...(assignee
          ? { assignee_type: assignee.type, assignee_id: assignee.id }
          : {}),
        ...(dueDate ? { due_date: dueDate } : {}),
        ...(project ? { project_id: project.id } : {}),
      });
      router.back();
    } catch (err) {
      Alert.alert(
        "创建失败",
        err instanceof Error ? err.message : "未知错误",
      );
    }
  }, [
    title,
    description,
    status,
    priority,
    assignee,
    dueDate,
    project,
    createIssue,
  ]);

  const headerRight = useCallback(
    () => (
      <SubmitIssueButton
        disabled={!canSubmit}
        loading={isSubmitting}
        onPress={onSubmit}
      />
    ),
    [canSubmit, isSubmitting, onSubmit],
  );

  return (
    <>
      <Stack.Screen options={{ headerRight }} />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pt-4 pb-6 gap-4"
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="事项标题"
            placeholderTextColor={MOBILE_PLACEHOLDER_COLOR}
            className="text-2xl font-semibold text-foreground py-2"
            autoFocus
            returnKeyType="next"
            editable={!isSubmitting}
          />
          <DescriptionField
            description={description}
            disabled={isSubmitting}
          />
          <CreateFormAttributeRow />
        </ScrollView>

        <MentionSuggestionBar {...description.suggestionBar} />
      </KeyboardAvoidingView>
    </>
  );
}
