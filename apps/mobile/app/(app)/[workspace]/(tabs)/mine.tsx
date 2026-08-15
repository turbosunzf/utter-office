/**
 * 我的 — tab root for the redesigned 5-tab layout (step ②).
 *
 * Migrates the old More popover's full capability into a scrollable page:
 *   - identity card (→ more/settings)
 *   - workspace card (→ switch-workspace; disabled for single-workspace users)
 *   - a grouped list pushing the existing more/* routes:
 *       工作: 置顶 / 事项 / 项目 / 智能体
 *       设置: 设置 / 个人资料 / 通知
 *
 * All glyphs are SF Symbols via expo-image (`sf:`), matching the bottom tab
 * bar and the old popover's visual language. Colours route through THEME
 * tokens for automatic dark mode.
 */
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/ui/header";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { NavRow } from "@/components/ui/nav-row";
import { SectionGroup } from "@/components/ui/section-group";
import { WorkspaceAvatar } from "@/components/workspace/workspace-avatar";
import { workspaceListOptions } from "@/data/queries/workspaces";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface NavItem {
  label: string;
  /** SF Symbol name, rendered via expo-image `source: "sf:<name>"`. */
  icon: string;
  /** Path under /:slug/ — final href is `/${slug}${path}`. */
  path: string;
}

const WORK_ITEMS: NavItem[] = [
  { label: "置顶", icon: "pin", path: "/more/pins" },
  { label: "事项", icon: "list.bullet", path: "/more/issues" },
  { label: "项目", icon: "square.stack", path: "/more/projects" },
  { label: "智能体", icon: "person.2", path: "/more/agents" },
];

const SETTINGS_ITEMS: NavItem[] = [
  { label: "设置", icon: "gearshape", path: "/more/settings" },
  {
    label: "个人资料",
    icon: "person.crop.circle",
    path: "/more/settings/profile",
  },
  { label: "通知", icon: "bell", path: "/more/settings/notifications" },
];

function initialsOf(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SFIcon({ name, color }: { name: string; color: string }) {
  return (
    <ExpoImage
      source={`sf:${name}`}
      tintColor={color}
      style={{ width: 18, height: 18 }}
    />
  );
}

export default function MinePage() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const user = useAuthStore((s) => s.user);
  const { data: workspaces } = useQuery(workspaceListOptions());
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const currentWorkspace = useMemo(
    () => (slug ? workspaces?.find((w) => w.slug === slug) : undefined),
    [workspaces, slug],
  );
  // Single-workspace users can't switch — hide the chevron and disable the
  // row (mirrors the old popover's WorkspaceCard `canSwitch` guard).
  const canSwitch = (workspaces?.length ?? 0) > 1;

  const go = (path: string) => {
    if (slug) router.push(`/${slug}${path}`);
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="我的" />
      <ScrollView contentContainerClassName="px-4 py-4 gap-6">
        {/* Identity + workspace card — one bare card (no section label),
            matching the old popover's UserCard + WorkspaceCard stacking. */}
        <SectionGroup>
          <NavRow
            onPress={() => go("/more/settings")}
            chevronColor={t.mutedForeground}
            leading={
              <Avatar alt={user?.name ?? "User avatar"} className="size-10">
                {user?.avatar_url ? (
                  <AvatarImage source={{ uri: user.avatar_url }} />
                ) : null}
                <AvatarFallback>
                  <Text className="text-sm font-semibold text-muted-foreground">
                    {initialsOf(user?.name)}
                  </Text>
                </AvatarFallback>
              </Avatar>
            }
            title={user?.name ?? "—"}
            subtitle={user?.email}
          />
          <Separator />
          <NavRow
            onPress={() => go("/switch-workspace")}
            disabled={!canSwitch}
            chevronColor={t.mutedForeground}
            leading={
              <WorkspaceAvatar
                name={currentWorkspace?.name ?? "Workspace"}
                avatarUrl={currentWorkspace?.avatar_url}
                size={32}
              />
            }
            title={currentWorkspace?.name ?? "Workspace"}
          />
        </SectionGroup>

        <SectionGroup title="工作">
          {WORK_ITEMS.map((item, idx) => (
            <View key={item.path}>
              <NavRow
                onPress={() => go(item.path)}
                chevronColor={t.mutedForeground}
                leading={<SFIcon name={item.icon} color={t.foreground} />}
                title={item.label}
              />
              {idx < WORK_ITEMS.length - 1 ? <Separator /> : null}
            </View>
          ))}
        </SectionGroup>

        <SectionGroup title="设置">
          {SETTINGS_ITEMS.map((item, idx) => (
            <View key={item.path}>
              <NavRow
                onPress={() => go(item.path)}
                chevronColor={t.mutedForeground}
                leading={<SFIcon name={item.icon} color={t.foreground} />}
                title={item.label}
              />
              {idx < SETTINGS_ITEMS.length - 1 ? <Separator /> : null}
            </View>
          ))}
        </SectionGroup>
      </ScrollView>
    </View>
  );
}
