# Hostel Duplicate Review — First-Pass Triage

Generated from `reports/hostel-duplicate-review.csv`. This is a review aid only; it does not modify or delete listings.

## Overview
- Candidate pairs: **238**
- Same-name pairs within 10 metres (high-priority bucket): **59**
- Pairs at exactly the same coordinates: **2**
- Pairs involving generic "Unnamed hostel" records: **98**
- Records appearing in more than one candidate pair: **72** (these may form clusters, so review as a group rather than pair-by-pair)

**Important:** Close coordinates and matching names are strong signals, not proof. Separate properties can share names, and mapping data can contain a point plus a building footprint for the same property. No automatic deletions or database changes were made.

## First-pass review order

1. **Exact-coordinate pairs** — strongest initial candidates; still verify object type and source details.
2. **Same-name pairs within 1 metre** — very likely duplicate mapping records in many cases, but verify before action.
3. **Repeated-ID clusters** — inspect all records together to avoid removing multiple legitimate records.
4. **Generic "Unnamed hostel" pairs** — low confidence based on name alone; do not prioritize for deletion.
5. **Pairs 10–100 metres apart** — lower confidence; may be separate properties or nearby mapping objects.

## Highest-priority sample

| Name | Country | Distance | Record A | Record B | Initial note |
|---|---:|---:|---|---|---|
| Casa Barby y Arturo | CU | 0.0 m | `node/5501816065` | `node/5555227990` | Exact same coordinates; verify object/source details |
| Espacio Migrante | MX | 0.0 m | `node/13954289702` | `node/13954302201` | Exact same coordinates; verify object/source details |
| The Point Hostel | PE | 0.01 m | `node/11984487603` | `node/11986034817` | Within 1 m; strong candidate, verify before action |
| Mother Fanny Hostel | EC | 0.01 m | `node/13241921603` | `node/13242245502` | Within 1 m; strong candidate, verify before action |
| Sun Island Hostel | EC | 0.02 m | `node/13242224507` | `node/13243139305` | Within 1 m; strong candidate, verify before action |
| El chileno | CO | 0.25 m | `node/4740488121` | `way/451481536` | Within 1 m; strong candidate, verify before action |
| Hostal Nicarao | NI | 0.62 m | `node/5228355127` | `way/416192150` | Within 1 m; strong candidate, verify before action |
| Amanecer de la Bahia | AR | 0.8 m | `node/3185215352` | `node/12286243001` | Within 1 m; strong candidate, verify before action |
| Hospedaje TOMMY | PE | 0.99 m | `node/12257198317` | `way/1324561890` | Within 1 m; strong candidate, verify before action |
| Hostel Kathmandú | AR | 0.99 m | `node/5131939122` | `node/5131904232` | Within 1 m; strong candidate, verify before action |
| Alojamiento Aidyn | AR | 1.02 m | `node/6949373841` | `way/819529773` | Within 10 m; compare record types and details |
| Hostal La Buena Onda | NI | 1.09 m | `node/1884572322` | `way/428808508` | Within 10 m; compare record types and details |
| Caza azul | MX | 1.16 m | `node/6268928885` | `node/6268928985` | Within 10 m; compare record types and details |
| Vintage Hill | BO | 1.2 m | `node/12350695559` | `way/672282117` | Within 10 m; compare record types and details |
| Mia Hostel | PE | 1.34 m | `node/12925884582` | `node/13022797702` | Within 10 m; compare record types and details |
| Atawkama | PE | 1.37 m | `node/4223817491` | `node/7075559185` | Within 10 m; compare record types and details |
| Hospedaje la Madre | CL | 1.8 m | `node/13451268897` | `node/13610211301` | Within 10 m; compare record types and details |
| Albergue Provincial N°5009 | AR | 2.25 m | `node/2910161344` | `way/1441491235` | Within 10 m; compare record types and details |
| Hostal Don Moises | BO | 2.41 m | `node/12350695550` | `way/1334854720` | Within 10 m; compare record types and details |
| Hostal Miguelina | BO | 2.56 m | `node/13384559134` | `node/13387532401` | Within 10 m; compare record types and details |
| Hospedaje La Picada De Tranquilo | CL | 2.76 m | `node/6895838086` | `node/6953056122` | Within 10 m; compare record types and details |
| Blue House Hostel | EC | 2.84 m | `node/4371978607` | `way/424968337` | Within 10 m; compare record types and details |
| Villa Mary | CO | 3.25 m | `node/4849658721` | `way/626080390` | Within 10 m; compare record types and details |
| Hostel Buenos Aires | AR | 3.6 m | `node/5246363523` | `node/5267784521` | Within 10 m; compare record types and details |
| Hostel Medellin Salsa | CO | 4.14 m | `node/6458640588` | `node/6580372985` | Within 10 m; compare record types and details |
| Granada Hostel | CO | 4.18 m | `node/7068031785` | `node/7213081285` | Within 10 m; compare record types and details |
| Starfish of Paracas | PE | 4.52 m | `node/11842469369` | `node/11950861569` | Within 10 m; compare record types and details |
| Granada Hostel | CO | 4.62 m | `node/7098962585` | `node/7180016888` | Within 10 m; compare record types and details |
| El Hostal Bed and Breakfast | GT | 4.7 m | `node/4940378621` | `node/4940378622` | Within 10 m; compare record types and details |
| BoGo Hostel | CO | 4.86 m | `node/4121093589` | `node/4194537241` | Within 10 m; compare record types and details |

## Repeated-record clusters to review together

| Record ID | Candidate-pair count |
|---|---:|
| `way/1347793897` | 4 |
| `way/1347793898` | 4 |
| `way/1347793899` | 4 |
| `way/954760763` | 4 |
| `way/1347793891` | 4 |
| `node/6941335625` | 4 |
| `node/6941335626` | 4 |
| `node/6941335627` | 4 |
| `node/6941335628` | 4 |
| `node/6941335624` | 4 |
| `node/7068031785` | 3 |
| `node/7213081285` | 3 |
| `node/7098962585` | 3 |
| `node/7180016888` | 3 |
| `way/435508107` | 3 |
| `way/435508108` | 3 |
| `node/6941253073` | 3 |
| `node/6941253074` | 3 |
| `node/6941253075` | 3 |
| `way/672265929` | 3 |
| `way/1195939666` | 3 |
| `way/1195939670` | 3 |
| `way/435508109` | 3 |
| `way/435508110` | 3 |
| `way/1195939662` | 3 |
| `way/1333489987` | 3 |
| `way/1195939658` | 3 |
| `way/1327346534` | 3 |
| `node/6941253076` | 3 |
| `way/1327346536` | 3 |

## Safe next step
Review the exact-coordinate and sub-1-metre pairs against the source records and the live hostel data, then prepare a separate **proposed corrections file** with an explicit keep/remove recommendation and reason for each pair. The public database should remain unchanged until each proposed deletion is confirmed.
