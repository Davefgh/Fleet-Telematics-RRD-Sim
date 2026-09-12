import { useState, useCallback } from 'react';
import { createFleetClient } from '@fleet/api-client';
import type { Vehicle, TelemetryEvent, SimulationResponse } from '@fleet/api-client';
import { useEffect, useRef } from 'react';

const api = createFleetClient({ baseUrl: 'http://localhost:8000' });

export function useFleetData(pollingIntervalMs: number = 5000) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [telemetry, setTelemetry] = useState<Record<string, TelemetryEvent>>({});
    const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const vehicleList = await api.getVehicles();
            setVehicles(vehicleList);

            const telemetryResults = await Promise.all(
                vehicleList.map(async (v) => {
                    const res = await api.getLatestTelemetry(v.id);
                    return { vehicleId: v.id, event: res.data };
                })
            );

            const telemetryMap: Record<string, TelemetryEvent> = {};
            for (const { vehicleId, event } of telemetryResults) {
                if (event) telemetryMap[vehicleId] = event;
            }
            setTelemetry(telemetryMap);

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch fleet data');
        } finally {
            setLoading(false);
        }
    }, []);

    const runSimulation = useCallback(async (vehicleId: string) => {
        try {
            const result = await api.runSimulation({
                vehicle_id: vehicleId,
                route_distance_km: 129.4,
                elevation_gain_m: 720,
                ambient_temp_c: 27,
                payload_kg: 450,
                driving_style: 'NORMAL',
                regen_level: 'MEDIUM',
                hvac_mode: 'LOW',
            });
            setSimulation(result);
        } catch (err) {
            console.error('Simulation failed:', err);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, pollingIntervalMs);
        return () => clearInterval(interval);
    }, [fetchData, pollingIntervalMs]);

    return { vehicles, telemetry, simulation, loading, error, refetch: fetchData, runSimulation };
}
