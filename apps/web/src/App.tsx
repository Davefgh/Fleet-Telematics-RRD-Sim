import './App.css'

function App() {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>EV FLEET TELEMATICS — ROUTE DEGRADATION SIMULATOR</h1>
      </header>
      <div className="control-bar">
        Controls here
      </div>
      <div className="main-content">
        <aside className="fleet-panel">Fleet List</aside>
        <div className="map-panel">Map Route</div>
        <div className="elevation-panel">Elevation Chart</div>
        <div className="thermal-panel">Battery Temperature</div>
      </div>
      <div className="bottom-row">
        <div className="health-panel">Battery Health</div>
        <div className="regen-panel">Battery Health</div>
        <div className="charging-panel">Charging Stations</div>
      </div>
    </div>
  )
}

export default App
