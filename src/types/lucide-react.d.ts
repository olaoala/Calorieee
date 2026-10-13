// Minimal ambient typings for lucide-react.
// The installed package's own .d.ts failed to extract during install, so we
// declare just the pieces this project actually uses.
declare module "lucide-react" {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

  export interface LucideProps extends Partial<SVGProps<SVGSVGElement>> {
    size?: string | number;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;

  export const Flame: LucideIcon;
  export const Search: LucideIcon;
  export const Bell: LucideIcon;
  export const CalendarClock: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const LogOut: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const History: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Settings: LucideIcon;
  export const Plus: LucideIcon;
  export const X: LucideIcon;
  export const Target: LucideIcon;
  export const Database: LucideIcon;
  export const Check: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const MailCheck: LucideIcon;
  export const Coffee: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const Cookie: LucideIcon;
  export const BarChart3: LucideIcon;
  export const User: LucideIcon;
  export const Droplet: LucideIcon;
  export const Minus: LucideIcon;
  export const Scale: LucideIcon;
  export const Ruler: LucideIcon;
  export const Activity: LucideIcon;
  export const ChevronDown: LucideIcon;
}
