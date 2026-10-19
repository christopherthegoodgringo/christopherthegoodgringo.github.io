# Hostel Duplicate Review — Highest-Priority Manual Worksheet

This worksheet isolates same-name candidate pairs whose coordinates are within **1 metre**. It is a review shortlist, **not a deletion instruction**. The original hostel database remains unchanged.

## How to interpret
- Matching name plus nearly identical coordinates suggests a possible duplicate.
- A `node` paired with a `way` can represent two map objects for one property, but the underlying site may use both as listings; verify before any removal.
- Different object IDs do not by themselves prove duplication.
- These candidates need comparison against the source data's URLs, address, phone, description, and source object type before a decision.

## Shortlist (10 pairs)

| # | Hostel | Country | Distance | Record A | Record B | Suggested next check |
|---:|---|:---:|---:|---|---|---|
| 1 | Casa Barby y Arturo | CU | 0.0 m | `node/5501816065` | `node/5555227990` | Compare source tags/details; do not delete yet |
| 2 | Espacio Migrante | MX | 0.0 m | `node/13954289702` | `node/13954302201` | Compare source tags/details; do not delete yet |
| 3 | The Point Hostel | PE | 0.01 m | `node/11984487603` | `node/11986034817` | Compare source tags/details; do not delete yet |
| 4 | Mother Fanny Hostel | EC | 0.01 m | `node/13241921603` | `node/13242245502` | Compare source tags/details; do not delete yet |
| 5 | Sun Island Hostel | EC | 0.02 m | `node/13242224507` | `node/13243139305` | Compare source tags/details; do not delete yet |
| 6 | El chileno | CO | 0.25 m | `node/4740488121` | `way/451481536` | Compare source tags/details; do not delete yet |
| 7 | Hostal Nicarao | NI | 0.62 m | `node/5228355127` | `way/416192150` | Compare source tags/details; do not delete yet |
| 8 | Amanecer de la Bahia | AR | 0.8 m | `node/3185215352` | `node/12286243001` | Compare source tags/details; do not delete yet |
| 9 | Hospedaje TOMMY | PE | 0.99 m | `node/12257198317` | `way/1324561890` | Compare source tags/details; do not delete yet |
| 10 | Hostel Kathmandú | AR | 0.99 m | `node/5131939122` | `node/5131904232` | Compare source tags/details; do not delete yet |

## Decision fields for manual verification

For each pair, record:
1. Same physical property confirmed? (yes / no / uncertain)
2. Source record type relationship (point / building / duplicate import / unknown)
3. Which record has more complete and reliable details?
4. Decision (keep both / merge details / propose removal / needs more evidence)
5. Evidence and reviewer/date.

**Safety rule:** no hostel records have been deleted or changed based on this worksheet. A final correction file should only recommend action when the evidence supports it.
