interface HeaderProps {
    fleetCount: number;
    routeDistance: number;
    avgBattery: number;
    batteryHealth: number;
}

export function Header({ fleetCount, routeDistance, avgBattery, batteryHealth

}: HeaderProps) {
    return (
        <header className="dashboard-header">
            <div className="header-left">
                <h1 className="header-title">
                    EV FLEET TELEMATICS - ROUTE DEGRATION SIMULATOR
                </h1>
                <span className="header-subtitle">
                    ROUTE GT-6 PORTLAND - BEND | SIM ID: EVSIM | STATUS:
                    <span className="status-dot- status-running" /> RUNNING
                </span>
            </div>

            <div className="header-right">
                <span></span>
                <span className="header-stat">{fleetCount}</span>
            </div>
            <div className="header-stats">
                <StatCard label="FLEET VEHICLES" value={`${fleetCount} ACTIVE`} />
                <StatCard label="ROUTE DISTANCE" value={`${routeDistance} KM`} />
                <StatCard label="AVG BATTERY AGE" value={`${avgBattery}`} />
                <StatCard label="BATTERY HEALTH" value={`${batteryHealth}%`} />
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