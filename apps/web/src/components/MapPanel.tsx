import { useEffect, useMemo } from 'react';
import type { LeafletMouseEvent, Map as LeafletMap } from 'leaflet';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { TelemetryEvent } from '@fleet/api-client';
import { CHARGING_STATIONS, ROUTE_DISTANCE_KM, ROUTE_GEOMETRY, ROUTE_WAYPOINTS } from '../routeData';

interface MapPanelProps {
    vehicles: Array<{ id: string; current_soc: number; status: string; model?: string }>;
    telemetry: Record<string, TelemetryEvent>;
    dataStatus: 'demo' | 'live' | 'cached';
    selectedVehicleId: string | null;
    selectedStationId?: string | null;
    progressFraction: number; // 0–1 how far along the route
    onSelectVehicle?: (id: string) => void;
    onSelectStation?: (stationId: string) => void;
    onProgressChange?: (progress: number) => void;
}

const LABELLED_WAYPOINTS = new Set(['Portland', 'Government Camp', 'Bend']);

// Cumulative length along the route; equirectangular is accurate enough at this scale.
const CUMULATIVE = ROUTE_GEOMETRY.reduce<number[]>((cum, [lat, lon], i) => {
    if (i === 0) return [0];
    const [plat, plon] = ROUTE_GEOMETRY[i - 1];
    const dx = (lon - plon) * Math.cos(((lat + plat) / 2) * (Math.PI / 180));
    return [...cum, cum[i - 1] + Math.hypot(dx, lat - plat)];
}, []);

// Point at fractional distance t [0..1] along the route
function pointAlongRoute(t: number): [number, number] {
    const target = Math.min(1, Math.max(0, t)) * CUMULATIVE[CUMULATIVE.length - 1];
    const i = Math.max(1, CUMULATIVE.findIndex(d => d >= target));
    const span = CUMULATIVE[i] - CUMULATIVE[i - 1];
    const f = span > 0 ? (target - CUMULATIVE[i - 1]) / span : 0;
    const [lat1, lon1] = ROUTE_GEOMETRY[i - 1];
    const [lat2, lon2] = ROUTE_GEOMETRY[i];
    return [lat1 + (lat2 - lat1) * f, lon1 + (lon2 - lon1) * f];
}

// Inverse of pointAlongRoute: route fraction of the closest point on any segment.
function routeFractionAt(lat: number, lon: number): number {
    let bestDist = Infinity;
    let bestAlong = 0;
    for (let i = 1; i < ROUTE_GEOMETRY.length; i++) {
        const [lat1, lon1] = ROUTE_GEOMETRY[i - 1];
        const [lat2, lon2] = ROUTE_GEOMETRY[i];
        const k = Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
        const [sx, sy] = [(lon2 - lon1) * k, lat2 - lat1];
        const [px, py] = [(lon - lon1) * k, lat - lat1];
        const len2 = sx * sx + sy * sy;
        const f = len2 > 0 ? Math.min(1, Math.max(0, (px * sx + py * sy) / len2)) : 0;
        const dist = Math.hypot(px - f * sx, py - f * sy);
        if (dist < bestDist) {
            bestDist = dist;
            bestAlong = CUMULATIVE[i - 1] + f * (CUMULATIVE[i] - CUMULATIVE[i - 1]);
        }
    }
    return bestAlong / CUMULATIVE[CUMULATIVE.length - 1];
}

if (import.meta.env.DEV) {
    for (const t of [0, 0.37, 0.8, 1]) {
        console.assert(Math.abs(routeFractionAt(...pointAlongRoute(t)) - t) < 1e-6, `routeFractionAt round trip failed at ${t}`);
    }
}

// Pans to the selection only when it is off-screen; keyed on the ID so telemetry polls never re-pan.
function PanToSelection({ id, position }: { id: string | null; position: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.panInside(position, { padding: [48, 48] });
    }, [map, id]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
}

// Module-level so the ref keeps its identity and runs once, not on every render.
// Leaflet's container is a role-less div, and ARIA prohibits aria-label on generic elements.
const labelMap = (map: LeafletMap | null) => {
    map?.getContainer().setAttribute('role', 'region');
    map?.getContainer().setAttribute('aria-label', 'Route map, Portland to Bend');
};

const socColor = (soc: number) => soc > 60 ? '#10b981' : soc > 30 ? '#f59e0b' : '#ef4444';

