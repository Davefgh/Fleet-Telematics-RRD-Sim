export type TabType = "dashboard" | "fleet" | "garage" | "simulator" | "alerts" | "more";

export interface TabItem {
  id: TabType;
  label: string;
  icon: string;
  badgeCount?: number;
}
