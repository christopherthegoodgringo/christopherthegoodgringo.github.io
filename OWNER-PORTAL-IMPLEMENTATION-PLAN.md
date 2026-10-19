# Hostel Owner Portal — Implementation Plan

**Status:** Planning only. No portal authentication or database integration has been enabled yet.
**Owner workflow:** Claim and verify. Owners request control of an existing hostel listing; the site administrator approves before any account can manage it.
**Scope protection:** Keep the existing public directory data intact and preserve the locked 18-country list in `COUNTRY-LIST-LOCK.md`.

## 1. Current site constraints

- The website is a static GitHub Pages site on the custom domain `christopherthegoodgringo.com`.
- Existing hostel and city data lives in `data/hostels.json` and `data/cities.json`; these are public directory datasets, not a secure place for account records, passwords, private owner information, or pending claims.
- The current `claim-hostel.html` form prepares an email. It does not persist requests in a secure database, authenticate users, charge payments, or activate paid plans.
- Repository code search did not find an existing Supabase or Firebase client/auth integration. Confirm this before implementation if new integration files are added.
- The existing directory must continue working for visitors whether or not the owner portal is available.

## 2. Proposed architecture

Keep GitHub Pages for the public website and portal interface, and use a managed backend for secure identity and records. Proposed default: **Supabase Auth + Postgres + Storage**, subject to confirming/creating the project and configuring its credentials.

- Use Supabase Auth for sign-in, email verification, password reset, and sessions.
- Store ownership claims, owner-to-listing permissions, review decisions, edit requests, and audit history in private database tables.
- Apply Row Level Security (RLS) to every exposed table. Owners may read only their own records and submit requests for review; they must not self-approve claims or grant themselves access.
- Store the public Supabase URL and publishable/anon key only in public frontend configuration. Never put a service-role key, database password, admin token, or other secret in this repository.
- Keep the administrator approval path restricted to an explicitly configured administrator identity/role and secure server-side operations or tightly controlled database policies.
- Store owner-uploaded photos in a controlled storage bucket with file type/size limits and authorization policies.
- Do not treat a submitted form, matching email address, or successful sign-in as proof of hostel ownership.

## 3. Claim-and-verify user journey

1. Visitor opens the existing directory and selects **Claim this hostel** on an existing listing.
2. The claim page carries a stable listing identifier (not only the hostel name) into the request.
3. Owner signs in or creates an account and verifies their email.
4. Owner submits their name, work email, role, relationship to the hostel, preferred contact method, and optional evidence. Do not request payment card details.
5. Claim is saved as **Pending review** and a confirmation is shown. Duplicate pending claims for the same user/listing should be handled gracefully.
6. Administrator reviews the request, checks evidence, and chooses Approve or Reject, with a reason/note recorded.
7. Only after approval is the owner-to-listing relationship created. The owner can then open their dashboard for that listing.
8. Rejected or pending claims never unlock editing. Owners can ask for a review or contact the team.
9. Any later listing change is a proposed edit, not a direct write to the public JSON files. Approved changes are published through a controlled process.

## 4. Planned portal pages

- `owner-portal/index.html` — sign in, create account, verify-email and password-reset entry points.
- `owner-portal/claim.html` — claim a listing, show the selected hostel clearly, submit verification details, and show pending/rejected/approved status.
- `owner-portal/dashboard.html` — approved listings, plan status, profile completeness, pending edit requests, and upgrade interest.
- `owner-portal/listing.html` — submit changes to profile fields, links, amenities, and photos for review.
- `owner-portal/admin.html` — administrator-only claim review, owner access management, edit review, and audit history. Do not rely on hiding a link in HTML as security.
- Shared bilingual EN/ES UI, consistent with the existing site language toggle.

Build one small, testable page at a time. These are planned paths, not existing or live pages.

## 5. Initial data model (private backend only)