export function MapPanel({
    vehicles,
    telemetry,
    dataStatus,
    selectedVehicleId,
    selectedStationId,
    progressFraction = 0.5,
    onSelectVehicle,
    onSelectStation,
    onProgressChange,
}: MapPanelProps) {
    // Memoized: react-leaflet rebinds handlers whenever this object's identity changes.
    const routeClick = useMemo(
        () => ({ click: (e: LeafletMouseEvent) => onProgressChange?.(routeFractionAt(e.latlng.lat, e.latlng.lng)) }),
        [onProgressChange],
    );
    const selectedStation = CHARGING_STATIONS.find(st => st.id === selectedStationId);
    const positioned = vehicles.flatMap(v => {
        const t = telemetry[v.id];
        return t && Number.isFinite(t.latitude) && Number.isFinite(t.longitude)
            ? [{ vehicle: v, position: [t.latitude, t.longitude] as [number, number] }]
            : [];
    });
    const unreported = vehicles.filter(v => !positioned.some(p => p.vehicle.id === v.id));

    return (
        <div className="map-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ padding: '8px 12px' }}>
                <h3 className="panel-title">ROUTE MAP — PORTLAND → BEND</h3>
                <span className="panel-badge" style={{ color: 'var(--accent-cyan)' }}>
                    {dataStatus === 'live' ? 'REPORTED POSITIONS' : dataStatus === 'cached' ? 'SAVED POSITIONS' : 'DEMO POSITIONS'}
                </span>
            </div>

            <MapContainer
                bounds={ROUTE_GEOMETRY}
                boundsOptions={{ padding: [16, 16] }}
                style={{ flex: 1, minHeight: 240, background: 'var(--bg-panel)' }}
                attributionControl
                ref={labelMap}
            >
                <PanToSelection
                    id={selectedVehicleId}
                    position={positioned.find(p => p.vehicle.id === selectedVehicleId)?.position ?? null}
                />
                <PanToSelection
                    id={selectedStationId ?? null}
                    position={selectedStation ? [selectedStation.lat, selectedStation.lon] : null}
                />

                <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors; route: OSRM, elevation: SRTM'
                    className="map-tiles-dark"
                    maxZoom={19}
                />

                <Polyline positions={ROUTE_GEOMETRY} pathOptions={{ color: '#00c2ff', weight: 3, opacity: 0.75 }} />
                {/* Invisible wide hit target so the thin route is easy to click */}
                <Polyline positions={ROUTE_GEOMETRY} pathOptions={{ weight: 16, opacity: 0 }} eventHandlers={routeClick} />

                {ROUTE_WAYPOINTS.map(wp => (
                    <CircleMarker
                        key={wp.name}
                        center={[wp.lat, wp.lon]}
                        eventHandlers={routeClick}
                        radius={LABELLED_WAYPOINTS.has(wp.name) ? 5 : 3}
                        pathOptions={{ color: '#7a8ba6', fillColor: '#0b1320', fillOpacity: 1, weight: 1.5 }}
                    >
                        <Tooltip direction="top" permanent={LABELLED_WAYPOINTS.has(wp.name)}>
                            {wp.name} · {wp.distanceKm} km · {wp.elevationM} m
                        </Tooltip>
                    </CircleMarker>
                ))}

                {CHARGING_STATIONS.map(st => (
                    <CircleMarker
                        key={st.id}
                        center={[st.lat, st.lon]}
                        radius={st.id === selectedStationId ? 9 : 7}
                        pathOptions={{
                            color: st.id === selectedStationId ? '#00c2ff' : '#10b981',
                            fillColor: '#065f46',
                            fillOpacity: 1,
                            weight: 2,
                        }}
                        eventHandlers={{ click: () => onSelectStation?.(st.id) }}
                    >
                        <Popup>
                            <strong>{st.name}</strong> (sample)<br />
                            {st.type} · {st.fee}<br />
                            {st.available}/{st.total} available (sample) · {st.distanceKm} km from Portland
                        </Popup>
                    </CircleMarker>
                ))}

                <CircleMarker
                    center={pointAlongRoute(progressFraction)}
                    radius={6}
                    pathOptions={{ color: '#00c2ff', fillColor: '#ffffff', fillOpacity: 1, weight: 3 }}
                >
                    <Tooltip direction="bottom">
                        Route preview · {(progressFraction * ROUTE_DISTANCE_KM).toFixed(1)} km (illustration)
                    </Tooltip>
                </CircleMarker>

                {positioned.map(({ vehicle, position }) => {
                    const isSelected = vehicle.id === selectedVehicleId;
                    return (
                        <CircleMarker
                            key={vehicle.id}
                            center={position}
                            radius={isSelected ? 9 : 6}
                            pathOptions={{
                                color: isSelected ? '#00c2ff' : '#0b1320',
                                fillColor: socColor(vehicle.current_soc),
                                fillOpacity: 1,
                                weight: isSelected ? 3 : 1.5,
                            }}
                            eventHandlers={{ click: () => onSelectVehicle?.(vehicle.id) }}
                        >
                            <Tooltip direction="top" permanent={isSelected}>
                                {vehicle.id} · {Math.round(vehicle.current_soc)}% SOC
                            </Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {unreported.length > 0 && (
                <div className="charging-station-type" style={{ padding: '6px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span>No position reported:</span>
                    {unreported.map(v => (
                        <button
                            key={v.id}
                            type="button"
                            className={`ctrl-btn ${v.id === selectedVehicleId ? 'ctrl-btn--active' : ''}`}
                            aria-pressed={v.id === selectedVehicleId}
                            onClick={() => onSelectVehicle?.(v.id)}
                        >
                            {v.id}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
