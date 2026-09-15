# 🎓 Building the Fleet Telematics Dashboard — Step-by-Step Tutorial

This guide will walk you through building your EV Fleet Telematics dashboard **from scratch**, explaining **every concept and every "why"** along the way. You'll be writing every line of code yourself.

---

## 📋 Table of Contents

1. [Understanding the Architecture](#1-understanding-the-architecture)
2. [Phase 1: Foundation — Layout Shell & Design System](#2-phase-1-foundation)
3. [Phase 2: Top Bar — Header & Controls](#3-phase-2-top-bar)
4. [Phase 3: Fleet Status Panel (Left Sidebar)](#4-phase-3-fleet-status-panel)
5. [Phase 4: Connecting to Your Backend API](#5-phase-4-connecting-to-your-backend-api)
6. [Phase 5: Data Visualization (Charts)](#6-phase-5-data-visualization)
7. [Phase 6: Battery Thermal Map (Heatmap Grid)](#7-phase-6-battery-thermal-map)
8. [Phase 7: Summary Stats Cards](#8-phase-7-summary-stats-cards)
9. [Phase 8: Polish — Animations & Responsive Design](#9-phase-8-polish)
10. [Bonus: Real-Time Updates with Polling](#10-bonus-real-time-updates)

---

## 1. Understanding the Architecture

Before writing a single line of code, let's understand **what we're building** and **how the pieces fit together**.

### What You Already Have

Your project is a **monorepo** (multiple packages in one repository):

```
Fleet-Telematics-RRD-Sim/
├── apps/web/              ← React + Vite frontend (THIS is where we'll work)
├── backend/               ← Python FastAPI backend (already has mock data)
├── packages/api-client/   ← TypeScript API client (already wraps fetch calls)
```

| Layer | Tech | Role |
|-------|------|------|
| **Backend** | FastAPI (Python) | Serves vehicle data, telemetry, simulations |
| **API Client** | TypeScript | Wraps `fetch()` calls into typed methods |
| **Frontend** | React + Vite + Tailwind | Renders the dashboard UI |

### The Dashboard Layout (from the screenshot)

Looking at the screenshot, the dashboard has this grid structure:

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER BAR (title, route info, status, fleet stats)            │
├──────────────────────────────────────────────────────────────────┤
│  CONTROLS BAR (pause/speed buttons, sliders, dropdowns)         │
├───────┬──────────────┬──────────────────┬───────────────────────┤
│ Fleet │ Route Map    │ Elevation Chart  │ Battery Thermal Map   │
│ List  │ (map/canvas) │ (line chart)     │ (heatmap grid)        │
│       │              │                  │                       │
│ EV-001│              │                  │                       │
│ EV-002│              │                  │                       │
│ EV-003│              │                  │                       │
│ ...   │              │                  │                       │
├───────┴──────────────┴──────────────────┴───────────────────────┤
│ BOTTOM ROW: Battery Health Trend | Regen Braking | Charging     │
└─────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Key insight**: This is a **CSS Grid** layout, not flexbox. CSS Grid lets you define a 2D grid of rows and columns, which is exactly what this dashboard is — a grid of panels. Flexbox is 1D (either row OR column). Grid is 2D (rows AND columns simultaneously).

---

## 2. Phase 1: Foundation — Layout Shell & Design System

### Step 1: Clean Out the Boilerplate

First, clear the default Vite template from [App.tsx](file:///c:/Users/Jan/Fleet-Telematics-RRD-Sim/apps/web/src/App.tsx) and [App.css](file:///c:/Users/Jan/Fleet-Telematics-RRD-Sim/apps/web/src/App.css). Replace them with empty shells:

**In `App.tsx`**, replace everything with:

```tsx
import './App.css'

function App() {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>EV FLEET TELEMATICS — ROUTE DEGRADATION SIMULATOR</h1>
      </header>
    </div>
  )
}

export default App
```

**Why?** We start with the simplest possible structure. The `dashboard` div will be our CSS Grid container. Every panel will be a direct child of this container.

### Step 2: Create Your Design System (CSS Custom Properties)

**In [index.css](file:///c:/Users/Jan/Fleet-Telematics-RRD-Sim/apps/web/src/index.css)**, replace the existing `:root` variables with a **dark theme design system**:

```css
@import "tailwindcss";

/* ──────────────────────────────────────────────
   DESIGN SYSTEM — Custom Properties (Variables)
   ────────────────────────────────────────────── */
:root {
  /* ---- Colors ---- */
  --bg-primary:    #0a0e17;      /* Deepest background */
  --bg-secondary:  #0d1321;      /* Panel backgrounds */
  --bg-panel:      #111827;      /* Card/panel surfaces */
  --bg-input:      #1a2332;      /* Input field backgrounds */

  --border-color:  #1e2d3d;      /* Subtle panel borders */
  --border-glow:   rgba(0, 194, 255, 0.15); /* Accent glow on borders */

  --text-primary:  #e2e8f0;      /* Main text */
  --text-secondary:#7a8ba6;      /* Dimmed labels */
  --text-muted:    #4a5568;      /* Very subtle text */

  --accent-cyan:   #00c2ff;      /* Primary accent (buttons, highlights) */
  --accent-green:  #10b981;      /* Positive/good status */
  --accent-red:    #ef4444;      /* Negative/danger status */
  --accent-yellow: #f59e0b;      /* Warning/caution status */
  --accent-orange: #f97316;      /* Secondary warning */

  /* ---- Typography ---- */
  --font-sans:  'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

  /* ---- Spacing scale (consistent rhythm) ---- */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  12px;
  --space-lg:  16px;
  --space-xl:  24px;

  /* ---- Border radius ---- */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* ---- Shadows ---- */
  --shadow-panel: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
}
```

> [!TIP]
> **Why CSS Custom Properties (variables)?**
> - **Single source of truth**: Change `--accent-cyan` once and it updates everywhere.
> - **Consistency**: Every panel, card, and text element uses the same palette.
> - **Theming**: You could add a light theme later by overriding these in a `.light-theme` class.
> - **Maintainability**: Instead of hunting for `#0a0e17` across 500 lines of CSS, you just change the variable.

### Step 3: Set Global Styles

Still in `index.css`, add the global resets below the `:root` block:

```css
/* ──────────────────────────────────────────────
   GLOBAL RESETS
   ────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;   /* Makes width/height include padding + border */
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;            /* Dashboard text is small and dense */
  line-height: 1.4;
  overflow: hidden;           /* Dashboard is full-viewport, no scrolling */
  height: 100vh;
}

#root {
  height: 100vh;
  width: 100%;
}
```

> [!NOTE]
> **Why `box-sizing: border-box`?** By default, CSS calculates width as `content only`, meaning padding and borders ADD to the total width. With `border-box`, a `width: 200px` element stays 200px total even with padding. This prevents layout bugs where panels overflow their grid cells.
>
> **Why `overflow: hidden` on body?** Dashboards are designed to fit the viewport. Scrolling a dashboard feels broken — you want everything visible at a glance.

### Step 4: Define the Grid Layout

In `App.css`, define the main dashboard grid:

```css
/* ──────────────────────────────────────────────
   DASHBOARD GRID LAYOUT
   ────────────────────────────────────────────── */
.dashboard {
  display: grid;
  height: 100vh;
  grid-template-rows: auto auto 1fr auto;  /* header, controls, main, bottom */
  grid-template-columns: 1fr;              /* single column for the rows */
  gap: 1px;                                /* hairline gaps between panels */
  background: var(--border-color);         /* the gap color becomes the "border" */
}
```

> [!IMPORTANT]
> **The `gap` + `background` trick**: Instead of adding `border` to every panel individually, we set the grid's `gap` to 1px and give the grid a dark border-like background color. Each panel gets its own `background: var(--bg-panel)`. The 1px gap between panels lets the grid's background "show through", creating the appearance of uniform borders. This is much cleaner than managing individual borders on each cell.

**Why `grid-template-rows: auto auto 1fr auto`?**
- `auto` = shrink to content (for the header and controls bar, whose height is determined by their content)
- `1fr` = take all remaining space (for the main content area, it expands to fill whatever's left)
- `auto` = shrink to content (for the bottom row)

This ensures the main content area always fills the remaining screen height after the header/controls.

### Step 5: Add the Main Content Grid

Now update `App.tsx` to include the full grid structure:

```tsx
import './App.css'

function App() {
  return (
    <div className="dashboard">
      {/* Row 1: Header */}
      <header className="dashboard-header">
        EV FLEET TELEMATICS — ROUTE DEGRADATION SIMULATOR
      </header>

      {/* Row 2: Controls Bar */}
      <div className="controls-bar">
        Controls go here
      </div>

      {/* Row 3: Main Content (nested grid) */}
      <div className="main-content">
        <aside className="fleet-panel">Fleet List</aside>
        <div className="map-panel">Route Map</div>
        <div className="elevation-panel">Elevation Chart</div>
        <div className="thermal-panel">Battery Thermal</div>
      </div>

      {/* Row 4: Bottom Row */}
      <div className="bottom-row">
        <div className="health-panel">Battery Health</div>
        <div className="regen-panel">Regen Braking</div>
        <div className="charging-panel">Charging Stations</div>
      </div>
    </div>
  )
}

export default App
```

And in `App.css`, add the nested grid for `.main-content`:

```css
.main-content {
  display: grid;
  grid-template-columns: 200px 1fr 1fr 1fr;  /* sidebar + 3 equal panels */
  gap: 1px;
  background: var(--border-color);
  min-height: 0;  /* CRITICAL for grid children to not overflow */
}

.bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;   /* 3 equal panels */
  gap: 1px;
  background: var(--border-color);
}

/* Give every panel a background so the grid gaps show as borders */
.fleet-panel,
.map-panel,
.elevation-panel,
.thermal-panel,
.health-panel,
.regen-panel,
.charging-panel {
  background: var(--bg-panel);
  padding: var(--space-md);
  overflow: hidden;
}

.dashboard-header,
.controls-bar {
  background: var(--bg-secondary);
  padding: var(--space-sm) var(--space-lg);
}
```

> [!NOTE]
> **Why `min-height: 0` on `.main-content`?** This is a common CSS Grid gotcha. By default, grid items have `min-height: auto`, which means they'll grow to fit their content even if it overflows. Setting `min-height: 0` tells the grid item "it's okay to be smaller than your content" — enabling scrolling or clipping inside panels.

### 🏁 Checkpoint!

At this point, run `pnpm dev` in `apps/web/`. You should see:
- A dark background filling the screen
- Placeholder text in grid cells showing the layout structure
- Clean 1px borders between all panels

---

## 3. Phase 2: Top Bar — Header & Controls

### Step 6: Build the Header Component

Create a new file `src/components/Header.tsx`:

```tsx
// src/components/Header.tsx

// WHY a separate component?
// React's power is COMPOSITION — building complex UIs from small, focused pieces.
// Each component has ONE job. Header's job: show route info and fleet summary stats.

interface HeaderProps {
  fleetCount: number;
  routeDistance: number;
  avgBatteryAge: number;
  batteryHealth: number;
}

export function Header({ fleetCount, routeDistance, avgBatteryAge, batteryHealth }: HeaderProps) {
  return (
    <header className="dashboard-header">
      {/* Left side: Title + route info */}
      <div className="header-left">
        <h1 className="header-title">
          EV FLEET TELEMATICS — ROUTE DEGRADATION SIMULATOR
        </h1>
        <span className="header-subtitle">
          ROUTE GT-6 PORTLAND → BEND | SIM ID: EVSIM-2024 | STATUS: 
          <span className="status-dot status-running" /> RUNNING
        </span>
      </div>

      {/* Right side: KPI summary cards */}
      <div className="header-stats">
        <StatCard label="FLEET VEHICLES" value={`${fleetCount} ACTIVE`} />
        <StatCard label="ROUTE DISTANCE" value={`${routeDistance} KM`} />
        <StatCard label="AVG BATTERY AGE" value={`${avgBatteryAge}`} />
        <StatCard label="BATTERY HEALTH" value={`${batteryHealth}%`} />
      </div>
    </header>
  );
}

// A tiny sub-component — keeps the header clean.
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
```

> [!TIP]
> **Why extract `StatCard` as a separate function?**
> It's a pattern called **"extract component"**. When you see repeated HTML structure (4 stat cards with the same label/value pattern), you extract it into a function. Benefits:
> - **DRY** (Don't Repeat Yourself): Write the HTML once, reuse it 4 times.
> - **Easy to update**: Change the stat card layout in one place, all 4 update.
> - **Readability**: `<StatCard label="..." value="..." />` is much easier to scan than raw HTML divs.

### Step 7: Style the Header

Add to `App.css`:

```css
/* ──────────────────────────────────────────────
   HEADER
   ────────────────────────────────────────────── */
.dashboard-header {
  display: flex;
  justify-content: space-between;  /* Push title left, stats right */
  align-items: center;
  padding: var(--space-md) var(--space-xl);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1.5px;   /* Wide letter spacing = techy/industrial look */
  color: var(--text-primary);
  text-transform: uppercase;
}

.header-subtitle {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* The green pulsing dot next to "RUNNING" */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-green);
  animation: pulse 2s ease-in-out infinite;  /* Gives a "alive" feeling */
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}

/* Stats row on the right side of the header */
.header-stats {
  display: flex;
  gap: var(--space-lg);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: flex-end;          /* Right-align text within each card */
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
}

.stat-label {
  font-size: 9px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);  /* Monospace for numbers = data-heavy feel */
}
```

> [!NOTE]
> **Why `letter-spacing: 1.5px` and `text-transform: uppercase` on titles?**
> This is a design pattern from industrial/SCADA dashboards. Wide-spaced uppercase text feels authoritative and technical — exactly the vibe of a fleet monitoring system. The screenshot uses this extensively.
>
> **Why `font-family: var(--font-mono)` for numbers?**
> Monospace fonts give each digit the same width. This means when numbers update (say SOC goes from `85%` to `84%`), the text doesn't shift horizontally. In proportional fonts, "1" is narrower than "8", causing layout jitter on updates.

---

## 4. Phase 3: Fleet Status Panel (Left Sidebar)

### Step 8: Create the Fleet Panel Component

Create `src/components/FleetPanel.tsx`:

```tsx
// src/components/FleetPanel.tsx
import type { Vehicle } from '@fleet/api-client';

// WHY accept props instead of fetching data inside the component?
// This is called "lifting state up" — the parent component (App) owns the data
// and passes it down. This makes FleetPanel a "PRESENTATIONAL" component:
// it only cares about DISPLAYING data, not FETCHING it.
// Benefits: easier to test, easier to reuse, clearer data flow.

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

      {/* SOC bar — a visual representation of battery level */}
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

// ──────────────────────────────────────────────
// HELPER FUNCTIONS — Pure functions that compute derived values
// ──────────────────────────────────────────────

// WHY separate helper functions instead of inline conditionals?
// 1. Readability: the JSX stays clean, logic lives separately.
// 2. Testability: you can unit test these functions independently.
// 3. Reusability: use the same color logic in multiple components.

function getStatusColor(status: string): string {
  switch (status) {
    case 'AVAILABLE': return 'var(--accent-green)';
    case 'CHARGING':  return 'var(--accent-cyan)';
    case 'IN_USE':    return 'var(--accent-yellow)';
    case 'MAINTENANCE': return 'var(--accent-red)';
    default:          return 'var(--text-muted)';
  }
}

function getSocColor(soc: number): string {
  if (soc > 60) return 'var(--accent-green)';
  if (soc > 30) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}
```

### Step 9: Style the Fleet Panel

Add to `App.css`:

```css
/* ──────────────────────────────────────────────
   FLEET PANEL (Left Sidebar)
   ────────────────────────────────────────────── */
.fleet-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;    /* Scrollable if many vehicles */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.panel-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: rgba(0, 194, 255, 0.1);
  color: var(--accent-cyan);
  font-family: var(--font-mono);
}

.fleet-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* Individual vehicle card */
.vehicle-card {
  padding: var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;  /* Smooth hover effect */
}

.vehicle-card:hover {
  border-color: var(--accent-cyan);
  background: rgba(0, 194, 255, 0.05);
}

/* WHY use a BEM-style modifier (--selected)?
   BEM = Block__Element--Modifier. It's a naming convention that makes
   CSS predictable. You always know: "vehicle-card--selected" is a
   variation of "vehicle-card". No ambiguity. */
.vehicle-card--selected {
  border-color: var(--accent-cyan);
  background: rgba(0, 194, 255, 0.08);
  box-shadow: 0 0 12px rgba(0, 194, 255, 0.1);  /* Subtle glow = selected */
}

.vehicle-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
}

.vehicle-id {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: 13px;
}

.vehicle-status-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: var(--bg-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.vehicle-model {
  font-size: 11px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: var(--space-sm);
}

/* SOC (State of Charge) progress bar */
.soc-bar-container {
  height: 4px;
  background: var(--bg-input);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.soc-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease-out;  /* Animate SOC changes */
}

.vehicle-card-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}
```

> [!TIP]
> **Why `transition: width 0.5s ease-out` on the SOC bar?**
> When the SOC value changes (e.g., the simulation updates), the bar width animates smoothly instead of jumping. This is a **micro-animation** — a small, purposeful animation that gives feedback to the user that something changed. It makes the dashboard feel alive and responsive.
>
> **Why `ease-out` timing?** `ease-out` starts fast and slows down at the end. This feels natural — like a physical object decelerating. Other options: `linear` (constant speed, feels robotic), `ease-in` (starts slow, feels sluggish), `ease-in-out` (good for loops).

---

## 5. Phase 4: Connecting to Your Backend API

### Step 10: Create a Custom React Hook for Data Fetching

Create `src/hooks/useFleetData.ts`:

```tsx
// src/hooks/useFleetData.ts
import { useState, useEffect, useCallback } from 'react';
import { createFleetClient } from '@fleet/api-client';
import type { Vehicle, TelemetryEvent, SimulationResponse } from '@fleet/api-client';

// ──────────────────────────────────────────────
// WHY A CUSTOM HOOK?
// ──────────────────────────────────────────────
// React hooks let you extract STATEFUL LOGIC into reusable functions.
// Without this hook, your App component would be cluttered with:
//   - useState for vehicles, telemetry, loading, error
//   - useEffect for fetching
//   - Polling intervals
//   - Error handling
//
// A custom hook bundles all of that into one clean function:
//   const { vehicles, telemetry, loading, error } = useFleetData();
//
// This is the "separation of concerns" principle: your component
// handles RENDERING, the hook handles DATA.
// ──────────────────────────────────────────────

// Create the API client once, outside the component
// WHY? If we created it inside the hook, it would be recreated on every render.
const api = createFleetClient({ baseUrl: 'http://localhost:8000' });

export function useFleetData(pollingIntervalMs: number = 5000) {
  // ---- State declarations ----
  const [vehicles, setVehicles]       = useState<Vehicle[]>([]);
  const [telemetry, setTelemetry]     = useState<Record<string, TelemetryEvent>>({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ---- Fetch function ----
  // useCallback memoizes this function so it doesn't get recreated every render.
  // Without useCallback, the useEffect below would re-run every render because
  // its dependency (fetchData) would be a "new" function each time.
  const fetchData = useCallback(async () => {
    try {
      // Fetch all vehicles
      const vehicleList = await api.getVehicles();
      setVehicles(vehicleList);

      // Fetch telemetry for each vehicle IN PARALLEL using Promise.all
      // WHY Promise.all? If you have 6 vehicles, sequential fetching takes
      // 6 × network_latency. Parallel fetching takes 1 × network_latency.
      const telemetryResults = await Promise.all(
        vehicleList.map(async (v) => {
          const res = await api.getLatestTelemetry(v.id);
          return { vehicleId: v.id, event: res.data };
        })
      );

      // Convert array to a Record (object) keyed by vehicle ID for O(1) lookups
      // WHY a Record instead of an array?
      // With an array, finding telemetry for "EV-002" requires: 
      //   telemetry.find(t => t.vehicleId === "EV-002")  // O(n) linear scan
      // With a Record:
      //   telemetry["EV-002"]  // O(1) instant lookup
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
    fetchData();  // Fetch immediately on mount

    // Set up polling interval for live updates
    // WHY polling instead of WebSockets?
    // Polling is simpler to implement and debug. For a dashboard that updates
    // every 5 seconds, the overhead is negligible. WebSockets are better when
    // you need sub-second updates or server-initiated push.
    const interval = setInterval(fetchData, pollingIntervalMs);

    // CLEANUP: Clear the interval when the component unmounts
    // Without this, the interval keeps running even after you navigate away,
    // causing memory leaks and errors ("Can't update state on unmounted component").
    return () => clearInterval(interval);
  }, [fetchData, pollingIntervalMs]);

  return { vehicles, telemetry, loading, error, refetch: fetchData };
}
```

### Step 11: Wire the Hook into App.tsx

Update `App.tsx`:

```tsx
import './App.css'
import { useState } from 'react';
import { useFleetData } from './hooks/useFleetData';
import { Header } from './components/Header';
import { FleetPanel } from './components/FleetPanel';

function App() {
  // ---- Data layer ----
  const { vehicles, telemetry, loading, error } = useFleetData(5000);

  // ---- UI state ----
  // WHY is selectedVehicleId in App and not in FleetPanel?
  // Because MULTIPLE components need to know which vehicle is selected:
  // - FleetPanel highlights it
  // - Elevation chart shows its data
  // - Thermal map shows its battery
  // When state is needed by multiple siblings, it must live in their
  // common parent — this is called "lifting state up".
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  if (loading) return <div className="loading-screen">Loading fleet data...</div>;
  if (error)   return <div className="error-screen">Error: {error}</div>;

  // Compute derived values for the header
  const avgSoh = vehicles.reduce((sum, v) => sum + v.current_soh, 0) / vehicles.length;

  return (
    <div className="dashboard">
      <Header
        fleetCount={vehicles.length}
        routeDistance={129.4}
        avgBatteryAge={67.48}
        batteryHealth={Math.round(avgSoh * 10) / 10}
      />

      <div className="controls-bar">
        {/* We'll build this in a later step */}
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
```

---

## 6. Phase 5: Data Visualization (Charts)

The screenshot shows line charts (elevation profile, SOC over distance) and trend charts. We'll use **`<canvas>`** for this.

### Step 12: Choose a Charting Approach

You have three choices for charts:

| Approach | Pros | Cons |
|----------|------|------|
| **Chart.js** | Easy API, lots of chart types, good docs | Extra dependency (~200KB) |
| **Raw `<canvas>`** | No dependencies, total control, tiny | You write all rendering logic yourself |
| **SVG elements** | Crisp at any zoom, accessible | Complex math for positioning, slower with many data points |

> [!IMPORTANT]
> For learning, I'll show you **the raw `<canvas>` approach** for the elevation chart so you understand what's happening under the hood. For production, you'd likely add **Chart.js** (`pnpm add chart.js react-chartjs-2`) to save time.

### Step 13: Build the Elevation Chart Component

Create `src/components/ElevationChart.tsx`:

```tsx
// src/components/ElevationChart.tsx
import { useRef, useEffect } from 'react';

// ──────────────────────────────────────────────
// WHY CANVAS?
// ──────────────────────────────────────────────
// HTML Canvas is a pixel-based drawing surface. You get a "2D context"
// and draw shapes, lines, text directly using coordinates.
// 
// Think of it like a whiteboard:
//   1. Get the whiteboard (canvas element)
//   2. Get a marker (2D rendering context)
//   3. Draw: moveTo(x,y), lineTo(x,y), fillRect(x,y,w,h), etc.
// 
// Canvas is ideal for:
//   - Charts with many data points (hundreds/thousands)
//   - Real-time updates (redraw the whole thing each frame)
//   - Custom visualizations that don't fit standard chart libraries
// ──────────────────────────────────────────────

interface ElevationChartProps {
  // The data: arrays of [distance, elevation] and [distance, soc]
  elevationData: Array<{ distance: number; elevation: number }>;
  socData: Array<{ distance: number; soc: number }>;
  totalDistance: number;
}

export function ElevationChart({ elevationData, socData, totalDistance }: ElevationChartProps) {
  // useRef gives us a reference to the actual DOM element
  // WHY useRef instead of document.getElementById?
  // React manages the DOM — you shouldn't reach into it directly.
  // useRef is the React-approved way to get a reference to a DOM node.
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get the 2D rendering context — this is your "drawing toolkit"
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── STEP 1: Handle high-DPI (Retina) displays ──
    // WHY? On Retina screens, 1 CSS pixel = 2+ device pixels.
    // If we don't account for this, the canvas looks blurry.
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width * dpr;     // Set actual pixel dimensions
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);                  // Scale drawing commands to match

    // Use CSS dimensions for our coordinate system
    const W = rect.width;
    const H = rect.height;

    // ── STEP 2: Define the chart area (with margins for labels) ──
    const margin = { top: 30, right: 20, bottom: 30, left: 50 };
    const chartW = W - margin.left - margin.right;
    const chartH = H - margin.top - margin.bottom;

    // ── STEP 3: Clear the canvas (start fresh each render) ──
    ctx.clearRect(0, 0, W, H);

    // ── STEP 4: Calculate scaling functions ──
    // These convert DATA coordinates to PIXEL coordinates.
    // For example, if totalDistance = 129km and chartWidth = 400px,
    // then distance 64.5km should be at pixel 200.
    //
    // Formula: pixelX = (dataValue / dataMax) * pixelRange + offset

    const maxElev = Math.max(...elevationData.map(d => d.elevation), 1);

    const xScale = (distance: number) =>
      (distance / totalDistance) * chartW + margin.left;

    const yScaleElev = (elev: number) =>
      margin.top + chartH - (elev / maxElev) * chartH;  // Y is inverted in canvas!

    const yScaleSoc = (soc: number) =>
      margin.top + chartH - (soc / 100) * chartH;

    // ── STEP 5: Draw the elevation area (filled shape under the line) ──
    ctx.beginPath();
    ctx.moveTo(xScale(elevationData[0].distance), yScaleElev(elevationData[0].elevation));

    for (const point of elevationData) {
      ctx.lineTo(xScale(point.distance), yScaleElev(point.elevation));
    }

    // Close the shape by going to bottom-right, then bottom-left
    ctx.lineTo(xScale(elevationData[elevationData.length - 1].distance), margin.top + chartH);
    ctx.lineTo(margin.left, margin.top + chartH);
    ctx.closePath();

    // Fill with a gradient (semi-transparent for depth)
    const elevGradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + chartH);
    elevGradient.addColorStop(0, 'rgba(100, 116, 139, 0.4)');  // Slate at top
    elevGradient.addColorStop(1, 'rgba(100, 116, 139, 0.05)'); // Transparent at bottom
    ctx.fillStyle = elevGradient;
    ctx.fill();

    // ── STEP 6: Draw the SOC line on top ──
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

    // ── STEP 7: Draw axis labels ──
    ctx.fillStyle = '#7a8ba6';   // text-secondary color
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';

    // X axis labels
    for (let d = 0; d <= totalDistance; d += 30) {
      ctx.fillText(`${d} km`, xScale(d), margin.top + chartH + 18);
    }

    // Y axis labels (elevation)
    ctx.textAlign = 'right';
    for (let e = 0; e <= maxElev; e += 200) {
      ctx.fillText(`${e}m`, margin.left - 8, yScaleElev(e) + 4);
    }

  }, [elevationData, socData, totalDistance]);  
  // ↑ Re-run this effect whenever the data changes

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
```

> [!NOTE]
> **The most important concept here is the SCALING FUNCTION.**
>
> Your data lives in "data space" (distances in km, elevations in meters). Your screen lives in "pixel space" (x: 0-400, y: 0-300). The scaling function is the bridge:
>
> ```
> pixelX = (dataX / maxDataX) * chartWidthPixels + marginLeft
> ```
>
> This is **linear interpolation** — mapping one range onto another. Every charting library does this internally. Understanding this is the key to understanding ALL data visualization.

---

## 7. Phase 6: Battery Thermal Map (Heatmap Grid)

This is the colorful grid in the top-right of the screenshot. Each cell represents a battery cell/module temperature.

### Step 14: Build the Thermal Map Component

Create `src/components/ThermalMap.tsx`:

```tsx
// src/components/ThermalMap.tsx

// ──────────────────────────────────────────────
// WHY A GRID OF DIVS INSTEAD OF CANVAS?
// ──────────────────────────────────────────────
// The thermal map is a SMALL grid (e.g., 4×4 = 16 cells).
// Each cell needs:
//   - Its own hover tooltip
//   - Click interaction
//   - Color based on temperature
//
// For small grids with interactivity, HTML/CSS is simpler than Canvas.
// Canvas requires manual hit-testing (checking if mouse coordinates are
// inside a drawn rectangle). HTML divs get hover/click events for free.
// ──────────────────────────────────────────────

interface ThermalMapProps {
  // 2D array of temperatures, e.g., [[35, 36, 37, 38], [34, 35, ...], ...]
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
          // Dynamic grid based on data dimensions
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

// ──────────────────────────────────────────────
// COLOR MAPPING: temperature → CSS color
// ──────────────────────────────────────────────
// This uses HSL (Hue, Saturation, Lightness) color space.
// WHY HSL instead of RGB?
// In HSL, the "Hue" is a color wheel:
//   0° = Red, 60° = Yellow, 120° = Green, 200° = Cyan, 240° = Blue
//
// To go from "cool" (blue/green) to "hot" (red), we just vary the hue
// from ~200° down to 0°. With RGB, you'd need complex math to avoid
// ugly browns and greys in the transition.

function tempToColor(temp: number): string {
  // Clamp temperature to a reasonable range
  const min = 20;    // Below this = cool (blue-ish)
  const max = 60;    // Above this = danger (red)
  const ratio = Math.max(0, Math.min(1, (temp - min) / (max - min)));

  // Interpolate hue: 200 (cyan) → 0 (red)
  const hue = 200 * (1 - ratio);
  const saturation = 70 + ratio * 20;  // More saturated when hot
  const lightness = 45 + ratio * 10;    // Brighter when hot

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
```

### Step 15: Style the Thermal Map

Add to `App.css`:

```css
/* ──────────────────────────────────────────────
   THERMAL MAP
   ────────────────────────────────────────────── */
.thermal-grid {
  display: grid;
  gap: 2px;
  padding: var(--space-sm);
  flex: 1;            /* Fill available space in the panel */
}

.thermal-cell {
  aspect-ratio: 1;    /* Keep cells square */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: transform 0.15s, box-shadow 0.15s;
  cursor: pointer;
}

/* WHY aspect-ratio: 1?
   Without this, grid cells would be rectangles whose height depends
   on the grid container. aspect-ratio: 1 forces every cell to be a
   perfect square, which is what you want for a heatmap grid. */

.thermal-cell:hover {
  transform: scale(1.08);           /* Slight zoom on hover */
  box-shadow: 0 0 8px rgba(0,0,0,0.4);
  z-index: 1;                       /* Pop above neighbors */
}

.thermal-cell-value {
  font-size: 10px;
  font-family: var(--font-mono);
  color: rgba(0, 0, 0, 0.8);       /* Dark text for contrast on colored backgrounds */
  font-weight: 600;
}

.thermal-stats {
  display: flex;
  justify-content: space-around;
  padding: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.thermal-hot {
  color: var(--accent-red) !important;
}
```

---

## 8. Phase 7: Summary Stats Cards

### Step 16: Build a Reusable Panel Wrapper

Create `src/components/Panel.tsx`:

```tsx
// src/components/Panel.tsx

// ──────────────────────────────────────────────
// WHY A GENERIC PANEL COMPONENT?
// ──────────────────────────────────────────────
// Every panel in the dashboard shares:
//   - A title bar with a title and optional badge
//   - Consistent padding and styling
//   - The same background/border treatment
//
// Instead of repeating this structure in every panel,
// we create a WRAPPER component. This is the
// "Container/Presentational" pattern.

import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: ReactNode;   // Whatever goes inside the panel
  className?: string;     // Allow custom CSS classes
}

export function Panel({ title, badge, badgeColor, children, className = '' }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <h3 className="panel-title">{title}</h3>
        {badge && (
          <span
            className="panel-badge"
            style={badgeColor ? { color: badgeColor } : undefined}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
}
```

Add to `App.css`:

```css
.panel {
  background: var(--bg-panel);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--space-md);
}

.panel-content {
  flex: 1;
  min-height: 0;  /* Allow content to shrink within grid cells */
}
```

Usage in App.tsx:

```tsx
<Panel title="BATTERY HEALTH DEGRADATION — 7 MONTH TREND" badge="AVG: 0.85%/mo">
  {/* Chart goes here */}
</Panel>
```

---

## 9. Phase 8: Polish — Animations & Responsive Design

### Step 17: Add Entry Animations

When the dashboard loads, panels should fade/slide in rather than appearing instantly:

```css
/* ──────────────────────────────────────────────
   ENTRY ANIMATIONS
   ────────────────────────────────────────────── */

/* Define the animation */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);   /* Start 8px below final position */
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply to all panels with staggered delays */
.panel,
.fleet-panel,
.dashboard-header {
  animation: fadeSlideUp 0.4s ease-out backwards;
  /* "backwards" means: before animation starts, apply the "from" state.
     Without it, the element would flash visible then animate. */
}

/* Stagger: each panel starts slightly later than the previous */
/* WHY staggering? It creates a "waterfall" effect that draws the eye
   across the dashboard. Without it, everything appears at once which
   feels flat and jarring. */
.fleet-panel        { animation-delay: 0.05s; }
.map-panel          { animation-delay: 0.10s; }
.elevation-panel    { animation-delay: 0.15s; }
.thermal-panel      { animation-delay: 0.20s; }
.health-panel       { animation-delay: 0.25s; }
.regen-panel        { animation-delay: 0.30s; }
.charging-panel     { animation-delay: 0.35s; }
```

### Step 18: Add Number Change Animations

For stats that update live, add a subtle flash:

```css
/* Apply this class when a number changes (via React) */
.value-updated {
  animation: flashHighlight 0.6s ease-out;
}

@keyframes flashHighlight {
  0%   { color: var(--accent-cyan); text-shadow: 0 0 8px rgba(0, 194, 255, 0.5); }
  100% { color: var(--text-primary); text-shadow: none; }
}
```

In React, you'd toggle this class briefly when data changes:

```tsx
// Simple hook to trigger the flash on value change
function useFlash(value: any): boolean {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return flash;
}

// Usage:
function SomeStatDisplay({ value }: { value: number }) {
  const isFlashing = useFlash(value);
  return (
    <span className={`stat-value ${isFlashing ? 'value-updated' : ''}`}>
      {value}%
    </span>
  );
}
```

### Step 19: Responsive Considerations

```css
/* ──────────────────────────────────────────────
   RESPONSIVE BREAKPOINTS
   ────────────────────────────────────────────── */

/* Tablet: collapse to 2 columns */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 200px 1fr;  /* sidebar + 1 content column */
  }
  /* Stack the three content panels vertically */
  .map-panel,
  .elevation-panel,
  .thermal-panel {
    grid-column: 2;
  }
}

/* Mobile: single column */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  .fleet-panel {
    max-height: 200px;          /* Limit sidebar height on mobile */
    overflow-y: auto;
  }
  .bottom-row {
    grid-template-columns: 1fr; /* Stack bottom panels */
  }
}
```

> [!TIP]
> **Why these specific breakpoints?**
> - `1200px` is roughly where 4-column layouts start feeling cramped.
> - `768px` is the iPad portrait width, a common cutoff for "mobile" layouts.
> These aren't magic numbers — test on your actual device and adjust as needed.

---

## 10. Bonus: Real-Time Updates with Polling

### Step 20: Add Simulation Polling

Extend your `useFleetData` hook to also run simulations:

```tsx
// Add to useFleetData.ts

const [simulation, setSimulation] = useState<SimulationResponse | null>(null);

const runSim = useCallback(async (vehicleId: string) => {
  try {
    const result = await api.runSimulation({
      vehicle_id: vehicleId,
      route_distance_km: 129.4,
      elevation_gain_m: 720,
      ambient_temp_c: 27,
      payload_kg: 450,
      driving_style: 'NORMAL',
    });
    setSimulation(result);
  } catch (err) {
    console.error('Simulation failed:', err);
  }
}, []);
```

---

## 🧠 Key Concepts Summary

| Concept | Where Used | Why |
|---------|-----------|-----|
| **CSS Grid** | Dashboard layout | 2D layout of rows + columns |
| **CSS Custom Properties** | Design system | Centralized theming, consistency |
| **`gap` + `background` trick** | Grid borders | Cleaner than individual borders |
| **Component composition** | Every panel | Small, focused, reusable pieces |
| **Lifting state up** | `selectedVehicleId` | Shared state goes in common parent |
| **Custom hooks** | `useFleetData` | Separate data logic from rendering |
| **`useCallback`** | Fetch functions | Prevent unnecessary re-renders |
| **`Promise.all`** | Parallel API calls | Faster than sequential fetching |
| **Record vs Array** | Telemetry storage | O(1) lookups by vehicle ID |
| **Canvas scaling functions** | Charts | Bridge between data space and pixel space |
| **HSL color space** | Thermal map | Intuitive temperature-to-color mapping |
| **`animation-delay` stagger** | Entry animations | Waterfall load effect |
| **`min-height: 0`** | Grid children | Prevents overflow in CSS Grid |
| **`box-sizing: border-box`** | Global reset | Predictable sizing |
| **BEM naming** | CSS classes | Predictable, scalable CSS architecture |
| **Monospace fonts for numbers** | Stats/values | Prevents layout shift on updates |

---

## 📂 Final File Structure

After following all steps, your `src/` should look like:

```
src/
├── components/
│   ├── Header.tsx           (Step 6)
│   ├── FleetPanel.tsx       (Step 8)
│   ├── ElevationChart.tsx   (Step 13)
│   ├── ThermalMap.tsx       (Step 14)
│   └── Panel.tsx            (Step 16)
├── hooks/
│   └── useFleetData.ts      (Step 10)
├── App.tsx                  (Step 5, 11)
├── App.css                  (Step 4, 7, 9, 15, 17-19)
├── index.css                (Step 2-3)
└── main.tsx                 (unchanged)
```

---

## 🚀 Next Steps

Once you've got the basics working, here are things you can add:

1. **Chart.js integration** — `pnpm add chart.js react-chartjs-2` for polished charts with animations, tooltips, and legends
2. **Leaflet map** — `pnpm add leaflet react-leaflet` for the route map panel
3. **WebSocket updates** — Replace polling with real-time push from the backend
4. **Dark/light theme toggle** — Override CSS custom properties with a `.light` class
5. **Controls bar** — Dropdowns and sliders that modify simulation parameters

> [!TIP]
> **Start small, verify often.** After each step, run `pnpm dev` and check the browser. Don't write 500 lines then debug — write 20 lines, verify, repeat.
