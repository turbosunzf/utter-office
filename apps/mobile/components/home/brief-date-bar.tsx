import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  dateOnlyToLocalDate,
  toDateOnly,
  todayDateOnly,
} from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { briefDayLabel, clampBriefDate, shiftDateOnly } from "@/lib/brief-format";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const LOOKBACK_DAYS = 14;

export function BriefDateBar({
  date,
  onChange,
  compact,
}: {
  date: string;
  onChange: (dateOnly: string) => void;
  compact?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const today = todayDateOnly();
  const min = shiftDateOnly(today, -LOOKBACK_DAYS);
  const [open, setOpen] = useState(false);
  const selected = dateOnlyToLocalDate(date) ?? new Date();

  const apply = (next: Date) => {
    onChange(clampBriefDate(toDateOnly(next), min, today));
  };

  const picker = (
    <DateTimePicker
      value={selected}
      mode="date"
      display={Platform.OS === "ios" ? "inline" : "default"}
      maximumDate={dateOnlyToLocalDate(today)}
      minimumDate={dateOnlyToLocalDate(min)}
      onChange={(event, value) => {
        if (Platform.OS === "android") setOpen(false);
        if (event.type === "dismissed" || !value) return;
        apply(value);
      }}
    />
  );

  const label = (
    <Pressable
      onPress={() => setOpen(true)}
      hitSlop={8}
      accessibilityLabel="选择简报日期"
      className="flex-row items-center gap-1.5 rounded-full bg-secondary h-8 px-2.5 active:opacity-70"
    >
      <Icon name="Calendar" size={14} color={t.foreground} />
      <Text className="text-[13px] font-semibold text-foreground">
        {briefDayLabel(date)}
      </Text>
    </Pressable>
  );

  return (
    <View className="flex-row items-center gap-1">
      {compact ? (
        label
      ) : (
        <>
          <Pressable
            onPress={() => onChange(clampBriefDate(shiftDateOnly(date, -1), min, today))}
            disabled={date <= min}
            hitSlop={8}
            accessibilityLabel="前一天"
            className={date <= min ? "opacity-30" : "active:opacity-70"}
          >
            <Icon name="ChevronLeft" size={20} color={t.foreground} />
          </Pressable>
          {label}
          <Pressable
            onPress={() => onChange(clampBriefDate(shiftDateOnly(date, 1), min, today))}
            disabled={date >= today}
            hitSlop={8}
            accessibilityLabel="后一天"
            className={date >= today ? "opacity-30" : "active:opacity-70"}
          >
            <Icon name="ChevronRight" size={20} color={t.foreground} />
          </Pressable>
        </>
      )}

      {open && Platform.OS === "android" ? picker : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            className="flex-1 bg-black/40 items-center justify-center px-5"
            onPress={() => setOpen(false)}
          >
            <Pressable
              onPress={() => {}}
              className="w-full rounded-2xl bg-card overflow-hidden"
            >
              <View className="flex-row items-center justify-between px-4 pt-3">
                <Text className="text-[15px] font-semibold">选择日期</Text>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <Text className="text-[15px] font-medium text-brand">完成</Text>
                </Pressable>
              </View>
              <View className="items-center pb-2">{picker}</View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
