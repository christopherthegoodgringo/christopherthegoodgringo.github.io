#!/usr/bin/env python3
"""Read-only audit. Never modifies data/hostels.json."""
import csv, json, math, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

APPROVED = {
    "MX":"Mexico","BZ":"Belize","GT":"Guatemala","HN":"Honduras","SV":"El Salvador",
    "NI":"Nicaragua","CR":"Costa Rica","PA":"Panama","AR":"Argentina","BO":"Bolivia",
    "CL":"Chile","CO":"Colombia","EC":"Ecuador","PY":"Paraguay","PE":"Peru",
    "UY":"Uruguay","CU":"Cuba","DO":"Dominican Republic"
}
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"hostels.json"
CITY_DATA=ROOT/"data"/"cities.json"
REPORT=ROOT/"reports"/"hostel-database-audit.md"
CITY_SUGGESTIONS=ROOT/"reports"/"hostel-city-suggestions.csv"

def norm(v):
    v=unicodedata.normalize("NFKD",str(v or ""))
    v="".join(c for c in v if not unicodedata.combining(c)).casefold()
    return re.sub(r"\s+"," ",re.sub(r"[.,]"," ",v)).strip()

def valid(lat,lon):
    try:
        lat,lon=float(lat),float(lon)
        return math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180
    except (TypeError,ValueError): return False

def distance_m(a,b):
    try:
        lat1,lon1=float(a.get("lat")),float(a.get("lon"))
        lat2,lon2=float(b.get("lat")),float(b.get("lon"))
        p1,p2=math.radians(lat1),math.radians(lat2)
        dp=math.radians(lat2-lat1); dl=math.radians(lon2-lon1)
        q=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
        return 6371000*2*math.atan2(math.sqrt(q),math.sqrt(max(0,1-q)))
    except (TypeError,ValueError): return float("inf")

def nearest_city_suggestions(hostels, cities, missing_indexes, max_km=50):
    """Suggest nearest same-country city records; never edits source listings."""
    cell = 0.25
    grid = defaultdict(list)
    for c in cities:
        if not valid(c.get("lat"), c.get("lon")):
            continue
        cc = str(c.get("countryCode") or "")
        lat, lon = float(c["lat"]), float(c["lon"])
        grid[(cc, math.floor((lat + 90) / cell), math.floor((lon + 180) / cell))].append(
            (lat, lon, str(c.get("name") or ""), str(c.get("detail") or "")))
    suggestions = []
    max_m = max_km * 1000
    for idx in missing_indexes:
        h = hostels[idx]
        if not valid(h.get("lat"), h.get("lon")):
            suggestions.append((h, "", "", "", "no valid hostel coordinates"))
            continue
        cc, lat, lon = str(h.get("countryCode") or ""), float(h["lat"]), float(h["lon"])
        lat_bin, lon_bin = math.floor((lat + 90) / cell), math.floor((lon + 180) / cell)
        lat_span = int(math.ceil(max_km / (111.0 * cell))) + 1
        lon_span = int(math.ceil(max_km / (111.0 * cell * max(0.05, math.cos(math.radians(lat))))) ) + 1
        nearest = []
        seen_cities = set()
        for bi in range(lat_bin - lat_span, lat_bin + lat_span + 1):
            for bj in range(lon_bin - lon_span, lon_bin + lon_span + 1):
                for city_lat, city_lon, city_name, detail in grid.get((cc, bi, bj), []):
                    city_key = (city_name.casefold(), round(city_lat, 5), round(city_lon, 5))
                    if city_key in seen_cities:
                        continue
                    seen_cities.add(city_key)
                    d = distance_m(h, {"lat": city_lat, "lon": city_lon})
                    if d <= max_m:
                        nearest.append((d, city_name, detail))
        nearest.sort(key=lambda x: x[0])
        if nearest:
            d, city_name, detail = nearest[0]
            km = d / 1000
            second_km = nearest[1][0] / 1000 if len(nearest) > 1 else ""
            gap_km = (nearest[1][0] - d) / 1000 if len(nearest) > 1 else ""
            if km <= 5 and (second_km == "" or gap_km >= 2):
                confidence = "high (<=5 km; clear nearest)"
            elif km <= 5:
                confidence = "ambiguous (another city within 2 km distance gap)"
            elif km <= 25:
                confidence = "medium (5-25 km)"
            else:
                confidence = "review (25-50 km)"
            suggestions.append((h, city_name, detail, f"{km:.2f}", confidence,
                                f"{second_km:.2f}" if second_km != "" else "",
                                f"{gap_km:.2f}" if gap_km != "" else ""))
        else:
            suggestions.append((h, "", "", "", "no city within 50 km", "", ""))
    return suggestions

def mdtable(headers,rows):
    out=["| "+" | ".join(headers)+" |","|"+"|".join("---" for _ in headers)+"|"]
    for row in rows:
        out.append("| "+" | ".join(str(x).replace("|","/").replace("\n"," ") for x in row)+" |")
    return "\n".join(out)

