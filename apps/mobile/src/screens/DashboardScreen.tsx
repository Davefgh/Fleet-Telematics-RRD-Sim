import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatBatteryState } from "@fleet/api-client";
import type { Vehicle } from "@fleet/api-client";
import { colors } from "../constants/theme";
import type { TabType } from "../navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOW_SOC_PCT = 30;
const STATUSES = ["AVAILABLE", "IN_USE", "CHARGING", "MAINTENANCE"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardScreenProps {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle | null;
  onNavigateTab: (tab: TabType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avg = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "#10B981";
    case "IN_USE":
      return "#00C2FF";
    case "CHARGING":
      return "#F59E0B";
    case "MAINTENANCE":
      return "#EF4444";
    default:
      return "#9AA8BD";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Web-matching KPI Card */
function KpiCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "warn" | "bad";
}) {
  const valueColor =
    tone === "bad"
      ? colors.riskDanger
      : tone === "warn"
      ? colors.riskCautionText
      : "#F0ECE0";

  return (
    <View style={kpi.card}>
      <Text style={kpi.label}>{label}</Text>
      <Text style={[kpi.value, { color: valueColor }]}>{value}</Text>
      <Text style={kpi.note}>{note}</Text>
    </View>
  );
}

const kpi = StyleSheet.create({
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#0D1321", // web --bg-secondary
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E2D3D",
  },
  label: {
    color: "#9AA8BD", // web --text-secondary
    fontSize: 12,
    fontWeight: "500",
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  note: {
    color: "#7F8A9C", // web --text-muted
    fontSize: 11,
  },
});

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  vehicles,
  selectedVehicle,
  onNavigateTab,
  onSelectVehicle,
  refreshing = false,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const total = vehicles.length;
  const none = total === 0;
  const reporting = vehicles.filter((v) => v.state_source === "telemetry").length;
  const lowCharge = vehicles.filter((v) => (v.current_soc ?? 100) < LOW_SOC_PCT).length;
  const maintenance = vehicles.filter((v) => v.status === "MAINTENANCE").length;
  const avgSoc = avg(vehicles.map((v) => v.current_soc));
  const avgSoh = avg(vehicles.map((v) => v.current_soh));

  const activeVehicle = selectedVehicle ?? vehicles[0] ?? null;

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    return v.name.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.id.toLowerCase().includes(q);
  });

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00C2FF"
            colors={["#00C2FF"]}
            progressBackgroundColor="#0D1321"
          />
        ) : undefined
      }
    >
      {/* ── Title Header ─────────────────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSubtitle}>
          Current battery state, status and positions across the fleet.
        </Text>
      </View>

      {/* ── 5 KPI Grid (Identical to Web) ────────────────────────── */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label="Vehicles"
          value={String(total)}
          note={none ? "None registered yet" : `${reporting} reporting telemetry`}
        />
        <KpiCard
          label="Avg charge"
          value={none ? "—" : `${avgSoc.toFixed(1)}%`}
          note="State of charge"
        />
        <KpiCard
          label="Avg battery health"
          value={none ? "—" : `${avgSoh.toFixed(1)}%`}
          note="State of health"
        />
        <KpiCard
          label="Low charge"
          value={none ? "—" : String(lowCharge)}
          note={`Below ${LOW_SOC_PCT}% SOC`}
          tone={lowCharge > 0 ? "warn" : undefined}
        />
        <KpiCard
          label="In maintenance"
          value={none ? "—" : String(maintenance)}
          note="Unavailable for trips"
          tone={maintenance > 0 ? "bad" : undefined}
        />
      </View>

      {/* ── Route Map Panel (Manila – Baguio) ────────────────────── */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>ROUTE MAP — MANILA – BAGUIO</Text>
          <View style={styles.badgeCyan}>
            <Text style={styles.badgeCyanTxt}>REPORTED POSITIONS</Text>
          </View>
        </View>

        {/* Visual Map Representation */}
        <View style={styles.mapCanvas}>
          {/* Background topographic grid simulation */}
          <View style={styles.mapTopography}>
            <View style={[styles.topoLine, { top: 20 }]} />
            <View style={[styles.topoLine, { top: 60 }]} />
            <View style={[styles.topoLine, { top: 100 }]} />
            <View style={[styles.topoLine, { top: 140 }]} />
          </View>

          {/* Route curve */}
          <View style={styles.routeTrack}>
            <View style={styles.routeSegment} />
          </View>

          {/* Destination Pin (Baguio) */}
          <View style={[styles.pinCallout, styles.pinBaguio]}>
            <View style={styles.pinDot} />
            <View style={styles.pinBubble}>
              <Text style={styles.pinTitle}>Baguio · 282.8 km · 1446 m</Text>
            </View>
          </View>

          {/* Origin Pin (Manila) */}
          <View style={[styles.pinCallout, styles.pinManila]}>
            <View style={[styles.pinDot, styles.pinDotGreen]} />
            <View style={styles.pinBubble}>
              <Text style={styles.pinTitle}>Manila · 0 km · 8 m</Text>
            </View>
          </View>

          {/* Vehicle position badges */}
          <View style={styles.mapFoot}>
            <Text style={styles.mapFootLabel}>Vehicles on route:</Text>
            {vehicles.map((v) => (
              <View key={v.id} style={styles.vehiclePill}>
                <Text style={styles.vehiclePillTxt}>{v.id}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Vehicles List Panel ──────────────────────────────────── */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>VEHICLES</Text>
          <Text style={styles.panelMeta}>
            {filteredVehicles.length} OF {total} SHOWN
          </Text>
        </View>

        {/* Search Vehicles Input */}
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={18} color="#7F8A9C" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Vehicles"
            placeholderTextColor="#7F8A9C"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#7F8A9C" />
            </TouchableOpacity>
          )}
        </View>

        {/* Vehicle Cards */}
        {filteredVehicles.map((v) => {
          const isSelected = v.id === activeVehicle?.id;
          const statusCol = getStatusBadgeColor(v.status);
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
              onPress={() => onSelectVehicle(v)}
              activeOpacity={0.75}
            >
              <View style={styles.vehicleCardTop}>
                <Text style={styles.vehiclePlate}>{v.id}</Text>
                <View style={[styles.statusBadge, { borderColor: statusCol }]}>
                  <Text style={[styles.statusBadgeTxt, { color: statusCol }]}>
                    {v.status || "AVAILABLE"}
                  </Text>
                </View>
              </View>

              <Text style={styles.vehicleModel}>{v.model}</Text>
              <Text style={styles.vehicleSource}>{formatBatteryState(v)}</Text>

              {/* SOC Bar */}
              <View style={styles.socBarWrap}>
                <View style={styles.socTrack}>
                  <View
                    style={[
                      styles.socFill,
                      {
                        width: `${Math.min(100, Math.max(0, v.current_soc))}%`,
                        backgroundColor:
                          v.current_soc > 50
                            ? "#10B981"
                            : v.current_soc > 25
                            ? "#F59E0B"
                            : "#EF4444",
                      },
                    ]}
                  />
                </View>
                <View style={styles.socMeta}>
                  <Text style={styles.socPct}>{v.current_soc.toFixed(0)}%</Text>
                  <Text style={styles.socCap}>{v.battery_capacity_kwh} kWh</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Recent Assessments Panel ─────────────────────────────── */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>
            RECENT ASSESSMENTS · {activeVehicle ? activeVehicle.id : "NONE"}
          </Text>
        </View>
        <View style={styles.emptyAssessments}>
          <Text style={styles.emptyAssessmentsTxt}>
            No saved assessments for this vehicle yet.
          </Text>
        </View>
      </View>

      {/* ── Fleet Status Breakdown Panel ─────────────────────────── */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>FLEET STATUS</Text>
          <Text style={styles.panelMeta}>{total} VEHICLES</Text>
        </View>

        {STATUSES.map((st) => {
          const count = vehicles.filter((v) => (v.status || "AVAILABLE") === st).length;
          const pct = total ? (count / total) * 100 : 0;
          const barCol = getStatusBadgeColor(st);
          return (
            <View key={st} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{st.replace("_", " ")}</Text>
              <View style={styles.statusBarTrack}>
                <View
                  style={[
                    styles.statusBarFill,
                    { width: `${pct}%`, backgroundColor: barCol },
                  ]}
                />
              </View>
              <Text style={styles.statusCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    color: "#F0ECE0",
    fontSize: 22,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: "#9AA8BD",
    fontSize: 12,
    marginTop: 3,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  // Panels
  panel: {
    backgroundColor: "#0D1321", // web --bg-secondary
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E2D3D", // web --border-color
    padding: 16,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  panelTitle: {
    color: "#F0ECE0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  panelMeta: {
    color: "#7F8A9C",
    fontSize: 11,
    fontWeight: "600",
  },
  badgeCyan: {
    backgroundColor: "rgba(0, 194, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeCyanTxt: {
    color: "#00C2FF",
    fontSize: 9,
    fontWeight: "700",
  },

  // Map Canvas
  mapCanvas: {
    height: 180,
    backgroundColor: "#081018",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#17283C",
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 10,
  },
  mapTopography: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
  },
  topoLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#00C2FF",
  },
  routeTrack: {
    position: "absolute",
    left: "48%",
    top: 35,
    bottom: 45,
    width: 3,
    backgroundColor: "#00C2FF",
    borderRadius: 2,
    opacity: 0.8,
  },
  routeSegment: {
    flex: 1,
  },
  pinCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pinBaguio: {
    alignSelf: "center",
    marginTop: 6,
  },
  pinManila: {
    alignSelf: "center",
    marginBottom: 6,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00C2FF",
  },
  pinDotGreen: {
    backgroundColor: "#10B981",
  },
  pinBubble: {
    backgroundColor: "rgba(10, 16, 26, 0.9)",
    borderWidth: 1,
    borderColor: "#1E2D3D",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pinTitle: {
    color: "#F0ECE0",
    fontSize: 10,
    fontWeight: "700",
  },
  mapFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mapFootLabel: {
    color: "#555",
    fontSize: 9,
  },
  vehiclePill: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#00C2FF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  vehiclePillTxt: {
    color: "#00C2FF",
    fontSize: 9,
    fontWeight: "700",
  },

  // Vehicles List
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1E2D3D",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#F0ECE0",
    fontSize: 13,
  },
  vehicleCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1E2D3D",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  vehicleCardActive: {
    borderColor: "#00C2FF",
    backgroundColor: "rgba(0, 194, 255, 0.05)",
  },
  vehicleCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehiclePlate: {
    color: "#F0ECE0",
    fontSize: 14,
    fontWeight: "800",
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeTxt: {
    fontSize: 9,
    fontWeight: "700",
  },
  vehicleModel: {
    color: "#9AA8BD",
    fontSize: 12,
    marginTop: 2,
  },
  vehicleSource: {
    color: "#555",
    fontSize: 10,
    marginTop: 2,
    fontStyle: "italic",
  },
  socBarWrap: {
    marginTop: 8,
  },
  socTrack: {
    height: 4,
    backgroundColor: "#1E2D3D",
    borderRadius: 2,
    overflow: "hidden",
  },
  socFill: {
    height: 4,
    borderRadius: 2,
  },
  socMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  socPct: {
    color: "#9AA8BD",
    fontSize: 10,
    fontWeight: "700",
  },
  socCap: {
    color: "#555",
    fontSize: 10,
  },

  // Assessments
  emptyAssessments: {
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyAssessmentsTxt: {
    color: "#7F8A9C",
    fontSize: 12,
  },

  // Fleet Status Breakdown
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  statusLabel: {
    color: "#9AA8BD",
    fontSize: 11,
    fontWeight: "600",
    width: 90,
  },
  statusBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#162030",
    borderRadius: 3,
    overflow: "hidden",
  },
  statusBarFill: {
    height: 6,
    borderRadius: 3,
  },
  statusCount: {
    color: "#F0ECE0",
    fontSize: 12,
    fontWeight: "700",
    width: 20,
    textAlign: "right",
  },
});
