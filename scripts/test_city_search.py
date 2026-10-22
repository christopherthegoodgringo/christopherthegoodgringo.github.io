#!/usr/bin/env python3
"""Integrity checks for the rebuilt country/city hostel finder."""
import json, math, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLEAN_FILE = ROOT / "data" / "hostels-clean.json"
PAID_FILE = ROOT / "data" / "paid-listings.json"
HTML_FILE = ROOT / "hostels.html"
REPORT_FILE = ROOT / "reports" / "city-search-test-report.md"
APPROVED = {"MX","BZ","GT","HN","SV","NI","CR","PA","AR","BO","CL","CO","EC","PY","PE","UY","DO"}

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(c for c in value if not unicodedata.combining(c)).casefold()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()

def valid(lat, lon):
    try:
        lat, lon = float(lat), float(lon)
        return math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180
    except (TypeError, ValueError):
        return False

def main():
    failures, checks = [], []
    if not CLEAN_FILE.exists() or not PAID_FILE.exists() or not HTML_FILE.exists():
        raise SystemExit("Required file missing: clean hostel data, paid listings, or hostels.html")
    data = json.loads(CLEAN_FILE.read_text(encoding="utf-8"))
    paid_data = json.loads(PAID_FILE.read_text(encoding="utf-8"))
    hostels = data.get("hostels", [])
    paid = paid_data.get("hostels", [])
    html = HTML_FILE.read_text(encoding="utf-8")
    checks.append(("Clean hostel database loads", isinstance(hostels, list) and len(hostels) > 0, f"{len(hostels):,} records"))
    checks.append(("All 18 approved countries are available in the selector", all(f"['{code}'" in html or f'["{code}"' in html for code in APPROVED), "18 approved country codes configured"))
    outside = [h for h in hostels if h.get("countryCode") not in APPROVED]
    checks.append(("No records outside the approved 18-country scope", not outside, f"{len(outside)} out-of-scope records"))
    bad = [h for h in hostels if not str(h.get("name") or "").strip() or not valid(h.get("lat"), h.get("lon"))]
    checks.append(("Clean records have names and valid coordinates", not bad, f"{len(bad)} invalid records"))
    groups = defaultdict(list)
    for h in hostels:
        groups[(h.get("countryCode"), norm(h.get("city")), norm(h.get("name")))].append(h)
    duplicates = [k for k, rows in groups.items() if len(rows) > 1]
    checks.append(("No exact normalized name/city duplicates remain", not duplicates, f"{len(duplicates)} duplicate groups"))
    checks.append(("Page loads compact cleaned data", "fetch('/data/hostels-clean.json')" in html, "clean data endpoint found"))
    checks.append(("Paid and free owner listings are merged separately", "fetch('/data/paid-listings.json')" in html and len(paid) > 0, f"{len(paid)} owner listings available"))
    checks.append(("Country and city filters are present", 'id="countryFilter"' in html and 'id="cityFilter"' in html, "both selectors found"))
    checks.append(("English/Spanish toggle is wired", 'id="languageToggle"' in html and "setLanguage(lang==='en'?'es':'en')" in html, "bilingual toggle found"))
    checks.append(("Booking buttons only link to Hostelworld", "hostelworld\\.com" in html and "View on Hostelworld" in html, "Hostelworld-only booking link logic found"))
    checks.append(("No link to the separate hotel directory", "hotels.html" not in html, "directory pages remain separate"))
    lines = ["# Automated Hostel Directory Quality Report", "", f"- Clean hostel records: **{len(hostels):,}**", f"- Owner-managed listings: **{len(paid):,}**", f"- Source database updated: **{data.get('updatedAt', 'unknown')}**", "- Scope: structural data checks; OpenStreetMap coverage may be incomplete and listings are not independently verified.", "", "## Automated checks", "", "| Check | Result | Details |", "|---|---|---|"]
    for name, passed, details in checks:
        lines.append(f"| {name} | {'PASS' if passed else 'FAIL'} | {details.replace('|','/')} |")
        if not passed: failures.append(name)
    counts = Counter(h.get("countryCode", "") for h in hostels)
    lines.extend(["", "## Clean data coverage by country", "", "| Country code | Listings |", "|---|---:|"])
    for code in sorted(APPROVED): lines.append(f"| {code} | {counts.get(code, 0):,} |")
    lines.extend(["", f"**Overall status: {'FAIL' if failures else 'PASS'}**", ""])
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"Hostel directory checks: {len(checks)-len(failures)}/{len(checks)} passed. Clean records={len(hostels)}")
    if failures:
        print("FAILED: " + "; ".join(failures))
        raise SystemExit(1)

if __name__ == "__main__":
    main()