def main():
    if not DATA.exists(): raise SystemExit("Missing data/hostels.json")
    d=json.loads(DATA.read_text(encoding="utf-8"))
    hs=d.get("hostels",[])
    city_source=json.loads(CITY_DATA.read_text(encoding="utf-8")) if CITY_DATA.exists() else d
    cs=city_source.get("cities",[])
    if not isinstance(hs,list) or not isinstance(cs,list): raise SystemExit("Expected hostels and cities arrays")
    hcountry,countrycity=Counter(),Counter()
    missing_name,missing_city,bad_h,unknown_h=[],[],[],[]
    ids,namedup,citydup=defaultdict(list),defaultdict(list),defaultdict(list)
    for i,h in enumerate(hs):
        cc=str(h.get("countryCode") or ""); name=str(h.get("name") or "").strip(); city=str(h.get("city") or "").strip()
        hcountry[cc]+=1
        if not name or norm(name)=="unnamed hostel": missing_name.append((i,cc,city,h.get("id","")))
        if not city: missing_city.append((i,cc,name,h.get("id","")))
        if cc not in APPROVED: unknown_h.append((i,cc,name))
        if not valid(h.get("lat"),h.get("lon")): bad_h.append((i,cc,name))
        ident=str(h.get("id") or h.get("osm") or "")
        if ident: ids[ident].append(h)
        if name: namedup[(cc,norm(name))].append(h)
    for c in cs:
        cc=str(c.get("countryCode") or "")
        countrycity[cc]+=1
        if norm(c.get("name")):
            citydup[(cc,norm(c.get("name")))].append(c)
    dupids=[v for v in ids.values() if len(v)>1]
    dupnames=[v for v in namedup.values() if len(v)>1]
    near_name_pairs=[]
    for group in dupnames:
        for i,a in enumerate(group):
            for b in group[i+1:]:
                meters=distance_m(a,b)
                if meters<=100: near_name_pairs.append((meters,a,b))
    near_name_pairs.sort(key=lambda x:x[0])
    city_suggestions = nearest_city_suggestions(hs, cs, [i for i, h in enumerate(hs) if not str(h.get("city") or "").strip()])
    suggestion_counts = {
        "within 5 km": sum(1 for x in city_suggestions if x[3] and float(x[3]) <= 5),
        "within 10 km": sum(1 for x in city_suggestions if x[3] and float(x[3]) <= 10),
        "within 25 km": sum(1 for x in city_suggestions if x[3] and float(x[3]) <= 25),
        "within 50 km": sum(1 for x in city_suggestions if x[3] and float(x[3]) <= 50),
        "no city within 50 km / no valid coordinates": sum(1 for x in city_suggestions if not x[3]),
    }
    dupcities=[v for v in citydup.values() if len(v)>1]
    bad_c=[c for c in cs if not valid(c.get("lat"),c.get("lon"))]
    unknown_c=[c for c in cs if str(c.get("countryCode") or "") not in APPROVED]
    mex=[c for c in cs if c.get("countryCode")=="MX" and norm(c.get("name")) in ("mexico city","ciudad de mexico","cdmx")]
    santa=[c for c in cs if c.get("countryCode")=="CO" and norm(c.get("name"))=="santa marta"]
    mexh=[h for h in hs if h.get("countryCode")=="MX" and any(x in norm(h.get("city")) for x in ("mexico city","ciudad de mexico","cdmx"))]
    santah=[h for h in hs if h.get("countryCode")=="CO" and "santa marta" in norm(h.get("city"))]
    lines=[
        "# Read-only Hostel Database Audit","",
        "- Source: "+str(d.get("source","not specified")),
        "- Dataset timestamp: "+str(d.get("updatedAt","not specified")),
        "- Total hostel records: **"+str(len(hs))+"**",
        "- Total city-index records: **"+str(len(cs))+"**",
        "- City index source: **"+("data/cities.json (persistent)" if CITY_DATA.exists() else "legacy embedded list")+"**",
        "- No listing records were changed or deleted by this audit.","",
        "## Coverage by approved country","","### Hostels",
        mdtable(["Code","Country","Records"],[(k,v,hcountry.get(k,0)) for k,v in APPROVED.items()]),
        "","### City index",
        mdtable(["Code","Country","Records"],[(k,v,countrycity.get(k,0)) for k,v in APPROVED.items()]),
        "","## Data-quality findings","",
        "- Missing or generic hostel name: **"+str(len(missing_name))+"**",
        "- Hostel with blank city field: **"+str(len(missing_city))+"**",
        "- Blank-city listings with nearest same-country city within 5 km: **"+str(suggestion_counts["within 5 km"])+"**",
        "- Blank-city listings within 5 km with an unambiguous nearest city (at least 2 km closer than second-nearest): **"+str(sum(1 for x in city_suggestions if x[3] and float(x[3]) <= 5 and x[4] == "high (<=5 km; clear nearest)"))+"**",
        "- Blank-city listings within 5 km with competing nearby city candidates: **"+str(sum(1 for x in city_suggestions if x[4].startswith("ambiguous")))+"**",
        "- Blank-city listings with nearest same-country city within 10 km: **"+str(suggestion_counts["within 10 km"])+"**",
        "- Blank-city listings with nearest same-country city within 25 km: **"+str(suggestion_counts["within 25 km"])+"**",
        "- Blank-city listings with nearest same-country city within 50 km: **"+str(suggestion_counts["within 50 km"])+"**",
        "- Blank-city listings with no city within 50 km or invalid coordinates: **"+str(suggestion_counts["no city within 50 km / no valid coordinates"])+"**",
        "- Hostel with invalid/missing coordinates: **"+str(len(bad_h))+"**",
        "- Hostel outside approved countries: **"+str(len(unknown_h))+"**",
        "- Duplicate exact ID groups: **"+str(len(dupids))+"**",
        "- Repeated normalized name + country groups (not necessarily duplicates): **"+str(len(dupnames))+"**",
        "- Same-name pairs within 100 metres (priority review candidates): **"+str(len(near_name_pairs))+"**",
        "- Duplicate normalized city name + country groups: **"+str(len(dupcities))+"**",
        "- City records with invalid/missing coordinates: **"+str(len(bad_c))+"**",
        "- City records outside approved countries: **"+str(len(unknown_c))+"**",
        "","## Proposed city-field enrichment (read-only)","",
        "Nearest same-country city suggestions use the existing city index and hostel coordinates. These are proposals only: the audit does not write city values into hostel records. A nearby city-index point may not represent the correct municipality, especially for rural properties.",
        "",
        mdtable(["Distance band","Blank-city listings"], list(suggestion_counts.items())),
        "",
        "A detailed proposal file is generated at reports/hostel-city-suggestions.csv. It includes the hostel ID/name/country/coordinates, nearest city suggestion, distance, second-nearest city distance, and distance gap. A match within 5 km is only marked high confidence when it is at least 2 km closer than the second-nearest city. Ambiguous matches are flagged for review. Listings without a city within 50 km are left without a suggestion.",
        "",
        "","## Mexico City diagnosis","",
        "- Mexico City-like city index records: **"+str(len(mex))+"**",
        "- Hostel records whose city field explicitly names Mexico City: **"+str(len(mexh))+"**",
        mdtable(["City name","Country","Lat","Lon"],[(c.get("name"),c.get("countryCode"),c.get("lat"),c.get("lon")) for c in mex]) if mex else "No Mexico City-like record found.",
        "","## Santa Marta diagnosis","",
        "- Santa Marta city index records in Colombia: **"+str(len(santa))+"**",
        "- Hostel records whose city field explicitly says Santa Marta: **"+str(len(santah))+"**",
        mdtable(["City name","Country","Lat","Lon"],[(c.get("name"),c.get("countryCode"),c.get("lat"),c.get("lon")) for c in santa]) if santa else "No Santa Marta record found.",
        "","## Same-name hostel pairs within 100 metres","","These are review candidates, not automatic deletions. Different properties can be close together and share generic names."
    ]
    for meters,a,b in near_name_pairs[:250]:
        lines.append("- **"+str(a.get("name",""))+"** — "+str(a.get("countryCode",""))+"; "+str(round(meters))+" m apart; "+str(a.get("id") or a.get("osm") or "?")+" ("+str(a.get("lat"))+","+str(a.get("lon"))+") and "+str(b.get("id") or b.get("osm") or "?")+" ("+str(b.get("lat"))+","+str(b.get("lon"))+")")
    if not near_name_pairs: lines.append("- None found.")
    lines.extend(["","## Duplicate city-index review candidates",""])
    for group in sorted(dupcities,key=lambda g:(-len(g),norm(g[0].get("name"))))[:100]:
        c=group[0]
        lines.append("- **"+str(c.get("name",""))+"** — "+str(c.get("countryCode",""))+": "+str(len(group))+" records; coordinates: "+", ".join(str(x.get("lat"))+"/"+str(x.get("lon")) for x in group[:10]))
    if not dupcities: lines.append("- None found.")
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    CITY_SUGGESTIONS.parent.mkdir(parents=True, exist_ok=True)
    with CITY_SUGGESTIONS.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["hostel_id", "hostel_name", "country_code", "hostel_lat", "hostel_lon", "suggested_city", "city_detail", "nearest_distance_km", "review_confidence", "second_nearest_distance_km", "distance_gap_km"])
        for item in city_suggestions:
            h, city_name, detail, km, confidence = item[:5]
            second_km, gap_km = item[5:7] if len(item) > 5 else ("", "")
            writer.writerow([h.get("id") or h.get("osm") or "", h.get("name") or "", h.get("countryCode") or "", h.get("lat") or "", h.get("lon") or "", city_name, detail, km, confidence, second_km, gap_km])
    print("Audit complete. Hostels:",len(hs),"Cities:",len(cs),"same-name groups:",len(dupnames),"duplicate ID groups:",len(dupids),"city suggestions within 50 km:",suggestion_counts["within 50 km"])

if __name__=="__main__": main()
