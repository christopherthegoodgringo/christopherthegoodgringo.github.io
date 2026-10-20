#!/usr/bin/env python3
"""Fill blank hostel city fields only when the nearest same-country city is <= 5 km."""
import json
import math
from pathlib import Path
from sklearn.neighbors import BallTree
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
HOSTELS_PATH = ROOT / "data" / "hostels.json"
CITIES_PATH = ROOT / "data" / "cities.json"
MAX_DISTANCE_KM = 5.0
EARTH_RADIUS_KM = 6371.0088

with HOSTELS_PATH.open(encoding="utf-8") as f:
    hostels_data = json.load(f)
hostels = hostels_data["hostels"] if isinstance(hostels_data, dict) else hostels_data
# Prefer the same embedded city index used to generate the reviewed correction file.
if isinstance(hostels_data, dict) and isinstance(hostels_data.get("cities"), list):
    cities = hostels_data["cities"]
else:
    with CITIES_PATH.open(encoding="utf-8") as f:
        cities_data = json.load(f)
    cities = cities_data["cities"] if isinstance(cities_data, dict) and "cities" in cities_data else cities_data

cities_by_country = {}
for city in cities:
    cc = city.get("countryCode") or city.get("country_code")
    name = city.get("name")
    lat, lon = city.get("lat"), city.get("lon")
    if cc and name and isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
        cities_by_country.setdefault(cc, []).append(city)

trees = {}
for cc, records in cities_by_country.items():
    coords = np.radians([[r["lat"], r["lon"]] for r in records])
    trees[cc] = BallTree(coords, metric="haversine")

changed = 0
for hostel in hostels:
    if (hostel.get("city") or "").strip():
        continue
    cc = hostel.get("countryCode") or hostel.get("country_code")
    lat, lon = hostel.get("lat"), hostel.get("lon")
    if cc not in trees or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        continue
    distances, indices = trees[cc].query(np.radians([[lat, lon]]), k=1)
    distance_km = float(distances[0][0]) * EARTH_RADIUS_KM
    if distance_km <= MAX_DISTANCE_KM:
        candidate = cities_by_country[cc][int(indices[0][0])]
        hostel["city"] = candidate["name"]
        changed += 1

print(f"Filled blank city fields: {changed}")
print(f"Hostel records preserved: {len(hostels)}")
if changed != 8112:
    raise SystemExit(
        f"Safety stop: expected 8112 assignments based on the reviewed correction file, got {changed}. "
        "No database change will be committed."
    )

# Preserve the top-level data and all hostel fields; only blank city fields were filled.
HOSTELS_PATH.write_text(
    json.dumps(hostels_data, ensure_ascii=False, separators=(",", ":")) + "\n",
    encoding="utf-8",
)
