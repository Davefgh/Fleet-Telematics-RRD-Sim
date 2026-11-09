import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatBatteryHistory } from "@fleet/api-client";
import type { Vehicle } from "@fleet/api-client";
import { colors } from "../constants/theme";
import { Header } from "../components";

interface BatteryScreenProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle?: (v: Vehicle) => void;
}

const MONTHS = ["MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP"];

export const BatteryScreen: React.FC<BatteryScreenProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
}) => {
  const activeVehicle = selectedVehicle ?? vehicles[0] ?? null;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="Battery"
        subtitle="Pack Health, Thermal State & Regenerative Braking"
      />

      {/* Vehicle Picker */}
      {vehicles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vehicleScroll}
        >
          {vehicles.map((v) => {
            const isSelected = v.id === activeVehicle?.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.vehicleChip, isSelected && styles.vehicleChipActive]}
                onPress={() => onSelectVehicle?.(v)}
              >
                <Text style={[styles.vehicleChipName, isSelected && styles.vehicleChipNameActive]}>
                  {v.name}
                </Text>
                <Text style={styles.vehicleChipSub}>
                  {v.current_soh}% SOH · {v.battery_capacity_kwh} kWh
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {activeVehicle && (
        <>
          {/* Main Battery Status Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="battery-charging" size={20} color="#00C2FF" />
              <Text style={styles.cardTitle}>PACK STATUS · {activeVehicle.id}</Text>
            </View>

            {/* SOC Bar */}
            <View style={styles.metricWrap}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>STATE OF CHARGE</Text>
                <Text style={[styles.metricVal, { color: colors.accentPrimary }]}>
                  {activeVehicle.current_soc}%
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${activeVehicle.current_soc}%`, backgroundColor: colors.accentPrimary },
                  ]}
                />
              </View>
            </View>

            {/* SOH Bar */}
            <View style={styles.metricWrap}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>STATE OF HEALTH (SOH)</Text>
                <Text style={[styles.metricVal, { color: "#00C2FF" }]}>
                  {activeVehicle.current_soh.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${activeVehicle.current_soh}%`, backgroundColor: "#00C2FF" },
                  ]}
                />
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Pack capacity</Text>
                <Text style={styles.infoVal}>{activeVehicle.battery_capacity_kwh} kWh</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Efficiency</Text>
                <Text style={styles.infoVal}>{activeVehicle.baseline_efficiency_wh_km} Wh/km</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Pack temperature</Text>
                <Text style={[styles.infoVal, { color: "#00C2FF" }]}>31.5°C</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Thermal stress</Text>
                <Text style={styles.infoVal}>
                  {activeVehicle.thermal_stress_index ?? 0}/100
                </Text>
              </View>
            </View>
          </View>

          {/* Illustrative Thermal Distribution Matrix */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="grid" size={20} color="#00C2FF" />
              <Text style={styles.cardTitle}>CELL THERMAL MATRIX</Text>
              <Text style={styles.cardSub}>Avg 31.8°C · Max 33.1°C</Text>
            </View>

            <View style={styles.thermalGrid}>
              {[
                "31.2°", "31.4°", "31.9°", "32.1°",
                "31.6°", "32.4°", "33.1°", "32.6°",
                "31.3°", "31.8°", "32.2°", "31.9°",
              ].map((temp, i) => (
                <View key={i} style={styles.thermalCell}>
                  <Text style={styles.thermalCellTxt}>{temp}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.thermalHint}>Cell modules within optimal 25°C–35°C operating window.</Text>
          </View>

          {/* SOH Degradation History */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="chart-bell-curve" size={20} color="#00C2FF" />
              <Text style={styles.cardTitle}>6-MONTH HEALTH HISTORY</Text>
            </View>

            <View style={styles.historyRow}>
              {MONTHS.map((m, i) => {
                const sohEstimate = (activeVehicle.current_soh - (6 - i) * 0.35).toFixed(1);
                return (
                  <View key={m} style={styles.historyCol}>
                    <Text style={styles.historyVal}>{sohEstimate}%</Text>
                    <View style={styles.historyBarWrap}>
                      <View style={[styles.historyBar, { height: Math.max(16, 50 - (6 - i) * 4) }]} />
                    </View>
                    <Text style={styles.historyMonth}>{m}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Operating History & Stress Assessment */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color="#00C2FF" />
              <Text style={styles.cardTitle}>BATTERY STRESS ASSESSMENT</Text>
            </View>

            <View style={styles.stressRow}>
              <Text style={styles.stressLabel}>Stress classification</Text>
              <Text style={[styles.stressVal, { color: colors.accentPrimary }]}>
                {formatBatteryHistory(activeVehicle.battery_history)}
              </Text>
            </View>
            <View style={styles.stressRow}>
              <Text style={styles.stressLabel}>Fast-charge share</Text>
              <Text style={styles.stressVal}>{activeVehicle.fast_charge_share_pct ?? 0}%</Text>
            </View>
            <View style={styles.stressRow}>
              <Text style={styles.stressLabel}>Depth of discharge (avg)</Text>
              <Text style={styles.stressVal}>{activeVehicle.avg_dod_pct ?? 65}%</Text>
            </View>
            <View style={styles.stressRow}>
              <Text style={styles.stressLabel}>Full cycle count</Text>
              <Text style={styles.stressVal}>{activeVehicle.cycle_count ?? 142} cycles</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  vehicleScroll: {
    gap: 8,
    marginBottom: 14,
  },
  vehicleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1E2D3D",
  },
  vehicleChipActive: {
    borderColor: "#00C2FF",
    backgroundColor: "rgba(0, 194, 255, 0.12)",
  },
  vehicleChipName: {
    color: "#9AA8BD",
    fontSize: 12,
    fontWeight: "600",
  },
  vehicleChipNameActive: {
    color: "#00C2FF",
    fontWeight: "700",
  },
  vehicleChipSub: {
    color: "#555",
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#0D1321",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E2D3D",
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#F0ECE0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    flex: 1,
  },
  cardSub: {
    color: "#9AA8BD",
    fontSize: 11,
  },
  metricWrap: {
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  metricLabel: {
    color: "#9AA8BD",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "900",
  },
  track: {
    height: 6,
    backgroundColor: "#162030",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E2D3D",
    gap: 12,
  },
  infoItem: {
    width: "46%",
  },
  infoLabel: {
    color: "#7F8A9C",
    fontSize: 10,
  },
  infoVal: {
    color: "#F0ECE0",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  thermalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  thermalCell: {
    width: "22%",
    backgroundColor: "#162030",
    borderWidth: 1,
    borderColor: "#1E2D3D",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  thermalCellTxt: {
    color: "#00C2FF",
    fontSize: 12,
    fontWeight: "700",
  },
  thermalHint: {
    color: "#7F8A9C",
    fontSize: 11,
    marginTop: 8,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 8,
  },
  historyCol: {
    alignItems: "center",
    gap: 4,
  },
  historyVal: {
    color: "#7F8A9C",
    fontSize: 9,
  },
  historyBarWrap: {
    height: 60,
    justifyContent: "flex-end",
  },
  historyBar: {
    width: 14,
    backgroundColor: "#00C2FF",
    borderRadius: 3,
  },
  historyMonth: {
    color: "#9AA8BD",
    fontSize: 10,
    fontWeight: "600",
  },
  stressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2D3D",
  },
  stressLabel: {
    color: "#9AA8BD",
    fontSize: 12,
  },
  stressVal: {
    color: "#F0ECE0",
    fontSize: 12,
    fontWeight: "700",
  },
});

