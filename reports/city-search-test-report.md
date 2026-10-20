# Automated City Search Quality Report

- City index records: **46,538**
- Hostel records: **11,536**
- Scope: static data and search-code integrity; this does not independently verify every location against ground truth or guarantee a hostel exists near every town.

## Automated checks

| Check | Result | Details |
|---|---|---|
| City index loads | PASS | 46,538 records |
| Hostel database loads | PASS | 11,536 records |
| All 18 approved countries represented in city index | PASS | all present |
| Every city has a name | PASS | 0 invalid records |
| Every city has valid numeric coordinates | PASS | 0 invalid records |
| No city records outside approved countries | PASS | 0 outside-country records |
| No duplicate normalized city names within a country | PASS | 0 duplicate groups |
| All distinct city names supported by exact-first autocomplete logic | FAIL | expected autocomplete filtering/sorting code missing |
| Canonical Mexico City and Santa Marta records | PASS | both present once near expected coordinates |
| Panama City fallback is wired into live search | FAIL | fallback code missing |
| Mexico City aliases are wired into search | FAIL | aliases missing |
| Search loads persistent city index | FAIL | persistent index fetch missing |
| Hostel results are limited by distance from selected city | FAIL | distance filter missing |

## City-index coverage by country

| Country code | Cities | Hostel records |
|---|---:|---:|
| AR | 3,156 | 1,312 |
| BO | 4,722 | 581 |
| BZ | 220 | 36 |
| CL | 1,017 | 1,510 |
| CO | 3,344 | 1,372 |
| CR | 410 | 341 |
| CU | 1,300 | 1,016 |
| DO | 729 | 46 |
| EC | 2,060 | 939 |
| GT | 2,085 | 235 |
| HN | 1,251 | 35 |
| MX | 13,630 | 821 |
| NI | 1,395 | 400 |
| PA | 715 | 204 |
| PE | 8,562 | 2,389 |
| PY | 932 | 91 |
| SV | 671 | 87 |
| UY | 339 | 121 |

## Unsearchable city records (first 50)

- search logic: missing exact-first substring filter (0 substring matches)

**Overall status: FAIL**
