#!/usr/bin/env python3
"""Non-destructive checks for city search and duplicate suppression."""
import json
import math
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOSTELS_PATH = ROOT / "data" / "hostels.json"
CITIES_PATH = ROOT / "data" / "cities.json"
PAGE_PATH = ROOT / "hostels.html"

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).casefold()
    return re.sub(r"\\s+", " ", re.sub(r"[.,]", " ", value)).strip()

def distance_km(a, b):
    rad = math.radians
    p = math.sin(rad(b["lat"] - a["lat"]) / 2) ** 2 + math.cos(rad(a["lat"])) * math.cos(rad(b["lat"])) * math.sin(rad(b["lon"] - a["lon"]) / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(p), math.sqrt(max(0, 1-p)))

def main():
    host_data = json.loads(HOSTELS_PATH.read_text(encoding="utf-8"))
    city_data = json.loads(CITIES_PATH.read_text(encoding="utf-8"))
    hostels = host_data.get("hostels", [])
    cities = city_data.get("cities", [])
    page = PAGE_PATH.read_text(encoding="utf-8")

    assert isinstance(hostels, list) and hostels, "hostels.json must contain hostel records"
    assert isinstance(cities, list) and cities, "cities.json must contain city records"
    assert "distanceKm(Number(target.lat),Number(target.lon),Number(x.lat),Number(x.lon))<=25" in page, "Expected 25 km radius search behavior is missing"
    assert "if(seenNames.has(normalized))return false" in page, "Suggestion duplicate-name suppression is missing"
    assert "const aliases={'mexico city':'mexico city','ciudad de mexico':'mexico city','cdmx':'mexico city'}" in page, "Mexico City aliases are missing"
    assert "Direct-entry fallback for Santa Marta" in page, "Santa Marta direct-entry fallback is missing"

    expected = [("Mexico City", "MX"), ("Santa Marta", "CO")]
    for city_name, country_code in expected:
        matches = [c for c in cities if c.get("countryCode") == country_code and norm(c.get("name")) == norm(city_name)]
        assert len(matches) == 1, f"{city_name} city index should have exactly one match; found {len(matches)}"
        target = matches[0]
        nearby = [h for h in hostels if h.get("countryCode") == country_code and _valid_coords(h) and distance_km(target, h) <= 25]
        explicit = [h for h in nearby if norm(h.get("city")) == norm(city_name)]
        assert len(explicit) > 0, f"{city_name} should have at least one explicitly city-tagged hostel within 25 km"
        print(f"PASS {city_name}: one city-index entry; {len(explicit)} explicitly city-tagged hostels; {len(nearby)} total hostels within 25 km")

    seen_ids = {}
    duplicates = []
    for h in hostels:
        ident = str(h.get("id") or h.get("osm") or "").strip()
        if ident:
            if ident in seen_ids:
                duplicates.append(ident)
            seen_ids[ident] = True
    assert not duplicates, f"Duplicate hostel IDs/OSM identifiers found: {len(duplicates)}"
    print(f"PASS duplicate identifiers: none across {len(hostels)} hostel records")
    print("PASS front-end search safeguards: 25 km radius, Mexico City aliases, Santa Marta fallback, duplicate suggestion suppression")

def _valid_coords(h):
    try:
        lat, lon = float(h.get("lat")), float(h.get("lon"))
        return math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180
    except (TypeError, ValueError):
        return False

if __name__ == "__main__":
    main()
