import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Vehicle } from "@fleet/api-client";
import { colors } from "../constants/theme";
import { Header } from "../components";

interface RouteScreenProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle?: (v: Vehicle) => void;
}

const ROUTE_WAYPOINTS = [
  { name: "Manila", distanceKm: 0, elevationM: 8 },
  { name: "San Fernando", distanceKm: 65.8, elevationM: 6 },
  { name: "Urdaneta", distanceKm: 183.3, elevationM: 26 },
  { name: "Rosario", distanceKm: 213.5, elevationM: 119 },
  { name: "Agoo", distanceKm: 233.4, elevationM: 21 },
  { name: "Tubao", distanceKm: 240.8, elevationM: 43 },
  { name: "Pugo", distanceKm: 249.3, elevationM: 86 },
  { name: "Tuba", distanceKm: 277.5, elevationM: 1413 },
  { name: "Baguio", distanceKm: 282.8, elevationM: 1446 },
];

const CHARGING_STATIONS = [
  {
    id: "CS-01",
    name: "Sample Charger A",
    powerKw: 150,
    type: "DC Fast (150kW)",
    fee: "₱28/kWh",
    available: 3,
    total: 4,
    distanceKm: 65.8,
  },
  {
    id: "CS-02",
    name: "Sample Charger B",
    powerKw: 350,
    type: "Ultra-Fast (350kW)",
    fee: "₱34/kWh",
    available: 1,
    total: 2,
    distanceKm: 213.5,
  },
  {
    id: "CS-03",
    name: "Sample Charger C",
    powerKw: 50,
    type: "Level 2 (50kW)",
    fee: "₱22/kWh",
    available: 5,
    total: 6,
    distanceKm: 249.3,
  },
];

export const RouteScreen: React.FC<RouteScreenProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
}) => {
  const activeVehicle = selectedVehicle ?? vehicles[0] ?? null;

  const estimateChargeTimeMin = (stationKw: number) => {
    if (!activeVehicle) return null;
    const currentSoc = activeVehicle.current_soc;
    if (currentSoc >= 80) return 0;
    const energyNeededKwh = ((80 - currentSoc) / 100) * activeVehicle.battery_capacity_kwh;
    const minutes = (energyNeededKwh / (stationKw * 0.88)) * 60;
    return Math.round(minutes);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="Route & Charging"
        subtitle="Manila → Baguio via Marcos Highway · 282.8 km"
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
                  {v.current_soc}% SOC · {v.battery_capacity_kwh} kWh
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Route Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color="#00C2FF" />
          <Text style={styles.cardTitle}>ROUTE STATS</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>282.8</Text>
            <Text style={styles.statUnit}>km distance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.accentPrimary }]}>+1,913</Text>
            <Text style={styles.statUnit}>m ascent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.riskCautionText }]}>-475</Text>
            <Text style={styles.statUnit}>m descent</Text>
          </View>
        </View>
      </View>

      {/* Charging Stops */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="ev-station" size={20} color="#00C2FF" />
          <Text style={styles.cardTitle}>SAMPLE CHARGING STOPS</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>9 PORTS OPEN</Text>
          </View>
        </View>

        {CHARGING_STATIONS.map((station) => {
          const chargeTime = estimateChargeTimeMin(station.powerKw);
          const isHighAvail = station.available > 1;
          return (
            <View key={station.id} style={styles.stationRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stationName}>{station.name}</Text>
                <Text style={styles.stationSub}>
                  {station.type} · {station.distanceKm} km · {station.fee}
                </Text>
                {chargeTime !== null && (
                  <Text style={styles.chargeEst}>
                    Est. {chargeTime} min to 80% charge
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[
                    styles.stationAvail,
                    { color: isHighAvail ? colors.accentPrimary : colors.riskCautionText },
                  ]}
                >
                  {station.available} / {station.total}
                </Text>
                <Text style={styles.stationAvailLabel}>ports open</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Waypoints Timeline */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#00C2FF" />
          <Text style={styles.cardTitle}>KEY ELEVATION WAYPOINTS</Text>
        </View>

        {ROUTE_WAYPOINTS.map((wp, i) => (
          <View key={wp.name} style={styles.wpRow}>
            <View style={styles.wpDotCol}>
              <View style={[styles.wpDot, i === ROUTE_WAYPOINTS.length - 1 && styles.wpDotEnd]} />
              {i < ROUTE_WAYPOINTS.length - 1 && <View style={styles.wpLine} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 12 }}>
              <Text style={styles.wpName}>{wp.name}</Text>
              <Text style={styles.wpSub}>
                {wp.distanceKm} km · {wp.elevationM} m altitude
              </Text>
            </View>
          </View>
        ))}
      </View>
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
  badge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeTxt: {
    color: colors.accentPrimary,
    fontSize: 10,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statVal: {
    color: "#00C2FF",
    fontSize: 22,
    fontWeight: "900",
  },
  statUnit: {
    color: "#9AA8BD",
    fontSize: 11,
    marginTop: 2,
  },
  stationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2D3D",
  },
  stationName: {
    color: "#F0ECE0",
    fontSize: 13,
    fontWeight: "700",
  },
  stationSub: {
    color: "#9AA8BD",
    fontSize: 11,
    marginTop: 2,
  },
  chargeEst: {
    color: "#00C2FF",
    fontSize: 11,
    marginTop: 3,
    fontWeight: "600",
  },
  stationAvail: {
    fontSize: 15,
    fontWeight: "900",
  },
  stationAvailLabel: {
    color: "#555",
    fontSize: 9,
  },
  wpRow: {
    flexDirection: "row",
    gap: 12,
  },
  wpDotCol: {
    alignItems: "center",
    width: 16,
  },
  wpDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00C2FF",
    marginTop: 3,
  },
  wpDotEnd: {
    backgroundColor: colors.accentPrimary,
  },
  wpLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#1E2D3D",
    marginVertical: 2,
  },
  wpName: {
    color: "#F0ECE0",
    fontSize: 13,
    fontWeight: "600",
  },
  wpSub: {
    color: "#9AA8BD",
    fontSize: 11,
    marginTop: 1,
  },
});

