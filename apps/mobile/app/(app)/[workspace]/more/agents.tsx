/**
 * Legacy path `/{slug}/more/agents` → redirect to `/{slug}/staff` (PRD M4).
 */
import { Redirect } from "expo-router";
import { useWorkspaceStore } from "@/data/workspace-store";

export default function AgentsRedirect() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  if (!slug) return null;
  return <Redirect href={`/${slug}/staff`} />;
}
