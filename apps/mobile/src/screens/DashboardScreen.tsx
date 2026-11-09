import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatBatteryState } from "@fleet/api-client";
import type { Vehicle } from "@fleet/api-client";
import { colors } from "../constants/theme";
import { Header } from "../components";
import type { TabType } from "../navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOW_SOC_PCT = 30;
const STATUSES = ["AVAILABLE", "IN_USE", "CHARGING", "MAINTENANCE"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardScreenProps {
  vehicles: Vehicle[];
  onNavigateTab: (tab: TabType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avg = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

function statusColor(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return colors.riskSafe;
    case "IN_USE":
      return colors.info;
    case "CHARGING":
      return colors.riskCautionText;
    case "MAINTENANCE":
      return colors.riskDanger;
    default:
      return colors.textMuted;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** KPI card — mirrors web's <Kpi> */
function KpiCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: "warn" | "bad";
}) {
  const valueColor =
    tone === "bad"
      ? colors.riskDanger
      : tone === "warn"
      ? colors.riskCautionText
      : colors.textPrimary;
  return (
    <View style={kpi.card}>
      <View style={kpi.header}>
        <Text style={kpi.label}>{label}</Text>
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={tone === "bad" ? colors.riskDanger : tone === "warn" ? colors.riskCautionText : colors.accentPrimary}
        />
      </View>
      <Text style={[kpi.value, { color: valueColor }]}>{value}</Text>
      <Text style={kpi.note}>{note}</Text>
    </View>
  );
}

const kpi = StyleSheet.create({
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  note: { fontSize: 11, color: colors.textMuted },
});

/** Status breakdown bar — mirrors web's <StatusBreakdown> */
function StatusBreakdown({ vehicles }: { vehicles: Vehicle[] }) {
  const total = vehicles.length;
  const rows = STATUSES.map((s) => ({
    status: s,
    count: vehicles.filter((v) => v.status === s).length,
  }));

  return (
    <View style={sb.card}>
      <View style={sb.header}>
        <Text style={sb.title}>FLEET STATUS</Text>
        <View style={sb.badge}>
          <Text style={sb.badgeTxt}>{total} VEHICLES</Text>
        </View>
      </View>
      {rows.map(({ status, count }) => (
        <View key={status} style={sb.row}>
          <Text style={sb.statusName}>{status.replace("_", " ")}</Text>
          <View style={sb.track}>
            <View
              style={[
                sb.fill,
                {
                  width: total ? `${((count / total) * 100).toFixed(1)}%` : "0%",
                  backgroundColor: statusColor(status),
                },
              ]}
            />
          </View>
          <Text style={sb.count}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

const sb = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: colors.textPrimary, fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  badge: {
    backgroundColor: colors.bgSurfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeTxt: { color: colors.textMuted, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusName: { color: colors.textSecondary, fontSize: 12, width: 100 },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bgSurfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3 },
  count: { color: colors.textPrimary, fontSize: 13, fontWeight: "700", width: 24, textAlign: "right" },
});

// ─── DashboardScreen ──────────────────────────────────────────────────────────

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  vehicles,
  onNavigateTab,
  onSelectVehicle,
  refreshing = false,
  onRefresh,
}) => {
  const total = vehicles.length;
  const none = total === 0;
  const active = vehicles.filter((v) => v.status === "ACTIVE" || v.status === "IN_USE").length;
  const lowCharge = vehicles.filter((v) => (v.current_soc ?? 100) < LOW_SOC_PCT).length;
  const maintenance = vehicles.filter((v) => v.status === "MAINTENANCE").length;
  const avgSoc = avg(vehicles.map((v) => v.current_soc));
  const avgSoh = avg(vehicles.map((v) => v.current_soh));

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
            progressBackgroundColor={colors.bgSurface}
          />
        ) : undefined
      }
    >
      <Header title="Fleet Overview" subtitle="Vehicle State & Route Decision Support" />

      {/* ── KPI Grid (5 cards, same as web) ─────────────────────── */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label="Vehicles"
          value={String(total)}
          note={none ? "None registered yet" : `${active} active on route`}
          icon="car-multiple"
        />
        <KpiCard
          label="Avg charge"
          value={none ? "—" : `${avgSoc.toFixed(1)}%`}
          note="State of charge"
          icon="battery-charging-high"
        />
        <KpiCard
          label="Avg battery health"
          value={none ? "—" : `${avgSoh.toFixed(1)}%`}
          note="State of health"
          icon="heart-pulse"
        />
        <KpiCard
          label="Low charge"
          value={none ? "—" : String(lowCharge)}
          note={`Below ${LOW_SOC_PCT}% SOC`}
          icon="battery-alert"
          tone={lowCharge > 0 ? "warn" : undefined}
        />
        <KpiCard
          label="In maintenance"
          value={none ? "—" : String(maintenance)}
          note="Unavailable for trips"
          icon="wrench"
          tone={maintenance > 0 ? "bad" : undefined}
        />
      </View>

      {/* ── Quick action banners ──────────────────────────────────── */}
      <TouchableOpacity
        style={styles.banner}
        onPress={() => onNavigateTab("garage")}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <View style={[styles.bannerIcon, { backgroundColor: "#1A1A1A" }]}>
            <MaterialCommunityIcons name="garage-open-variant" size={26} color="#F0ECE0" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Browse vehicles in the garage</Text>
            <Text style={styles.bannerSub}>View specs, select a vehicle for simulation</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.banner}
        onPress={() => onNavigateTab("simulator")}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.badgeBg }]}>
            <MaterialCommunityIcons name="leaf-circle" size={26} color={colors.accentPrimary} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Physics Energy Simulator</Text>
            <Text style={styles.bannerSub}>
              Estimate arrival SOC with route, payload & elevation
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ── Fleet Status Breakdown ───────────────────────────────── */}
      {!none && <StatusBreakdown vehicles={vehicles} />}

      {/* ── Fleet Battery Snapshots ──────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fleet Battery Snapshots</Text>
        <TouchableOpacity onPress={() => onNavigateTab("fleet")}>
          <Text style={styles.sectionLink}>View All ({total})</Text>
        </TouchableOpacity>
      </View>

      {none ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="car-off" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Empty fleet</Text>
          <Text style={styles.emptyBody}>Register a vehicle to get started.</Text>
        </View>
      ) : (
        vehicles.map((vehicle) => {
          const isLow = (vehicle.current_soc ?? 100) < LOW_SOC_PCT;
          return (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleRow}
              onPress={() => {
                onSelectVehicle(vehicle);
                onNavigateTab("fleet");
              }}
              activeOpacity={0.7}
            >
              <View style={styles.vehicleLeft}>
                <View style={[styles.vehicleIcon, isLow && styles.vehicleIconLow]}>
                  <MaterialCommunityIcons
                    name="car-electric"
                    size={22}
                    color={isLow ? colors.riskDanger : colors.accentPrimary}
                  />
                </View>
                <View>
                  <Text style={styles.vehicleName}>{vehicle.name}</Text>
                  <Text style={styles.vehicleSub}>
                    {vehicle.model} · {vehicle.battery_capacity_kwh} kWh
                  </Text>
                  <Text style={styles.vehicleSub}>{formatBatteryState(vehicle)}</Text>
                </View>
              </View>

              <View style={styles.vehicleRight}>
                {/* SOC bar */}
                <View style={styles.socBar}>
                  <View
                    style={[
                      styles.socFill,
                      {
                        width: `${vehicle.current_soc}%`,
                        backgroundColor: isLow ? colors.riskDanger : colors.accentPrimary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.socPct, isLow && { color: colors.riskDanger }]}>
                  {vehicle.current_soc ?? 85}%
                </Text>
                <Text style={styles.vehicleStatus}>{vehicle.status || "IDLE"}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  // KPI grid
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },

  // Banners
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
  bannerSub: { fontSize: 11, color: colors.textSecondary },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  sectionLink: { fontSize: 13, color: colors.accentPrimary, fontWeight: "600" },

  // Empty state
  emptyCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  emptyBody: { color: colors.textMuted, fontSize: 13, textAlign: "center" },

  // Vehicle row
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  vehicleLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  vehicleIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.bgSurfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleIconLow: { backgroundColor: colors.riskDangerBg },
  vehicleName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
  vehicleSub: { fontSize: 11, color: colors.textMuted },
  vehicleRight: { alignItems: "flex-end", gap: 4 },
  socBar: {
    width: 60,
    height: 5,
    backgroundColor: colors.bgSurfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  socFill: { height: 5, borderRadius: 3 },
  socPct: { fontSize: 12, fontWeight: "700", color: colors.accentPrimary },
  vehicleStatus: { fontSize: 10, color: colors.textMuted },
});
