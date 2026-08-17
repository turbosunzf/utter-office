/**
 * 我的 — tab root. Menu with tinted wells + section titles above cards.
 */
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/ui/header";
import { Icon, type AppIconName } from "@/components/ui/icon";
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
import { ProUpsellCard } from "@/components/shared/pro-upsell-card";
import { ElevatedSurface } from "@/components/ui/elevated-surface";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface NavItem {
  label: string;
  icon: AppIconName;
  path: string;
  badge?: number;
  subtitle?: string;
  tint: string;
  soft: string;
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
  const well = colorScheme === "dark" ? t.secondary : "#F0F3FA";

  const currentWorkspace = useMemo(
    () => (slug ? workspaces?.find((w) => w.slug === slug) : undefined),
    [workspaces, slug],
  );
  const canSwitch = (workspaces?.length ?? 0) > 1;

  const workItems: NavItem[] = useMemo(
    () => [
      {
        label: "收件箱",
        icon: "Inbox",
        path: "/inbox",
        badge: inboxUnread,
        subtitle: inboxUnread > 0 ? `${inboxUnread} 条未读` : undefined,
        tint: t.brand,
        soft: "rgba(59,111,255,0.12)",
      },
      {
        label: "我的事项",
        icon: "ClipboardList",
        path: "/my-issues",
        tint: "#0D9488",
        soft: "rgba(13,148,136,0.12)",
      },
      {
        label: "置顶",
        icon: "Pin",
        path: "/more/pins",
        tint: t.priority,
        soft: "rgba(245,158,11,0.14)",
      },
      {
        label: "事项",
        icon: "List",
        path: "/more/issues",
        tint: t.foreground,
        soft: well,
      },
      {
        label: "项目",
        icon: "Layers",
        path: "/more/projects",
        tint: t.brand,
        soft: "rgba(59,111,255,0.1)",
      },
      {
        label: "数字员工",
        icon: "Users",
        path: "/staff",
        tint: "#0D9488",
        soft: "rgba(13,148,136,0.1)",
      },
    ],
    [inboxUnread, t, well],
  );

  const settingsItems: NavItem[] = [
    {
      label: "秘书设置",
      icon: "Sparkles",
      path: "/more/settings/assistant",
      tint: t.brand,
      soft: "rgba(59,111,255,0.12)",
    },
    {
      label: "数据报告",
      icon: "ChartColumn",
      path: "/reports",
      tint: "#0D9488",
      soft: "rgba(13,148,136,0.12)",
    },
    {
      label: "设置",
      icon: "Settings",
      path: "/more/settings",
      tint: t.foreground,
      soft: well,
    },
    {
      label: "个人资料",
      icon: "UserRound",
      path: "/more/settings/profile",
      tint: t.foreground,
      soft: well,
    },
    {
      label: "通知",
      icon: "Bell",
      path: "/more/settings/notifications",
      tint: t.priority,
      soft: "rgba(245,158,11,0.14)",
    },
  ];

  const go = (path: string) => {
    if (slug) router.push(`/${slug}${path}`);
  };

  const headerRight = (
    <Pressable
      onPress={() => go("/switch-workspace")}
      disabled={!canSwitch}
      accessibilityLabel={
        canSwitch
          ? `当前组织 ${currentWorkspace?.name ?? "工作区"}，点按切换`
          : `当前组织 ${currentWorkspace?.name ?? "工作区"}`
      }
      className="flex-row items-center gap-2 rounded-full active:opacity-80"
      style={{
        maxWidth: "100%",
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 10,
        backgroundColor: colorScheme === "dark" ? t.secondary : "#EEF1F8",
        opacity: canSwitch ? 1 : 0.9,
      }}
    >
      <WorkspaceAvatar
        name={currentWorkspace?.name ?? "Workspace"}
        avatarUrl={currentWorkspace?.avatar_url}
        size={24}
      />
      <Text
        className="text-[13px] font-semibold text-foreground"
        numberOfLines={1}
        style={{ flexShrink: 1, maxWidth: 120 }}
      >
        {currentWorkspace?.name ?? "工作区"}
      </Text>
      {canSwitch ? (
        <Icon name="ChevronDown" size={14} color={t.mutedForeground} />
      ) : null}
    </Pressable>
  );

  const renderRows = (items: NavItem[]) =>
    items.map((item, idx) => (
      <View key={item.path}>
        <NavRow
          onPress={() => go(item.path)}
          chevronColor={t.mutedForeground}
          leading={
            <View
              className="size-9 items-center justify-center rounded-[11px]"
              style={{ backgroundColor: item.soft }}
            >
              <Icon
                name={item.icon}
                size={18}
                color={item.tint}
                strokeWidth={2.1}
              />
            </View>
          }
          title={item.label}
          subtitle={item.subtitle}
          badge={item.badge}
        />
        {idx < items.length - 1 ? (
          <View className="ml-[60px]">
            <Separator />
          </View>
        ) : null}
      </View>
    ));

  return (
    <View className="flex-1 bg-background">
      <Header title="我的" right={headerRight} />
      <ScrollView contentContainerClassName="px-4 py-3 gap-4 pb-10">
        <ElevatedSurface className="border-0 overflow-hidden">
          <Pressable
            onPress={() => go("/more/settings/profile")}
            className="flex-row items-center gap-3 px-4 py-4 active:opacity-80"
          >
            <Avatar alt={user?.name ?? "User avatar"} className="size-14">
              {user?.avatar_url ? (
                <AvatarImage source={{ uri: user.avatar_url }} />
              ) : null}
              <AvatarFallback className="bg-brand/15">
                {user?.name ? (
                  <Text className="text-lg font-semibold text-brand">
                    {initialsOf(user.name)}
                  </Text>
                ) : (
                  <Icon name="UserRound" size={26} color={t.brand} />
                )}
              </AvatarFallback>
            </Avatar>
            <View className="flex-1 min-w-0">
              <Text
                className="text-[17px] font-bold text-foreground"
                numberOfLines={1}
              >
                {user?.name ?? "加载中…"}
              </Text>
              <Text
                className="text-[12px] text-muted-foreground mt-0.5"
                numberOfLines={1}
              >
                {user?.email ?? "完善个人资料"}
              </Text>
            </View>
            <Icon name="ChevronRight" size={18} color={t.mutedForeground} />
          </Pressable>
        </ElevatedSurface>

        <ProUpsellCard />

        <SectionGroup title="工作">{renderRows(workItems)}</SectionGroup>
        <SectionGroup title="设置与秘书">
          {renderRows(settingsItems)}
        </SectionGroup>
        <SectionGroup title="关于">
          <NavRow
            onPress={() => {}}
            disabled
            chevronColor={t.mutedForeground}
            leading={
              <View
                className="size-9 items-center justify-center rounded-[11px]"
                style={{ backgroundColor: well }}
              >
                <Icon name="Info" size={18} color={t.foreground} strokeWidth={2.1} />
              </View>
            }
            title="版本"
            subtitle={appVersionLabel()}
          />
        </SectionGroup>
      </ScrollView>
    </View>
  );
}
