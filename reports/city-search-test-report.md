# Automated Hostel Directory Quality Report

- Clean hostel records: **10,904**
- Owner-managed listings: **4**
- Source database updated: **2026-10-19T18:03:38.558527+00:00**
- Scope: structural data checks; OpenStreetMap coverage may be incomplete and listings are not independently verified.

## Automated checks

| Check | Result | Details |
|---|---|---|
| Clean hostel database loads | PASS | 10,904 records |
| All 18 approved countries are available in the selector | PASS | 18 approved country codes configured |
| No records outside the approved 18-country scope | PASS | 0 out-of-scope records |
| Clean records have names and valid coordinates | PASS | 0 invalid records |
| No exact normalized name/city duplicates remain | PASS | 0 duplicate groups |
| Page loads compact cleaned data | PASS | clean data endpoint found |
| Paid and free owner listings are merged separately | PASS | 4 owner listings available |
| Country and city filters are present | PASS | both selectors found |
| English/Spanish toggle is wired | PASS | bilingual toggle found |
| Booking buttons only link to Hostelworld | PASS | Hostelworld-only booking link logic found |
| No link to the separate hotel directory | FAIL | directory pages remain separate |

## Clean data coverage by country

| Country code | Listings |
|---|---:|
| AR | 1,285 |
| BO | 550 |
| BZ | 36 |
| CL | 1,467 |
| CO | 1,330 |
| CR | 338 |
| CU | 961 |
| DO | 44 |
| EC | 895 |
| GT | 229 |
| HN | 34 |
| MX | 800 |
| NI | 388 |
| PA | 200 |
| PE | 2,057 |
| PY | 86 |
| SV | 84 |
| UY | 120 |

**Overall status: FAIL**
