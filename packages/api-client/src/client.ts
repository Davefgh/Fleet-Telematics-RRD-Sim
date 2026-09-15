import type {
  SimulationRequest,
  SimulationResponse,
  TelemetryEvent,
  TelemetryResponse,
  Vehicle,
} from "./types";

export interface FleetApiClientConfig {
  baseUrl: string;
}

export class FleetApiClient {
  private baseUrl: string;

  constructor(config?: { baseUrl?: string }) {
    this.baseUrl = config?.baseUrl?.replace(/\/$/, "") || "";
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, "");
  }

  private async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let errorMessage = `API error ${res.status}: ${res.statusText}`;
      try {
        const errorBody = await res.json();
        if (errorBody?.detail) {
          errorMessage = typeof errorBody.detail === "string" ? errorBody.detail : JSON.stringify(errorBody.detail);
        }
      } catch {
        // Fall back to status text
      }
      throw new Error(errorMessage);
    }

    return res.json();
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return this.fetchJson<Vehicle[]>("/api/vehicles/");
  }

  async getVehicle(vehicleId: string): Promise<Vehicle> {
    return this.fetchJson<Vehicle>(`/api/vehicles/${encodeURIComponent(vehicleId)}`);
  }

  // Telemetry
  async getLatestTelemetry(vehicleId: string): Promise<TelemetryResponse> {
    return this.fetchJson<TelemetryResponse>(`/api/telemetry/${encodeURIComponent(vehicleId)}/latest`);
  }

  async ingestTelemetry(event: TelemetryEvent): Promise<TelemetryResponse> {
    return this.fetchJson<TelemetryResponse>("/api/telemetry/ingest", {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  // Simulation
  async runSimulation(req: SimulationRequest): Promise<SimulationResponse> {
    return this.fetchJson<SimulationResponse>("/api/simulation/run", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  // Health
  async checkHealth(): Promise<{ status: string }> {
    return this.fetchJson<{ status: string }>("/api/health");
  }
}

export const createFleetClient = (config?: { baseUrl?: string }) => new FleetApiClient(config);
