#!/usr/bin/env python3
"""Build a persistent canonical destination index from the existing dataset.
This script writes data/cities.json only. It never changes hostel records.
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "hostels.json"
TARGET = ROOT / "data" / "cities.json"
APPROVED = {"MX","BZ","GT","HN","SV","NI","CR","PA","AR","BO","CL","CO","EC","PY","PE","UY","DO"}

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).casefold()
    return re.sub(r"\s+", " ", re.sub(r"[.,]", " ", value)).strip()

def valid(lat, lon):
    try:
        lat, lon = float(lat), float(lon)
        return -90 <= lat <= 90 and -180 <= lon <= 180
    except (TypeError, ValueError):
        return False

def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    raw = data.get("cities", [])
    selected = {}
    for item in raw:
        code = str(item.get("countryCode") or "")
        name = str(item.get("name") or "").strip()
        if code not in APPROVED or not name or not valid(item.get("lat"), item.get("lon")):
            continue
        normalized = norm(name)
        if not normalized:
            continue
        key = (code, normalized)
        candidate = {
            "countryCode": code,
            "name": name,
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
            "detail": str(item.get("detail") or name),
        }
        old = selected.get(key)
        if old is None:
            selected[key] = candidate
        elif code == "MX" and normalized == "ciudad de mexico":
            # Canonical central Mexico City coordinates; never use neighborhood duplicates.
            selected[key] = {"countryCode":"MX","name":"Mexico City","lat":19.4326,"lon":-99.1332,"detail":"Mexico City, Mexico"}
        elif code == "CO" and normalized == "santa marta":
            # Reject same-named places elsewhere in Colombia.
            selected[key] = {"countryCode":"CO","name":"Santa Marta","lat":11.2408,"lon":-74.1990,"detail":"Santa Marta, Colombia"}
    # Canonicalize Mexico City even if only one of its duplicate OSM objects exists.
    if ("MX", "ciudad de mexico") in selected:
        selected[("MX", "ciudad de mexico")] = {"countryCode":"MX","name":"Mexico City","lat":19.4326,"lon":-99.1332,"detail":"Mexico City, Mexico"}
    # Canonicalize Santa Marta and drop same-name records whose coordinates are far away.
    if ("CO", "santa marta") in selected:
        selected[("CO", "santa marta")] = {"countryCode":"CO","name":"Santa Marta","lat":11.2408,"lon":-74.1990,"detail":"Santa Marta, Colombia"}
    result = {
        "source": "Persistent destination index migrated from the existing OpenStreetMap dataset",
        "createdAt": data.get("updatedAt"),
        "countryCodes": sorted(APPROVED),
        "cities": sorted(selected.values(), key=lambda c:(c["countryCode"], norm(c["name"]), c["name"])),
        "aliases": {
            "MX": {"mexico city":"Mexico City","ciudad de mexico":"Mexico City","cdmx":"Mexico City"},
            "CO": {"santa marta":"Santa Marta"}
        }
    }
    TARGET.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Created persistent city index:", len(result["cities"]), "cities")
    print("Mexico City and Santa Marta use canonical coordinates.")
    print("Hostel records were not modified.")

if __name__ == "__main__":
    main()
