import { useState, useCallback, useEffect } from 'react';
import { createFleetClient } from '@fleet/api-client';
import type { Vehicle, TelemetryEvent, SimulationResponse, SimulationRequest } from '@fleet/api-client';
import { MOCK_VEHICLES, MOCK_TELEMETRY } from '../mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = createFleetClient({ baseUrl: API_BASE_URL });

export function useFleetData(pollingIntervalMs: number = 5000) {
    const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
    const [telemetry, setTelemetry] = useState<Record<string, TelemetryEvent>>(MOCK_TELEMETRY);
    const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const vehicleList = await api.getVehicles();
            if (vehicleList && vehicleList.length > 0) {
                setVehicles(vehicleList);

                const telemetryResults = await Promise.all(
                    vehicleList.map(async (v) => {
                        try {
                            const res = await api.getLatestTelemetry(v.id);
                            return { vehicleId: v.id, event: res.data };
                        } catch {
                            return { vehicleId: v.id, event: null };
                        }
                    })
                );

                const telemetryMap: Record<string, TelemetryEvent> = {};
                for (const { vehicleId, event } of telemetryResults) {
                    if (event) telemetryMap[vehicleId] = event;
                }
                if (Object.keys(telemetryMap).length > 0) {
                    setTelemetry(prev => ({ ...prev, ...telemetryMap }));
                }
            }

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect to fleet backend');
        } finally {
            setLoading(false);
        }
    }, []);

    const runSimulation = useCallback(async (req: SimulationRequest) => {
        setIsSimulating(true);
        try {
            const result = await api.runSimulation(req);
            setSimulation(result);
        } catch (err) {
            console.error('Simulation failed:', err);
        } finally {
            setIsSimulating(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, pollingIntervalMs);
        return () => clearInterval(interval);
    }, [fetchData, pollingIntervalMs]);

    return { vehicles, telemetry, simulation, loading, error, isSimulating, refetch: fetchData, runSimulation };
}
