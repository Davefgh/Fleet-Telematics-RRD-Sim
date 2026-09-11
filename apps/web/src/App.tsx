import './App.css'
import { useState } from 'react';
import { useFleetData } from './hooks/useFleetData';
import { Header } from './components/Header';
import { FleetPanel } from './components/FleetPanel';

function App() {
  const { vehicles, telemetry, loading, error } = useFleetData(5000);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  if (loading) return <div className="loading-screen">Loading fleet data...</div>;
  if (error) return <div className="error-screen">Error: {error}</div>;

  // Compute derived values for the header
  const avgSoh = vehicles.reduce((sum, v) => sum + v.current_soh, 0) / vehicles.length;

  return (
    <div className="dashboard">
      <Header
        fleetCount={vehicles.length}
        routeDistance={129.4}
        avgBattery={67.48}
        batteryHealth={Math.round(avgSoh * 10) / 10}
      />

      <div className="controls-bar">
      </div>

      <div className="main-content">
        <FleetPanel
          vehicles={vehicles}
          selectedId={selectedVehicleId}
          onSelect={setSelectedVehicleId}
        />
        <div className="map-panel">Route Map</div>
        <div className="elevation-panel">Elevation Chart</div>
        <div className="thermal-panel">Battery Thermal</div>
      </div>

      <div className="bottom-row">
        <div className="health-panel">Battery Health</div>
        <div className="regen-panel">Regen Braking</div>
        <div className="charging-panel">Charging Stations</div>
      </div>
    </div>
  );
}

export default App
