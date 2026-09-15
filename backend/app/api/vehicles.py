from fastapi import APIRouter, HTTPException

from app.schemas.vehicle import Vehicle

router = APIRouter()

# Mock vehicle data store for initial development
MOCK_FLEET: dict[str, Vehicle] = {
    "EV-001": Vehicle(
        id="EV-001",
        name="Alpha",
        model="Tesla Model 3",
        battery_capacity_kwh=75.0,
        baseline_efficiency_wh_km=160.0,
        current_soc=82.4,
        current_soh=96.1,
        status="IN_USE",
    ),
    "EV-002": Vehicle(
        id="EV-002",
        name="Bravo",
        model="Rivian R1T",
        battery_capacity_kwh=135.0,
        baseline_efficiency_wh_km=210.0,
        current_soc=61.8,
        current_soh=91.3,
        status="IN_USE",
    ),
    "EV-003": Vehicle(
        id="EV-003",
        name="Charlie",
        model="Ford F-150L",
        battery_capacity_kwh=98.0,
        baseline_efficiency_wh_km=240.0,
        current_soc=38.5,
        current_soh=88.7,
        status="IN_USE",
    ),
    "EV-004": Vehicle(
        id="EV-004",
        name="Delta",
        model="Tesla Model Y",
        battery_capacity_kwh=82.0,
        baseline_efficiency_wh_km=155.0,
        current_soc=91.2,
        current_soh=97.4,
        status="CHARGING",
    ),
    "EV-005": Vehicle(
        id="EV-005",
        name="Echo",
        model="Chevy Silverado EV",
        battery_capacity_kwh=200.0,
        baseline_efficiency_wh_km=280.0,
        current_soc=25.3,
        current_soh=84.2,
        status="MAINTENANCE",
    ),
    "EV-006": Vehicle(
        id="EV-006",
        name="Foxtrot",
        model="Rivian R1S",
        battery_capacity_kwh=135.0,
        baseline_efficiency_wh_km=220.0,
        current_soc=74.6,
        current_soh=93.8,
        status="AVAILABLE",
    ),
}


@router.get("/", response_model=list[Vehicle])
def list_vehicles() -> list[Vehicle]:
    """Retrieve all vehicles in the fleet."""
    return list(MOCK_FLEET.values())


@router.get("/{vehicle_id}", response_model=Vehicle)
def get_vehicle(vehicle_id: str) -> Vehicle:
    """Retrieve details for a single vehicle."""
    vehicle = MOCK_FLEET.get(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")
    return vehicle
