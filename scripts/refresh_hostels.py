#!/usr/bin/env python3
"""Refresh the site's static OpenStreetMap hostel and destination index.

This is the canonical refresh script; it preserves both hostel listings and
the city index consumed by the live destination search.
"""
import json, os, sys, time
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

COUNTRIES = [
    ("MX", "Mexico"), ("BZ", "Belize"), ("GT", "Guatemala"),
    ("HN", "Honduras"), ("SV", "El Salvador"), ("NI", "Nicaragua"),
    ("CR", "Costa Rica"), ("PA", "Panama"), ("AR", "Argentina"),
    ("BO", "Bolivia"), ("CL", "Chile"), ("CO", "Colombia"),
    ("EC", "Ecuador"), ("PY", "Paraguay"), ("PE", "Peru"),
    ("UY", "Uruguay"), ("CU", "Cuba"), ("DO", "Dominican Republic"),
]
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

def fetch_country(code):
    query = f'''[out:json][timeout:90];
area["ISO3166-1"="{code}"][admin_level=2]->.country;
(
  nwr(area.country)["tourism"="hostel"];
  nwr(area.country)["place"~"^(city|town|village)$"];
);
out center tags;'''
    errors = []
    for endpoint in ENDPOINTS:
        for attempt in range(2):
            try:
                body = urlencode({"data": query}).encode()
                req = Request(endpoint, data=body, headers={
                    "User-Agent": "ChristopherTheGoodGringoHostelIndex/1.0 (weekly static data refresh)",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                })
                with urlopen(req, timeout=115) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload.get("elements"), list):
                    raise ValueError("Overpass response did not contain elements")
                return payload["elements"]
            except Exception as exc:
                errors.append(f"{endpoint}: {exc}")
                time.sleep(2 + attempt * 3)
    raise RuntimeError(f"All map-data endpoints failed for {code}: " + " | ".join(errors[-3:]))

def coords(element):
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]
    center = element.get("center") or {}
    return center.get("lat"), center.get("lon")

def main():
    hostels, cities = {}, {}
    for code, country_name in COUNTRIES:
        print(f"Downloading {country_name} ({code})...", flush=True)
        elements = fetch_country(code)
        for item in elements:
            tags = item.get("tags") or {}
            lat, lon = coords(item)
            if lat is None or lon is None:
                continue
            if tags.get("tourism") == "hostel":
                key = f'{item.get("type")}/{item.get("id")}'
                hostels[key] = {
                    "id": key,
                    "name": tags.get("name") or tags.get("name:en") or tags.get("name:es") or "Unnamed hostel",
                    "city": tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village") or tags.get("is_in:city") or "",
                    "address": " ".join(filter(None, [tags.get("addr:street"), tags.get("addr:housenumber")])),
                    "website": tags.get("website") or tags.get("contact:website") or "",
                    "phone": tags.get("phone") or tags.get("contact:phone") or "",
                    "email": tags.get("email") or tags.get("contact:email") or "",
                    "lat": lat, "lon": lon,
                    "operator": tags.get("operator") or "",
                    "countryCode": code,
                    "osm": f'https://www.openstreetmap.org/{item.get("type")}/{item.get("id")}',
                }
            if tags.get("place") in ("city", "town", "village"):
                name = tags.get("name") or tags.get("name:es") or tags.get("name:en")
                if name:
                    # OSM may represent one city with multiple map objects.
                    # Keep one destination per normalized name and prefer the
                    # highest-level place record (city > town > village).
                    key = (code, name.casefold().strip())
                    rank = {"city": 3, "town": 2, "village": 1}.get(tags.get("place"), 0)
                    existing = cities.get(key)
                    if existing is None or rank > existing["_rank"]:
                        cities[key] = {
                            "countryCode": code, "name": name, "lat": lat, "lon": lon,
                            "detail": f"{name}, {country_name}", "_rank": rank,
                        }
        print(f"  {len(hostels)} total hostels; {len(cities)} destinations indexed.", flush=True)
        time.sleep(2)
    payload = {
        "source": "OpenStreetMap contributors",
        "license": "ODbL",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "countryCodes": [code for code, _ in COUNTRIES],
        "hostels": sorted(hostels.values(), key=lambda x: (x["countryCode"], x["name"].casefold())),
        "cities": sorted(({k: v for k, v in city.items() if k != "_rank"} for city in cities.values()), key=lambda x: (x["countryCode"], x["name"].casefold())),
    }
    os.makedirs("data", exist_ok=True)
    with open("data/hostels.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f'Wrote {len(payload["hostels"])} hostels and {len(payload["cities"])} destinations.', flush=True)

if __name__ == "__main__":
    main()
