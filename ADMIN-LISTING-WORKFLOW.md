# Admin-Managed Hostel Listings

The public directory is intentionally managed by the site administrator. There are no owner accounts, owner dashboard, or automatic publishing from owner requests.

## Review owner requests

1. Open [List or Update Hostel](https://christopherthegoodgringo.com/claim-hostel.html).
2. A hostel owner selects whether they want to add a new hostel, claim an existing listing, or correct/update a listing.
3. The form prepares an email to **help@christopherthegoodgringo.com**. The sender must review and send the email from their email app.
4. Review the request and verify that the person is authorized to represent the hostel before changing a listing.
5. Make approved changes manually in `data/hostels.json`. Do not publish unverified ownership claims or unreviewed information.

## Edit a listing

- Locate the correct record in `data/hostels.json`.
- Match by the existing stable `id` or OpenStreetMap URL (`osm`) before editing. Do not identify records by name alone; different hostels can share names.
- Preserve existing records, IDs, coordinates, country/city relationships, and map links unless a verified correction requires a change.
- Update only the approved fields, such as `name`, `city`, `address`, `website`, `phone`, `email`, `description`, or `photoUrls`.
- Keep the city index in `data/cities.json` intact unless a city itself needs a verified correction.

## Feature a listing

Set `listingPlan` on the specific approved hostel record:

- `"free"` (or omit the field): standard listing
- `"featured"`: gold-accented card and Featured label
- `"premium"`: green-accented card and Premium label

Only apply paid-plan labels after the arrangement has been confirmed with the hostel. Payment checkout is not enabled on the website yet.

## Safety and data protection

- Owner submissions do not edit the live directory automatically.
- Never place passwords, private owner documents, API secrets, or payment information in the public JSON files.
- Do not delete possible duplicates automatically. Compare stable IDs and map URLs first, and preserve records unless a specific deletion is verified and approved.
- The old owner portal and its frontend configuration are not used by the public directory.
