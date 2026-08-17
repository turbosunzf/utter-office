/**
 * Unified Lucide icon surface for mobile.
 * Prefer `<Icon name="Search" />` everywhere — do not use SF Symbols /
 * Ionicons / ad-hoc ExpoImage glyphs for UI chrome.
 */
import type { ComponentType } from "react";
import type { SvgProps } from "react-native-svg";
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  AtSign,
  AudioLines,
  Bell,
  BellRing,
  Bot,
  Building2,
  Calendar,
  Camera,
  ChartColumn,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  CircleStop,
  ClipboardList,
  Clock,
  CloudOff,
  Code2,
  Crown,
  Download,
  Ellipsis,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  GitBranch,
  Home,
  Image as ImageIcon,
  Inbox,
  Info,
  Languages,
  LayoutGrid,
  Layers,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListTodo,
  MailOpen,
  MessageCircle,
  Mic,
  Newspaper,
  Paperclip,
  Pause,
  Pin,
  Play,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Server,
  Settings,
  Shield,
  Sparkles,
  Square,
  SquareCheck,
  Trash2,
  TrendingUp,
  User,
  UserRound,
  Users,
  X,
  XCircle,
  Zap,
  type LucideProps,
} from "lucide-react-native";

const ICONS = {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  AtSign,
  AudioLines,
  Bell,
  BellRing,
  Bot,
  Building2,
  Calendar,
  Camera,
  ChartColumn,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  CircleStop,
  ClipboardList,
  Clock,
  CloudOff,
  Code2,
  Crown,
  Download,
  Ellipsis,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  GitBranch,
  Home,
  Image: ImageIcon,
  Inbox,
  Info,
  Languages,
  LayoutGrid,
  Layers,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListTodo,
  MailOpen,
  MessageCircle,
  Mic,
  Newspaper,
  Paperclip,
  Pause,
  Pin,
  Play,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Server,
  Settings,
  Shield,
  Sparkles,
  Square,
  SquareCheck,
  Trash2,
  TrendingUp,
  User,
  UserRound,
  Users,
  X,
  XCircle,
  Zap,
} as const satisfies Record<string, ComponentType<LucideProps>>;

export type AppIconName = keyof typeof ICONS;

export type IconProps = {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
} & Omit<SvgProps, "width" | "height" | "color">;

export function Icon({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  const Comp = ICONS[name];
  return (
    <Comp
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={false}
      {...rest}
    />
  );
}

export { ICONS };
