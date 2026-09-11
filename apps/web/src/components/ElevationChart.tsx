import { useRef, useEffect } from 'react';


interface ElevationChartProps {
    // The data: arrays of [distance, elevation] and [distance, soc]
    elevationData: Array<{ distance: number; elevation: number }>;
    socData: Array<{ distance: number; soc: number }>;
    totalDistance: number;
}

export function ElevationChart({ elevationData, socData, totalDistance }: ElevationChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;


        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);


        const W = rect.width;
        const H = rect.height;

        const margin = { top: 30, right: 20, bottom: 30, left: 50 };
        const chartW = W - margin.left - margin.right;
        const chartH = H - margin.top - margin.bottom;
        ctx.clearRect(0, 0, W, H);

        const maxElev = Math.max(...elevationData.map(d => d.elevation), 1);

        const xScale = (distance: number) =>
            (distance / totalDistance) * chartW + margin.left;

        const yScaleElev = (elev: number) =>
            margin.top + chartH - (elev / maxElev) * chartH;

        const yScaleSoc = (soc: number) =>
            margin.top + chartH - (soc / 100) * chartH;


        ctx.beginPath();
        ctx.moveTo(xScale(elevationData[0].distance), yScaleElev(elevationData[0].elevation));

        for (const point of elevationData) {
            ctx.lineTo(xScale(point.distance), yScaleElev(point.elevation));
        }

        ctx.lineTo(xScale(elevationData[elevationData.length - 1].distance), margin.top + chartH);
        ctx.lineTo(margin.left, margin.top + chartH);
        ctx.closePath();

        const elevGradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + chartH);
        elevGradient.addColorStop(0, 'rgba(100, 116, 139, 0.4)');  // Slate at top
        elevGradient.addColorStop(1, 'rgba(100, 116, 139, 0.05)'); // Transparent at bottom
        ctx.fillStyle = elevGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = '#00c2ff';      // Cyan accent
        ctx.lineWidth = 2;
        ctx.setLineDash([]);              // Solid line

        for (let i = 0; i < socData.length; i++) {
            const x = xScale(socData[i].distance);
            const y = yScaleSoc(socData[i].soc);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#7a8ba6';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';

        for (let d = 0; d <= totalDistance; d += 30) {
            ctx.fillText(`${d} km`, xScale(d), margin.top + chartH + 18);
        }

        ctx.textAlign = 'right';
        for (let e = 0; e <= maxElev; e += 200) {
            ctx.fillText(`${e}m`, margin.left - 8, yScaleElev(e) + 4);
        }

    }, [elevationData, socData, totalDistance]);

    return (
        <div className="elevation-panel">
            <h3 className="panel-title">ELEVATION PROFILE & BATTERY STATE OF CHARGE</h3>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: 'calc(100% - 30px)' }}
            />
        </div>
    );
}
