export type TabType =
  | "dashboard"
  | "vehicles"
  | "fleet"
  | "garage"
  | "planner"
  | "simulator"
  | "route"
  | "battery"
  | "alerts"
  | "more";

export interface TabItem {
  id: TabType;
  label: string;
  icon: string;
  badgeCount?: number;
}
