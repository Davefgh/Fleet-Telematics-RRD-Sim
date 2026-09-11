import { useState, useEffect, useCallback } from 'react';
import { createFleetClient } from '@fleet/api-client';
import type { Vehicle, TelemetryEvent, SimulationResponse } from '@fleet/api-client';

const api = createFleetClient({ baseUrl: 'http://localhost:8000' });

export function useFleetData(pollingIntervalMs: number = 5000) {
    // ---- State declarations ----
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [telemetry, setTelemetry] = useState<Record<string, TelemetryEvent>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);



    const fetchData = useCallback(async () => {
        try {
            // Fetch all vehicles
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
            setLoading(false);  // Whether success or error, we're done loading
        }
    }, []);

    // ---- Effect: initial fetch + polling ----
    useEffect(() => {
        fetchData();

        const interval = setInterval(fetchData, pollingIntervalMs);
        return () => clearInterval(interval);
    }, [fetchData, pollingIntervalMs]);

    return { vehicles, telemetry, loading, error, refetch: fetchData };
}
