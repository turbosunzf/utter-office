/**
 * 我的 — tab root for the redesigned 5-tab layout.
 *
 * M1: 收件箱（角标）/ 我的事项 / 置顶/事项/项目 / 数字员工 → more/agents；
 * 关于区版本号（expo-constants）。秘书设置属 M2。
 */
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import Constants from "expo-constants";
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
import { useInboxUnreadCount } from "@/lib/unread-counts";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

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

function appVersionLabel(): string {
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "—";
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.nativeBuildVersion;
  return build ? `${version} (${build})` : String(version);
}

export default function MinePage() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const user = useAuthStore((s) => s.user);
  const { data: workspaces } = useQuery(workspaceListOptions());
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const inboxUnread = useInboxUnreadCount(wsId);

  const currentWorkspace = useMemo(
    () => (slug ? workspaces?.find((w) => w.slug === slug) : undefined),
    [workspaces, slug],
  );
  const canSwitch = (workspaces?.length ?? 0) > 1;

  const workItems: NavItem[] = useMemo(
    () => [
      {
        label: "收件箱",
        icon: "tray",
        path: "/inbox",
        badge: inboxUnread,
      },
      { label: "我的事项", icon: "person.text.rectangle", path: "/my-issues" },
      { label: "置顶", icon: "pin", path: "/more/pins" },
      { label: "事项", icon: "list.bullet", path: "/more/issues" },
      { label: "项目", icon: "square.stack", path: "/more/projects" },
      { label: "数字员工", icon: "person.2", path: "/more/agents" },
    ],
    [inboxUnread],
  );

  const settingsItems: NavItem[] = [
    { label: "设置", icon: "gearshape", path: "/more/settings" },
    {
      label: "个人资料",
      icon: "person.crop.circle",
      path: "/more/settings/profile",
    },
    { label: "通知", icon: "bell", path: "/more/settings/notifications" },
  ];

  const go = (path: string) => {
    if (slug) router.push(`/${slug}${path}`);
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="我的" />
      <ScrollView contentContainerClassName="px-4 py-4 gap-6">
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
            title={currentWorkspace?.name ?? "工作区"}
          />
        </SectionGroup>

        <SectionGroup title="工作区">
          {workItems.map((item, idx) => (
            <View key={item.path}>
              <NavRow
                onPress={() => go(item.path)}
                chevronColor={t.mutedForeground}
                leading={<SFIcon name={item.icon} color={t.foreground} />}
                title={item.label}
                badge={item.badge}
              />
              {idx < workItems.length - 1 ? <Separator /> : null}
            </View>
          ))}
        </SectionGroup>

        <SectionGroup title="设置">
          {settingsItems.map((item, idx) => (
            <View key={item.path}>
              <NavRow
                onPress={() => go(item.path)}
                chevronColor={t.mutedForeground}
                leading={<SFIcon name={item.icon} color={t.foreground} />}
                title={item.label}
              />
              {idx < settingsItems.length - 1 ? <Separator /> : null}
            </View>
          ))}
        </SectionGroup>

        <SectionGroup title="关于">
          <NavRow
            onPress={() => {}}
            disabled
            chevronColor={t.mutedForeground}
            leading={<SFIcon name="info.circle" color={t.foreground} />}
            title="版本"
            subtitle={appVersionLabel()}
          />
        </SectionGroup>
      </ScrollView>
    </View>
  );
}