- `profiles`: auth user ID, display name, preferred language, contact details, created/updated timestamps.
- `hostel_claims`: claim ID, stable existing listing ID, claimant user ID, submitted details, evidence references, status (pending/approved/rejected/withdrawn), reviewer ID, review note, timestamps.
- `hostel_owners`: approved relationship between auth user ID and stable listing ID, role, approved-by, approved-at, revoked-at.
- `listing_edit_requests`: listing ID, requester ID, proposed field changes, moderation status, reviewer, timestamps.
- `listing_media`: owner/listing IDs, storage object path, caption/alt text, moderation status.
- `audit_log`: security-relevant administrative actions and claim/permission state changes.

Use stable IDs from the existing listing data where possible. Before relying on an ID, audit its stability and uniqueness; never identify a listing by its display name alone. Do not add private fields to `data/hostels.json`.

## 6. Plan tiers

Display the existing plan terms consistently:

- **Free:** $0, basic directory listing.
- **Featured:** $19/month, enhanced profile, photos, website/booking links, featured search placement.
- **Premium:** $39/month, includes Featured benefits plus highest priority placement and promotional spotlight.

During the first portal release, show plan and upgrade-request status only. There is no live payment integration today. Do not label a paid plan active, collect card data, or change a listing's ranking because a user selected a plan. Billing and automatic activation belong in a later phase after a payment provider, webhook verification, cancellation/refund handling, and reconciliation are implemented.

## 7. Phased delivery

### Phase 0 — safeguards and setup
- Preserve the existing datasets and the 18-country lock.
- Confirm hosting/provider choice, create the backend project, configure allowed site origins and environment settings.
- Define an administrator identity and recovery process before exposing admin actions.
- Add a backup/export procedure for private portal data.

### Phase 1 — secure account and claim requests
- Add sign-in, email verification, reset flow, and session handling.
- Link a claim to a stable listing ID.
- Save claim submissions to the private backend.
- Add pending/rejected/approved states and administrator review.
- No owner editing and no billing yet.

### Phase 2 — owner dashboard and moderated edits
- Show only listings the authenticated user is approved to manage.
- Submit profile edits and photos for moderation.
- Add audit history and safe publishing so approved changes do not overwrite the complete directory dataset.
- Preserve a rollback path for every published change.

### Phase 3 — listing plans and analytics
- Integrate a payment provider only after the business account and subscription rules are ready.
- Activate paid plans only from verified server-side payment events.
- Add truthful view/click analytics with privacy-conscious retention.
- Add cancellation, failed-payment, refund, and plan-expiry handling.

## 8. Security and acceptance checklist

- [ ] Unauthenticated visitors cannot access owner dashboards or private claims.
- [ ] A newly registered account cannot edit any listing before administrator approval.
- [ ] Owner A cannot read or modify Owner B's claims, photos, requests, or approved listings.
- [ ] A claimant cannot change their own claim status or add their own owner permission.
- [ ] Admin actions are authorized server-side and logged.
- [ ] Input validation, upload size/type restrictions, rate limits, and safe error messages are in place.
- [ ] No secrets or private owner records are committed to GitHub or placed in public JSON.
- [ ] Existing hostel search, city search, and demo records continue to behave as before.
- [ ] Automated checks confirm the exact 18 locked country codes remain unchanged.
- [ ] A test claim can be approved/rejected without changing the live public listing data unexpectedly.
- [ ] Paid plans cannot activate without verified payment confirmation.
- [ ] Test with separate owner accounts and an administrator account before launch.

## 9. First implementation task

Start with **Phase 0 and Phase 1**: verify the stable listing identifiers, set up the managed authentication/database project, define RLS and administrator authorization, and then implement the claim workflow. Do not publish a non-functional sign-in screen or pretend that email-only claims are secure portal accounts.

## Non-goals for the first release

- No changes to the locked 18-country list.
- No destructive deduplication or bulk rewrites of hostel/city data.
- No direct browser-side writes to the public hostel dataset.
- No live billing or automatic paid-plan activation until payment infrastructure is configured and tested.
