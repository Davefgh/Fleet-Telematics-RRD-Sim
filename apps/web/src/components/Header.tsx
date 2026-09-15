interface HeaderProps {
    fleetCount: number;
    routeDistance: number;
    avgBattery: number;
    batteryHealth: number;
}

export function Header({ fleetCount, routeDistance, avgBattery, batteryHealth }: HeaderProps) {
    return (
        <header className="dashboard-header">
            <div className="header-left">
                <h1 className="header-title">
                    EV FLEET TELEMATICS — ROUTE DEGRADATION SIMULATOR
                </h1>
                <span className="header-subtitle">
                    ROUTE GT-6 PORTLAND → BEND&nbsp;|&nbsp;SIM ID: EVSIM-2024&nbsp;|&nbsp;STATUS:&nbsp;
                    <span className="status-dot status-running" />&nbsp;RUNNING
                </span>
            </div>

            <div className="header-stats">
                <StatCard label="FLEET VEHICLES" value={`${fleetCount} ACTIVE`} />
                <StatCard label="ROUTE DISTANCE" value={`${routeDistance} KM`} />
                <StatCard label="AVG BATTERY AGE" value={`${avgBattery} mo`} />
                <StatCard label="FLEET SOH" value={`${batteryHealth}%`} />
            </div>
        </header>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="stat-card">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
        </div>
    );
}