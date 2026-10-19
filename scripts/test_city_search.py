#!/usr/bin/env python3
"""Automated integrity checks for the public city-search index and search wiring."""
import json, math, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CITY_FILE = ROOT / "data" / "cities.json"
HOSTEL_FILE = ROOT / "data" / "hostels.json"
HTML_FILE = ROOT / "hostels.html"
REPORT_FILE = ROOT / "reports" / "city-search-test-report.md"
APPROVED = {"MX","BZ","GT","HN","SV","NI","CR","PA","AR","BO","CL","CO","EC","PY","PE","UY","CU","DO"}

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(c for c in value if not unicodedata.combining(c)).casefold()
    return re.sub(r"\\s+", " ", re.sub(r"[.,]", " ", value)).strip()

def valid(lat, lon):
    try:
        lat, lon = float(lat), float(lon)
        return math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180
    except (TypeError, ValueError):
        return False

def main():
    failures, warnings, checks = [], [], []
    if not CITY_FILE.exists() or not HOSTEL_FILE.exists() or not HTML_FILE.exists():
        raise SystemExit("Required site file missing: city index, hostel data, or hostels.html")
    city_data = json.loads(CITY_FILE.read_text(encoding="utf-8"))
    hostel_data = json.loads(HOSTEL_FILE.read_text(encoding="utf-8"))
    cities = city_data.get("cities", [])
    hostels = hostel_data.get("hostels", [])
    html = HTML_FILE.read_text(encoding="utf-8")

    checks.append(("City index loads", isinstance(cities, list) and len(cities) > 0, f"{len(cities):,} records"))
    checks.append(("Hostel database loads", isinstance(hostels, list) and len(hostels) > 0, f"{len(hostels):,} records"))

    country_counts = Counter(str(c.get("countryCode") or "") for c in cities)
    missing_countries = sorted(APPROVED - set(country_counts))
    checks.append(("All 18 approved countries represented in city index", not missing_countries, ", ".join(missing_countries) if missing_countries else "all present"))

    bad_names = [i for i,c in enumerate(cities) if not str(c.get("name") or "").strip()]
    bad_coords = [i for i,c in enumerate(cities) if not valid(c.get("lat"), c.get("lon"))]
    outside = [i for i,c in enumerate(cities) if c.get("countryCode") not in APPROVED]
    checks.append(("Every city has a name", not bad_names, f"{len(bad_names)} invalid records"))
    checks.append(("Every city has valid numeric coordinates", not bad_coords, f"{len(bad_coords)} invalid records"))
    checks.append(("No city records outside approved countries", not outside, f"{len(outside)} outside-country records"))

    grouped = defaultdict(list)
    for c in cities:
        cc = str(c.get("countryCode") or "")
        name = norm(c.get("name"))
        if name:
            grouped[(cc, name)].append(c)
    duplicate_groups = [(k,v) for k,v in grouped.items() if len(v) > 1]
    checks.append(("No duplicate normalized city names within a country", not duplicate_groups, f"{len(duplicate_groups)} duplicate groups"))

    # Mirrors the site's normalization and country-scoped substring search.
    # Exact-name records are prioritized before the 12-result suggestion limit.
    unsearchable = []
    for c in cities:
        code, name = str(c.get("countryCode") or ""), norm(c.get("name"))
        if not name:
            continue
        matches = [x for x in cities if x.get("countryCode") == code and x.get("name") and name in norm(x.get("name"))]
        matches.sort(key=lambda x: (0 if norm(x.get("name")) == name else 1, norm(x.get("name"))))
        visible = matches[:12]
        if not any(norm(x.get("name")) == name for x in visible):
            unsearchable.append((code, c.get("name"), len(matches)))
    checks.append(("Every indexed city is reachable by exact-name search", not unsearchable, f"{len(unsearchable)} unsearchable records"))

    expected = {
        ("MX", "mexico city"): (19.4326, -99.1332),
        ("CO", "santa marta"): (11.2408, -74.1990),
    }
    canonical_issues = []
    for key, coords in expected.items():
        found = grouped.get(key, [])
        if len(found) != 1 or not valid(found[0].get("lat"), found[0].get("lon")):
            canonical_issues.append(f"{key[0]}:{key[1]} count={len(found)}")
        elif abs(float(found[0]["lat"])-coords[0]) > 0.02 or abs(float(found[0]["lon"])-coords[1]) > 0.02:
            canonical_issues.append(f"{key[0]}:{key[1]} coordinates={found[0].get('lat')},{found[0].get('lon')}")
    checks.append(("Canonical Mexico City and Santa Marta records", not canonical_issues, "; ".join(canonical_issues) if canonical_issues else "both present once near expected coordinates"))

    panama_fallback = "Ensure Panama's capital is searchable" in html and "lat:8.9824,lon:-79.5199" in html
    mexico_alias = "'cdmx':'mexico city'" in html and "'ciudad de mexico':'mexico city'" in html
    persistent_registry = "fetch('/data/cities.json?v=1')" in html
    radius_filter = "distanceKm(Number(target.lat)" in html and "<=25" in html
    checks.append(("Panama City fallback is wired into live search", panama_fallback, "expected fallback code found" if panama_fallback else "fallback code missing"))
    checks.append(("Mexico City aliases are wired into search", mexico_alias, "expected aliases found" if mexico_alias else "aliases missing"))
    checks.append(("Search loads persistent city index", persistent_registry, "persistent index fetch found" if persistent_registry else "persistent index fetch missing"))
    checks.append(("Hostel results are limited by distance from selected city", radius_filter, "25 km coordinate filter found" if radius_filter else "distance filter missing"))

    # Report counts by country for easy monitoring.
    hostel_counts = Counter(str(h.get("countryCode") or "") for h in hostels)
    lines = [
        "# Automated City Search Quality Report", "",
        f"- City index records: **{len(cities):,}**",
        f"- Hostel records: **{len(hostels):,}**",
        "- Scope: static data and search-code integrity; this does not independently verify every location against ground truth or guarantee a hostel exists near every town.", "",
        "## Automated checks", "",
        "| Check | Result | Details |", "|---|---|---|"
    ]
    for name, passed, details in checks:
        lines.append(f"| {name} | {'PASS' if passed else 'FAIL'} | {details.replace('|','/')} |")
        if not passed:
            failures.append(name)
    lines.extend(["", "## City-index coverage by country", "", "| Country code | Cities | Hostel records |", "|---|---:|---:|"])
    for code in sorted(APPROVED):
        lines.append(f"| {code} | {country_counts.get(code,0):,} | {hostel_counts.get(code,0):,} |")
    if duplicate_groups:
        lines.extend(["", "## Duplicate city groups (first 50)", ""])
        for (code,name), group in duplicate_groups[:50]:
            lines.append(f"- {code}: {group[0].get('name')} ({len(group)} records)")
    if unsearchable:
        lines.extend(["", "## Unsearchable city records (first 50)", ""])
        for code,name,count in unsearchable[:50]:
            lines.append(f"- {code}: {name} ({count} substring matches)")
    if bad_coords:
        lines.extend(["", "## Invalid coordinate records (first 50)", ""])
        for i in bad_coords[:50]:
            c = cities[i]
            lines.append(f"- {c.get('countryCode')}: {c.get('name')} ({c.get('lat')}, {c.get('lon')})")
    lines.extend(["", f"**Overall status: {'FAIL' if failures else 'PASS'}**", ""])
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"City search tests: {len(checks)-len(failures)}/{len(checks)} passed. Cities={len(cities)} Hostels={len(hostels)}")
    if failures:
        print("FAILED: " + "; ".join(failures))
        raise SystemExit(1)

if __name__ == "__main__":
    main()
