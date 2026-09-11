interface ThermalMapProps {
    cellTemps: number[][];
    maxTemp: number;
    avgTemp: number;
}

export function ThermalMap({ cellTemps, maxTemp, avgTemp }: ThermalMapProps) {
    const hotspot = findHotspot(cellTemps);

    return (
        <div className="thermal-panel">
            <div className="panel-header">
                <h3 className="panel-title">BATTERY THERMAL MAP — PACK TEMP</h3>
                <span className="panel-badge" style={{ color: 'var(--accent-yellow)' }}>
                    STATUS: WARMING
                </span>
            </div>

            {/* The grid of temperature cells */}
            <div
                className="thermal-grid"
                style={{
                    gridTemplateColumns: `repeat(${cellTemps[0]?.length || 4}, 1fr)`,
                }}
            >
                {cellTemps.flatMap((row, rowIdx) =>
                    row.map((temp, colIdx) => (
                        <div
                            key={`${rowIdx}-${colIdx}`}
                            className="thermal-cell"
                            style={{ backgroundColor: tempToColor(temp) }}
                            title={`Cell [${rowIdx},${colIdx}]: ${temp.toFixed(1)}°C`}
                        >
                            <span className="thermal-cell-value">{temp.toFixed(1)}°</span>
                        </div>
                    ))
                )}
            </div>

            {/* Summary stats below the grid */}
            <div className="thermal-stats">
                <div>
                    <span className="stat-label">MAX TEMP</span>
                    <span className="stat-value thermal-hot">{maxTemp.toFixed(1)}°C</span>
                </div>
                <div>
                    <span className="stat-label">HOTSPOT</span>
                    <span className="stat-value">C8[1,1]</span>
                </div>
                <div>
                    <span className="stat-label">AVG</span>
                    <span className="stat-value">{avgTemp.toFixed(1)}°C</span>
                </div>
            </div>
        </div>
    );
}

function tempToColor(temp: number): string {
    const min = 20;
    const max = 60;
    const ratio = Math.max(0, Math.min(1, (temp - min) / (max - min)));


    const hue = 200 * (1 - ratio);
    const saturation = 70 + ratio * 20;
    const lightness = 45 + ratio * 10;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function findHotspot(grid: number[][]): { row: number; col: number; temp: number } {
    let max = { row: 0, col: 0, temp: -Infinity };
    grid.forEach((row, r) =>
        row.forEach((temp, c) => {
            if (temp > max.temp) max = { row: r, col: c, temp };
        })
    );
    return max;
}
