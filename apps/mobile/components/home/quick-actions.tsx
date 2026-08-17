/**
 * Home workspace pulse — org + on-duty staff viz + 项目 / 收件箱.
 * 新建 / 派单已在 HomeHero，此处不再重复。
 */
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ElevatedSurface } from "@/components/ui/elevated-surface";
import { Icon } from "@/components/ui/icon";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export interface WorkspacePulseProps {
  workspaceName: string;
  onDutyCount: number | null;
  onDutyAgentIds: string[];
  projectCount: number | null;
  inboxBadge?: number;
  onPressProjects: () => void;
  onPressInbox: () => void;
  onPressStaff: () => void;
}

export function QuickActions({
  workspaceName,
  onDutyCount,
  onDutyAgentIds,
  projectCount,
  inboxBadge = 0,
  onPressProjects,
  onPressInbox,
  onPressStaff,
}: WorkspacePulseProps) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const well = colorScheme === "dark" ? t.secondary : "#F5F7FC";
  const preview = onDutyAgentIds.slice(0, 4);

  return (
    <View className="px-4">
      <ElevatedSurface className="border-0 overflow-hidden">
        <Pressable
          onPress={onPressStaff}
          className="flex-row items-center gap-3 px-3.5 py-3.5 active:opacity-90"
          accessibilityLabel={`${workspaceName}，${onDutyCount ?? 0} 位员工在岗`}
        >
          <View
            className="size-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(59,111,255,0.12)" }}
          >
            <Icon name="Building2" size={20} color={t.brand} strokeWidth={2.1} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>
              {workspaceName}
            </Text>
            <Text className="text-[11px] text-muted-foreground mt-0.5">
              {onDutyCount == null
                ? "在岗员工加载中…"
                : onDutyCount === 0
                  ? "暂无在岗员工"
                  : `${onDutyCount} 位员工在岗`}
            </Text>
          </View>
          <View className="flex-row items-center">
            {preview.length > 0 ? (
              <View className="flex-row items-center mr-1">
                {preview.map((id, i) => (
                  <View
                    key={id}
                    style={{
                      marginLeft: i === 0 ? 0 : -10,
                      zIndex: preview.length - i,
                      borderWidth: 2,
                      borderColor: colorScheme === "dark" ? t.card : "#FFFFFF",
                      borderRadius: 14,
                    }}
                  >
                    <ActorAvatar type="agent" id={id} size={28} />
                  </View>
                ))}
              </View>
            ) : (
              <View
                className="size-7 items-center justify-center rounded-full mr-1"
                style={{ backgroundColor: well }}
              >
                <Icon name="Users" size={14} color={t.mutedForeground} />
              </View>
            )}
            <Icon name="ChevronRight" size={16} color={t.mutedForeground} />
          </View>
        </Pressable>

        <View className="mx-3.5 h-px bg-border" />

        <View className="flex-row">
          <Pressable
            onPress={onPressProjects}
            className="flex-1 flex-row items-center gap-2.5 px-3.5 py-3 active:opacity-85"
            accessibilityLabel="项目"
          >
            <View
              className="size-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(13,148,136,0.12)" }}
            >
              <Icon name="Folder" size={17} color="#0D9488" strokeWidth={2.1} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[13px] font-semibold text-foreground">项目</Text>
              <Text className="text-[10px] text-muted-foreground">
                {projectCount == null
                  ? "—"
                  : projectCount === 0
                    ? "暂无项目"
                    : `${projectCount} 个进行中`}
              </Text>
            </View>
          </Pressable>

          <View className="w-px self-stretch my-2.5 bg-border" />

          <Pressable
            onPress={onPressInbox}
            className="flex-1 flex-row items-center gap-2.5 px-3.5 py-3 active:opacity-85"
            accessibilityLabel={
              inboxBadge > 0 ? `收件箱，${inboxBadge} 条未读` : "收件箱"
            }
          >
            <View className="relative">
              <View
                className="size-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(245,158,11,0.14)" }}
              >
                <Icon name="Inbox" size={17} color={t.priority} strokeWidth={2.1} />
              </View>
              {inboxBadge > 0 ? (
                <View className="absolute -right-1 -top-1 min-w-[16px] h-4 items-center justify-center rounded-full bg-brand px-1">
                  <Text className="text-[10px] font-semibold text-white">
                    {inboxBadge > 99 ? "99+" : String(inboxBadge)}
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[13px] font-semibold text-foreground">收件箱</Text>
              <Text className="text-[10px] text-muted-foreground">
                {inboxBadge > 0 ? `${inboxBadge} 条未读` : "暂无未读"}
              </Text>
            </View>
          </Pressable>
        </View>
      </ElevatedSurface>
    </View>
  );
}
