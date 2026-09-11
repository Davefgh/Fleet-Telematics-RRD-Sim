// src/components/FleetPanel.tsx
import type { Vehicle } from '@fleet/api-client';

interface FleetPanelProps {
    vehicles: Vehicle[];
    selectedId: string | null;
    onSelect: (id: string) => void;  // Callback: parent decides what happens on click
}

export function FleetPanel({ vehicles, selectedId, onSelect }: FleetPanelProps) {
    return (
        <aside className="fleet-panel">
            <div className="panel-header">
                <h2 className="panel-title">FLEET STATUS</h2>
                <span className="panel-badge">{vehicles.length} ACTIVE</span>
            </div>

            <div className="fleet-list">
                {vehicles.map((vehicle) => (
                    <VehicleCard
                        key={vehicle.id}       // React needs a unique "key" for list items
                        vehicle={vehicle}       // to efficiently update the DOM when data changes.
                        isSelected={vehicle.id === selectedId}
                        onClick={() => onSelect(vehicle.id)}
                    />
                ))}
            </div>
        </aside>
    );
}

function VehicleCard({
    vehicle,
    isSelected,
    onClick,
}: {
    vehicle: Vehicle;
    isSelected: boolean;
    onClick: () => void;
}) {
    // Derive status color from vehicle status
    const statusColor = getStatusColor(vehicle.status);

    return (
        <div
            className={`vehicle-card ${isSelected ? 'vehicle-card--selected' : ''}`}
            onClick={onClick}
            // role="button" and tabIndex make this accessible via keyboard
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
        >
            <div className="vehicle-card-top">
                <span className="vehicle-id">{vehicle.id}</span>
                <span
                    className="vehicle-status-badge"
                    style={{ backgroundColor: statusColor }}  // Dynamic style based on data
                >
                    {vehicle.status}
                </span>
            </div>

            <span className="vehicle-model">{vehicle.model}</span>


            <div className="soc-bar-container">
                <div
                    className="soc-bar-fill"
                    style={{
                        width: `${vehicle.current_soc}%`,              // Dynamic width
                        backgroundColor: getSocColor(vehicle.current_soc),  // Color changes with level
                    }}
                />
            </div>

            <div className="vehicle-card-stats">
                <span>{vehicle.current_soc.toFixed(0)}%</span>
                <span>{vehicle.battery_capacity_kwh} kWh</span>
            </div>
        </div>
    );
}

function getStatusColor(status: string): string {
    switch (status) {
        case 'AVAILABLE': return 'var(--accent-green)';
        case 'CHARGING': return 'var(--accent-cyan)';
        case 'IN_USE': return 'var(--accent-yellow)';
        case 'MAINTENANCE': return 'var(--accent-red)';
        default: return 'var(--text-muted)';
    }
}

function getSocColor(soc: number): string {
    if (soc > 60) return 'var(--accent-green)';
    if (soc > 30) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
}
