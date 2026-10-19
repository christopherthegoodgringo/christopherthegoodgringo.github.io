#!/usr/bin/env python3
"""Read-only audit. Never modifies data/hostels.json."""
import json, math, re, unicodedata
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

def norm(v):
    v=unicodedata.normalize("NFKD",str(v or ""))
    v="".join(c for c in v if not unicodedata.combining(c)).casefold()
    return re.sub(r"\s+"," ",re.sub(r"[.,]"," ",v)).strip()

def valid(lat,lon):
    try:
        lat,lon=float(lat),float(lon)
        return math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180
    except (TypeError,ValueError): return False

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
        if name: namedup[(cc,norm(name),norm(city))].append(h)
    for c in cs:
        cc=str(c.get("countryCode") or "")
        countrycity[cc]+=1
        if norm(c.get("name")):
            citydup[(cc,norm(c.get("name")))].append(c)
    dupids=[v for v in ids.values() if len(v)>1]
    dupnames=[v for v in namedup.values() if len(v)>1]
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
        "- Hostel with invalid/missing coordinates: **"+str(len(bad_h))+"**",
        "- Hostel outside approved countries: **"+str(len(unknown_h))+"**",
        "- Duplicate exact ID groups: **"+str(len(dupids))+"**",
        "- Same normalized name + city + country groups (review only): **"+str(len(dupnames))+"**",
        "- Duplicate normalized city name + country groups: **"+str(len(dupcities))+"**",
        "- City records with invalid/missing coordinates: **"+str(len(bad_c))+"**",
        "- City records outside approved countries: **"+str(len(unknown_c))+"**",
        "","## Mexico City diagnosis","",
        "- Mexico City-like city index records: **"+str(len(mex))+"**",
        "- Hostel records whose city field explicitly names Mexico City: **"+str(len(mexh))+"**",
        mdtable(["City name","Country","Lat","Lon"],[(c.get("name"),c.get("countryCode"),c.get("lat"),c.get("lon")) for c in mex]) if mex else "No Mexico City-like record found.",
        "","## Santa Marta diagnosis","",
        "- Santa Marta city index records in Colombia: **"+str(len(santa))+"**",
        "- Hostel records whose city field explicitly says Santa Marta: **"+str(len(santah))+"**",
        mdtable(["City name","Country","Lat","Lon"],[(c.get("name"),c.get("countryCode"),c.get("lat"),c.get("lon")) for c in santa]) if santa else "No Santa Marta record found.",
        "","## Same-name hostel review candidates",""
    ]
    for group in sorted(dupnames,key=lambda g:(-len(g),norm(g[0].get("name"))))[:100]:
        h=group[0]
        lines.append("- **"+str(h.get("name",""))+"** — "+str(h.get("city") or "(city missing)")+", "+str(h.get("countryCode",""))+": "+str(len(group))+" records; IDs: "+", ".join(str(x.get("id") or x.get("osm") or "?") for x in group[:10]))
    if not dupnames: lines.append("- None found.")
    lines.extend(["","## Duplicate city-index review candidates",""])
    for group in sorted(dupcities,key=lambda g:(-len(g),norm(g[0].get("name"))))[:100]:
        c=group[0]
        lines.append("- **"+str(c.get("name",""))+"** — "+str(c.get("countryCode",""))+": "+str(len(group))+" records; coordinates: "+", ".join(str(x.get("lat"))+"/"+str(x.get("lon")) for x in group[:10]))
    if not dupcities: lines.append("- None found.")
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    print("Audit complete. Hostels:",len(hs),"Cities:",len(cs),"same-name groups:",len(dupnames),"duplicate ID groups:",len(dupids))

if __name__=="__main__": main()
