/**
 * Stub route for the "Voice" tab. Like the More tab, the Voice tab in
 * (tabs)/_layout.tsx intercepts tabPress and opens a dropdown popover
 * instead of navigating here — this file exists only because expo-router
 * requires every Tabs.Screen to have a backing route file.
 *
 * If a deep link or stale tab state somehow lands the user here, bounce
 * to inbox so they don't see a blank screen (matches more.tsx).
 */
import { Redirect } from "expo-router";
import { useWorkspaceStore } from "@/data/workspace-store";

export default function VoiceStub() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  return <Redirect href={slug ? `/${slug}/inbox` : "/select-workspace"} />;
}
