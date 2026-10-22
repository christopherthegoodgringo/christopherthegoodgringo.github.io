# Locked hostel-finder country list

**Owner decision: this list is fixed and must not be changed unless the site owner explicitly asks for a change.**

The hostel finder and weekly OpenStreetMap database audit must include exactly these 17 countries:

1. Mexico (MX)
2. Belize (BZ)
3. Guatemala (GT)
4. Honduras (HN)
5. El Salvador (SV)
6. Nicaragua (NI)
7. Costa Rica (CR)
8. Panama (PA)
9. Argentina (AR)
10. Bolivia (BO)
11. Chile (CL)
12. Colombia (CO)
13. Ecuador (EC)
14. Paraguay (PY)
15. Peru (PE)
16. Uruguay (UY)
17. Dominican Republic (DO)

Venezuela and Cuba are excluded (Christopher removed Cuba from the whole site, Oct 22, 2026). Brazil and all other countries not listed above are excluded.

The weekly database script validates that the country codes in `hostels.html` match its own locked list exactly. If either list is changed or the two lists get out of sync, the weekly update stops with an error rather than silently proceeding.

This is a code-level safeguard, not an absolute GitHub permission lock: someone with repository write access could still edit the files. Any future country-list change requires explicit approval from the site owner.
