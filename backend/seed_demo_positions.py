"""Post demo telemetry with positions along the Portland -> Bend corridor.

Run with a backend already running: cd backend && uv run python seed_demo_positions.py
[--base-url http://127.0.0.1:8000]

Each registered vehicle gets one event that keeps its current SOC/SOH, so only the battery
state's source ("telemetry") and timestamp change.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime

# On-road points from apps/web/src/routeData.ts: (name, lat, lon, speed_kph)
CORRIDOR = [
    ("Portland", 45.52311, -122.6765, 0.0),
    ("Sandy", 45.39625, -122.26065, 72.0),
    ("Government Camp", 45.30241, -121.75859, 64.0),
    ("Warm Springs", 44.76472, -121.26629, 88.0),
    ("Madras", 44.63351, -121.12911, 56.0),
    ("Redmond", 44.27088, -121.1709, 90.0),
    ("Bend", 44.05819, -121.31531, 0.0),
]


def request_json(url: str, payload: dict | None = None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    with urllib.request.urlopen(urllib.request.Request(url, data, headers), timeout=10) as res:
        return json.load(res)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    base_url = parser.parse_args().base_url.rstrip("/")

    try:
        vehicles = request_json(f"{base_url}/api/vehicles/")
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"Cannot read vehicles from {base_url}: {exc}", file=sys.stderr)
        return 1
    if not vehicles:
        print("No registered vehicles; nothing to seed.", file=sys.stderr)
        return 1

    now = datetime.now(UTC).isoformat()
    events = []
    for index, vehicle in enumerate(vehicles):
        _, lat, lon, speed = CORRIDOR[index % len(CORRIDOR)]
        events.append(
            {
                "vehicle_id": vehicle["id"],
                "timestamp": now,
                "soc": vehicle["current_soc"],
                "soh": vehicle["current_soh"],
                "speed_kph": speed,
                "odometer_km": 12000.0 + 4500.0 * index,
                "ambient_temp_c": 18.0,
                "pack_temp_c": 28.0,
                "latitude": lat,
                "longitude": lon,
            }
        )

    try:
        response = request_json(f"{base_url}/api/telemetry/batch", {"events": events})
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        print(f"Batch rejected ({exc.code}): {detail}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"Cannot post telemetry to {base_url}: {exc}", file=sys.stderr)
        return 1

    positions = {event["vehicle_id"]: event for event in events}
    failed = 0
    for result in response["results"]:
        event = positions.get(result["vehicle_id"], {})
        where = f"({event.get('latitude')}, {event.get('longitude')})" if event else ""
        print(f"{result['vehicle_id']}: {result['message']} {where}".rstrip())
        failed += not result["success"]
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
