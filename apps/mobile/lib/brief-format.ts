import { todayDateOnly } from "@multica/core/issues/date";

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso);
  if (Number.isNaN(diff)) return "—";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return "昨天";
  return `${d}天前`;
}

export function briefDayLabel(dateOnly: string): string {
  const today = todayDateOnly();
  if (dateOnly === today) return "今天";
  if (dateOnly === shiftDateOnly(today, -1)) return "昨天";
  const [, mm, dd] = dateOnly.split("-");
  return `${Number(mm)}月${Number(dd)}日`;
}

export function shiftDateOnly(dateOnly: string, days: number): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function clampBriefDate(
  dateOnly: string,
  minDateOnly: string,
  maxDateOnly: string,
): string {
  if (dateOnly < minDateOnly) return minDateOnly;
  if (dateOnly > maxDateOnly) return maxDateOnly;
  return dateOnly;
}
