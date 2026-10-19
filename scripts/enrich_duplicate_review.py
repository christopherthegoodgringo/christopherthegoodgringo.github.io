#!/usr/bin/env python3
"""Enrich duplicate candidates with existing source fields; read-only."""
import csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "hostels.json"
CANDIDATES = ROOT / "reports" / "hostel-duplicate-review.csv"
OUT = ROOT / "reports" / "hostel-duplicate-source-details.csv"

def first(record, *keys):
    for key in keys:
        value = record.get(key)
        if value not in (None, "", [], {}):
            if isinstance(value, (dict, list)):
                return json.dumps(value, ensure_ascii=False, sort_keys=True)
            return str(value)
    return ""

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    hostels = data.get("hostels", [])
    by_id = {}
    for h in hostels:
        for ident in (h.get("id"), h.get("osm")):
            if ident:
                by_id[str(ident)] = h
                if "/" in str(ident):
                    by_id[str(ident).split("/", 1)[1]] = h
    with CANDIDATES.open(newline="", encoding="utf-8") as source, OUT.open("w", newline="", encoding="utf-8") as target:
        reader = csv.DictReader(source)
        fields = list(reader.fieldnames or []) + [
            "a_record_found", "a_record_type", "a_address", "a_website", "a_phone", "a_description",
            "b_record_found", "b_record_type", "b_address", "b_website", "b_phone", "b_description",
            "comparison_note"
        ]
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        for row in reader:
            a = by_id.get(row.get("hostel_a_id", ""), {})
            b = by_id.get(row.get("hostel_b_id", ""), {})
            def details(prefix, rec):
                return {
                    prefix + "_record_found": "yes" if rec else "no",
                    prefix + "_record_type": first(rec, "type", "osmType", "osm_type"),
                    prefix + "_address": first(rec, "address", "addr", "street", "addressLine"),
                    prefix + "_website": first(rec, "website", "url", "contactWebsite", "contact:website"),
                    prefix + "_phone": first(rec, "phone", "contactPhone", "contact:phone", "telephone"),
                    prefix + "_description": first(rec, "description", "about", "summary"),
                }
            row.update(details("a", a))
            row.update(details("b", b))
            if not a or not b:
                note = "One or both source records not matched by ID; manual lookup needed"
            elif row.get("hostel_a_id") == row.get("hostel_b_id"):
                note = "Same ID; inspect import/key handling"
            elif row.get("hostel_a_lat") == row.get("hostel_b_lat") and row.get("hostel_a_lon") == row.get("hostel_b_lon"):
                note = "Exact coordinate match; compare source type and contact/address details"
            else:
                note = "Compare contact/address/description; proximity alone does not confirm duplicate"
            row["comparison_note"] = note
            writer.writerow(row)
    print(f"Wrote read-only source detail report: {OUT}")

if __name__ == "__main__":
    main()
