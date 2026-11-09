import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TabType } from "./types";

interface BottomNavBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  alertCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const insets = useSafeAreaInsets();

  // Exactly mirrors web's Sidebar.tsx PAGES
  const tabs: {
    id: TabType;
    label: string;
    activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
    inactiveIcon: keyof typeof MaterialCommunityIcons.glyphMap;
    matches: TabType[];
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      activeIcon: "view-dashboard",
      inactiveIcon: "view-dashboard-outline",
      matches: ["dashboard"],
    },
    {
      id: "vehicles",
      label: "Vehicles",
      activeIcon: "truck",
      inactiveIcon: "truck-outline",
      matches: ["vehicles", "fleet"],
    },
    {
      id: "garage",
      label: "Garage",
      activeIcon: "garage-open-variant",
      inactiveIcon: "garage-variant",
      matches: ["garage"],
    },
    {
      id: "planner",
      label: "Trip planner",
      activeIcon: "checkbox-marked-circle",
      inactiveIcon: "checkbox-marked-circle-outline",
      matches: ["planner", "simulator"],
    },
    {
      id: "route",
      label: "Route & charging",
      activeIcon: "map",
      inactiveIcon: "map-outline",
      matches: ["route"],
    },
    {
      id: "battery",
      label: "Battery",
      activeIcon: "battery-charging",
      inactiveIcon: "battery-charging-outline",
      matches: ["battery"],
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 6) },
      ]}
    >
      <View style={styles.navRow}>
        {tabs.map((tab) => {
          const isActive = tab.matches.includes(currentTab);
          const iconColor = isActive ? "#00C2FF" : "#9AA8BD";
          const iconName = isActive ? tab.activeIcon : tab.inactiveIcon;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.topIndicator} />}
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={21}
                  color={iconColor}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0D1321", // web --bg-secondary
    borderTopWidth: 1,
    borderTopColor: "#1E2D3D", // web --border-color
    paddingTop: 4,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 8,
    position: "relative",
  },
  tabItemActive: {
    backgroundColor: "rgba(0, 194, 255, 0.12)", // web .sidebar-link--active
  },
  topIndicator: {
    position: "absolute",
    top: -4,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: "#00C2FF", // web --accent-cyan
    borderRadius: 1,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 24,
  },
  tabLabel: {
    fontSize: 9.5,
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: "#00C2FF", // web --accent-cyan
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: "#9AA8BD", // web --text-secondary
    fontWeight: "500",
  },
});
