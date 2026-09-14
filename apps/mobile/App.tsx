import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { SimulationResponse, Vehicle } from "@fleet/api-client";

import { client, API_URL } from "./src/config/api";
import { colors } from "./src/constants/theme";
import {
  Header,
  ErrorBanner,
  VehicleList,
  VehicleDetails,
  SimulationResult,
} from "./src/components";

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    setError(null);
    try {
      const data = await client.getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicle(data[0]);
      }
    } catch (err: any) {
      setError(
        `${err?.message || "Failed to load vehicles. Ensure backend is running."} (API: ${API_URL})`
      );
    } finally {
      setLoading(false);
    }
  }

  async function runSampleSimulation(vehicle: Vehicle) {
    setLoading(true);
    setError(null);
    try {
      const result = await client.runSimulation({
        vehicle_id: vehicle.id,
        route_distance_km: 120,
        elevation_gain_m: 350,
        ambient_temp_c: 18,
        payload_kg: 200,
        hvac_mode: "LOW",
        driving_style: "NORMAL",
        regen_level: "MEDIUM",
        reserve_soc_target_pct: 15,
      });
      setSimResult(result);
    } catch (err: any) {
      setError(`${err?.message || "Simulation failed."} (API: ${API_URL})`);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSimResult(null);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Header />

          {error && <ErrorBanner message={error} onRetry={loadVehicles} />}

          <VehicleList
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            loading={loading}
            onSelectVehicle={handleSelectVehicle}
          />

          {selectedVehicle && (
            <VehicleDetails
              vehicle={selectedVehicle}
              loading={loading}
              onRunSimulation={runSampleSimulation}
            />
          )}

          {simResult && <SimulationResult result={simResult} />}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
