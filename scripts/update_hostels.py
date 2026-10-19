#!/usr/bin/env python3
"""Refresh mapped hostels in Latin America from OpenStreetMap Overpass."""
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# ISO-3166-1 alpha-2 codes covering Latin America and the Caribbean.
COUNTRIES = [
    "MX", "BZ", "CR", "SV", "GT", "HN", "NI", "PA",
    "AR", "BO", "BR", "CL", "CO", "EC", "GF", "GY", "PY", "PE", "SR", "UY", "VE",
    "CU", "DO", "HT", "JM", "BS", "BB", "TT", "AG", "DM", "GD", "KN", "LC", "VC",
]
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
OUT = Path("data/hostels.json")
HEADERS = {"User-Agent": "ChristopherTheGoodGringoHostelIndex/1.0 (weekly public OpenStreetMap data refresh)", "Content-Type": "application/x-www-form-urlencoded"}

def fetch_country(code):
    query = f'[out:json][timeout:90];area["ISO3166-1"="{code}"]["admin_level"="2"]->.country;(nwr(area.country)["tourism"="hostel"];);out center tags;'
    body = urllib.parse.urlencode({"data": query}).encode()
    errors = []
    for endpoint in ENDPOINTS:
        try:
            req = urllib.request.Request(endpoint, data=body, headers=HEADERS, method="POST")
            with urllib.request.urlopen(req, timeout=110) as response:
                payload = json.load(response)
            if not isinstance(payload.get("elements"), list):
                raise RuntimeError("Unexpected Overpass response")
            return payload["elements"]
        except Exception as exc:
            errors.append(f"{endpoint}: {exc}")
            time.sleep(2)
    raise RuntimeError(f"All Overpass endpoints failed for {code}: {'; '.join(errors)}")

def normalize(element, country):
    tags = element.get("tags", {})
    center = element.get("center", {})
    lat = element.get("lat", center.get("lat"))
    lon = element.get("lon", center.get("lon"))
    if lat is None or lon is None:
        return None
    osm_type = element.get("type", "node")
    osm_id = element.get("id")
    return {
        "id": f"{osm_type}/{osm_id}",
        "name": tags.get("name") or tags.get("name:en") or "Unnamed hostel",
        "countryCode": country,
        "city": tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village") or tags.get("is_in:city") or "",
        "address": " ".join(x for x in [tags.get("addr:housenumber"), tags.get("addr:street")] if x),
        "website": tags.get("website") or tags.get("contact:website") or "",
        "phone": tags.get("phone") or tags.get("contact:phone") or "",
        "email": tags.get("email") or tags.get("contact:email") or "",
        "lat": lat, "lon": lon,
        "operator": tags.get("operator") or "",
        "osm": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
    }

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    all_items = {}
    failures = []
    for index, code in enumerate(COUNTRIES):
        try:
            for raw in fetch_country(code):
                item = normalize(raw, code)
                if item:
                    all_items[item["id"]] = item
            print(f"{code}: refresh successful; {len(all_items)} unique listings so far")
        except Exception as exc:
            failures.append({"country": code, "error": str(exc)})
            print(f"WARNING: {code}: {exc}")
        if index < len(COUNTRIES) - 1:
            time.sleep(3)
    # Never replace a healthy database with an empty or nearly empty result after API trouble.
    if not all_items:
        raise SystemExit("No hostel records were retrieved; preserving existing database.")
    payload = {
        "source": "OpenStreetMap contributors",
        "license": "ODbL",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(all_items),
        "countriesAttempted": len(COUNTRIES),
        "countriesFailed": failures,
        "hostels": sorted(all_items.values(), key=lambda x: (x["countryCode"], x["name"].casefold())),
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(all_items)} hostel records to {OUT}; failed countries: {len(failures)}")

if __name__ == "__main__":
    main()
