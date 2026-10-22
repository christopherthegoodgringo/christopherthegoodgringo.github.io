# Automated Hostel Directory Quality Report

- Clean hostel records: **801**
- Owner-managed listings: **4**
- Source database updated: **2026-10-22**
- Scope: structural data checks; OpenStreetMap coverage may be incomplete and listings are not independently verified.

## Automated checks

| Check | Result | Details |
|---|---|---|
| Clean hostel database loads | PASS | 801 records |
| All 18 approved countries are available in the selector | PASS | 18 approved country codes configured |
| No records outside the approved 18-country scope | PASS | 0 out-of-scope records |
| Clean records have names and valid coordinates | FAIL | 801 invalid records |
| No exact normalized name/city duplicates remain | FAIL | 1 duplicate groups |
| Page loads compact cleaned data | FAIL | clean data endpoint found |
| Paid and free owner listings are merged separately | FAIL | 4 owner listings available |
| Country and city filters are present | PASS | both selectors found |
| English/Spanish toggle is wired | FAIL | bilingual toggle found |
| Booking buttons only link to Hostelworld | FAIL | Hostelworld-only booking link logic found |
| No link to the separate hotel directory | FAIL | directory pages remain separate |

## Clean data coverage by country

| Country code | Listings |
|---|---:|
| AR | 0 |
| BO | 0 |
| BZ | 0 |
| CL | 0 |
| CO | 497 |
| CR | 0 |
| DO | 0 |
| EC | 0 |
| GT | 1 |
| HN | 0 |
| MX | 0 |
| NI | 0 |
| PA | 0 |
| PE | 303 |
| PY | 0 |
| SV | 0 |
| UY | 0 |

**Overall status: FAIL**
