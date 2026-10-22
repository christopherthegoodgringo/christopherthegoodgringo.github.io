# Christopher The Good Gringo website: rules for anyone editing it

## Every change must work in English AND Spanish

The site has an English / Spanish switch on every page (a first-visit popup, plus a toggle in the footer).
Christopher's standing rule: **every new page, section, button, message or listing must be available in both
languages.** No change is finished until its Spanish version is in place.

How the languages work:
- Pages are written in English. `assets/cgg-i18n.js` swaps each English string for its Spanish version
  when the visitor picks Español, including text that scripts add later (search results, messages, forms).
- Spanish text lives in `i18n/es.json` as `"English text": "Spanish text"`.
- Text that is the same in both languages (business names, addresses, people's names, brand names) goes in
  `i18n/keep.json`.
- Text with numbers or names inside it ("4 bars found", "Hostels in Lima") is handled by the patterns
  in `i18n/cgg-i18n.template.js`.
- `assets/cgg-i18n.js` is generated. Never edit it by hand.

Checklist for every change:
1. New page: add `<script src="/assets/cgg-i18n.js?v=YYYYMMDD"></script>` right after `<head>` (or
   `<meta charset>`), and give it the same `<footer>` as the other pages (the language toggle goes there).
   Use the same `?v=` as the other pages, and bump it on every page whenever `assets/cgg-i18n.js` changes.
2. Add a Spanish entry to `i18n/es.json` for every new English string, including button labels,
   placeholders, `alt` / `aria-label` / `title` text, the page `<title>`, and messages scripts show.
   Use natural Latin American Spanish with "tú".
3. Run `python3 i18n/build.py`, then `python3 i18n/check.py`. It must report 0 untranslated strings.
4. Look at the page in Spanish (footer toggle) on phone and desktop before publishing.
5. Never write code that forces the page to English (`document.documentElement.lang = 'en'` or
   `localStorage.setItem('gg-lang', 'en')`). The visitor's choice is stored in `localStorage` key `gg-lang`.

## Membership levels and payments

- Levels: Bronze (free), Silver $9.99/mo, Gold $19.99/mo, Platinum $49.99/mo.
- Listings only get the features of their current level. No Instagram links on listings.
- Payment is by card only (no Cash App or Klarna).
- Free (Bronze) claims and new businesses go live without admin approval. Paid levels go live
  automatically when Stripe confirms payment (Supabase `stripe-webhook` function). Verified owners'
  edits to their listing details go live automatically (Supabase trigger, 007_auto_publish_owner_edits.sql).
- Christopher does not want to review anything: keep every flow automated.
  - A claim on a business that already has an owner is turned down automatically (the person is told to message us).
  - Payments made with a discount code go live automatically.
  - There is no public "suggest an update" form; only a listing's verified owner can change it.

## Prospecting (admin page)

- Outreach messages to businesses are always in Spanish, unless the business asks for English.
  New prospects default to Spanish (`prospects.language` = 'es').
- No mention of the YouTube channel in outreach messages.
- Statuses: Not contacted, WhatsApped, Emailed, WhatsApped and emailed (set automatically by the send
  buttons), Replied and Not interested (set by hand), Claimed (set automatically when they claim).
- Phone numbers found on Google Maps are pasted in by Christopher; don't copy Google Maps data into the database automatically.
- Follow-ups for businesses that don't reply: follow-up 1 is due 4 days after the first message, follow-up 2 is due 7 days
  after that, then they stop (`prospects.stage` 0-3, templates `f1_*` / `f2_*`, supabase/011_prospect_followups.sql).
  Replied, Claimed or Not interested stops follow-ups. The send buttons pick the right message automatically.

## Logo

- The site logo everywhere (header banner, language and welcome popups, placeholder photos, portrait badges) is the
  full "Christopher the Good Gringo™" sticker: `assets/cgg-wordmark.svg`. Use it for any new logo spot.
- The installed apps' icons (home screen, app list, iPhone) also use the full logo: `assets/app/icon-*.png` and
  `assets/app/apple-touch-icon-180.png` (Christopher's choice).
- The square "GG" sticker (`assets/cgg-home-emblem.svg`, `assets/cgg-logo.svg`, `/favicon.svg`, `/favicon-32.png`,
  `/apple-touch-icon.png`) is only for the browser tab icon, where the full logo is too small to read.
- No gold line under the header banner.
- Regenerate them with `scripts/make_logo.py` (lettering is converted to shapes; needs the Fredoka font file).

## Team portraits

- Michael Giacona shows the logo until his real photo is added.
- AI personas (executives and the 108 country team members) are lifelike cartoon portraits drawn by
  `scripts/make_country_avatars.py`; every one is different and matches the person's name (woman or man).

## Social media (admin page, YouTube Shorts)

- Tab "Social media" (`assets/cgg-social.js`): Idea -> Draft -> Ready to review -> Approved -> Post now / Schedule -> Published.
- Videos upload in 40 MB parts to the private `social-videos` bucket (plan limit 50 MB per file); the `youtube-publish`
  Edge Function joins them while uploading to YouTube, then deletes them. A future publish time = uploaded as private with
  `publishAt`, YouTube makes it public by itself.
- `youtube-auth` connects the channel (Google OAuth; secrets YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET; refresh token in
  `youtube_connection`, readable only by the server). `youtube-stats` updates views/likes/comments every 6 hours (pg_cron)
  and from the Refresh stats button. Database: supabase/013_social_youtube.sql. Function code: supabase/functions/.
- Shorts Claude makes: `scripts/shorts/make_short.py spec.json out.mp4` (brand-style animated text scenes, original generated
  music, 1080x1920). The finished file goes in `media/shorts/` (hidden from search via robots.txt) and a `social_posts` row is
  added with `made_by = 'claude'`, `video_url`, status `review`. Christopher approves or taps Request changes
  (status `changes`, his note in `change_request`); Claude makes version + 1 and sets it back to `review`.

## Installable apps (phone, tablet, computer)

- Three apps from the one site, each named with "Christopher The Good Gringo": travelers (`/manifest.webmanifest`, start `/`),
  business owners (`/owner/manifest.webmanifest`, "... for Business"), admin (`/admin/manifest.webmanifest`, "... Admin").
- Every page has, right after the apple-touch-icon link: the manifest link, theme-color #103e2f, the apple/mobile app meta tags
  and `<script src="/assets/cgg-app.js?v=..." defer></script>`. Add these to any new page (owner/admin pages use their own manifest).
- `assets/cgg-app.js` registers `/sw.js` and adds the bilingual "Install the ... app" button under the footer language toggle
  (browser install prompt on Android/computer, "Share -> Add to Home Screen" guide on iPhone/iPad; hidden inside the app).
- `/sw.js`: pages and `/data/` network first (saved copy offline, else `/offline.html`); scripts/styles/images saved copy first.
  Never caches `/media/`, Supabase, Stripe or other sites. Bump `VERSION` in sw.js when changing it.
- Inside the app the language popup only asks once (the footer toggle still switches language).

## Statistics (admin page) and app congratulations

- `assets/cgg-app.js` (on every page) also sends site statistics to `public.track_event()`: page views, Finder searches
  (`form.filters` values), clicks to a business (website, booking, WhatsApp, email, phone, map, More information; not in
  header/footer/nav) and app installs. No names, emails or IPs: a random id in localStorage `gg-visitor`; country comes from the
  device time zone. Only counts on the live domain; admin pages and devices with localStorage `gg-no-stats` = '1' aren't counted
  (set automatically the first time Christopher signs in to admin; checkbox in the Statistics tab). Database:
  supabase/015_site_stats.sql (`site_events`, `site_stats()` admin-only, nightly delete after 400 days).
- Admin tab "Statistics" (`assets/cgg-stats-admin.js`, open directly with /admin/#stats): Today / 7 / 30 / 90 days / 12 months.
- Confetti + "Congratulations!" when the app is installed (Android/computer `appinstalled`) or first opened from the home screen
  (iPhone/iPad), once per app (localStorage `gg-app-celebrated-<site|owner|admin>`).

## Commission agents

- Commission-only agents earn 30% of a business's FIRST paid month (Silver $3.00, Gold $6.00, Platinum $15.00), then 15% of
  EVERY monthly renewal while it keeps paying (Silver $1.50, Gold $3.00, Platinum $7.50); a share of what was actually paid
  if a discount code was used; nothing for Bronze (Christopher's change, Oct 2026; was 75% of the first month only).
  Renewals: Stripe webhook event invoice.paid -> stripe-webhook -> record_agent_renewal() (supabase/020_agent_renewals.sql,
  one commission per invoice, `agent_commissions.kind` first/renewal). Everything is automatic: no review by Christopher.
- Christopher adds agents in the admin "Agents" tab (`assets/cgg-agents.js`): the `agents` Edge Function creates their login
  with a temporary password he sends by WhatsApp/email. Agents sign in on /admin/ and only see Prospecting (their own leads
  plus businesses nobody has contacted; contacting or adding one makes it theirs), "Add a business" (live as Bronze, becomes
  their lead) and "My earnings". Outreach links get `&agent=CODE`.
- Agents tab buttons per agent: Copy their link, Edit details (name, email = their sign-in, phone, country, language, code, notes;
  `agents` action update), New temporary password, Turn off / Turn back on, Delete (action delete: removes the agent, their
  sign-in, referrals and commissions; their prospects go back to the shared list).
- Public agent page `agents.html` (footer on every page: "Become an Agent" + "Agent Login" -> /admin/): explains the program and has
  a self sign-up form (`agents` action signup, no review, works right away, code made from their name). Agent countries
  (sign-up and admin lists, checked on the server): the Latin American countries on the site except Cuba + the United States.
- Credit: any page stores `?agent=CODE` in localStorage `gg-agent` (assets/cgg-app.js, 90 days, first agent wins); the owner
  portal calls `record_agent_referral()` when the owner signs in (`agent_referrals`, first agent wins per owner account).
- A trigger on `listing_upgrade_requests` records the first-month `agent_commissions` when a paid level goes live; each payable 14 days later and
  sent daily by pg_cron (`agent-payouts`) with the PAYPAL Payouts API (`agents` function, action pay_now) to `agents.paypal_email`
  (agents add it in My earnings, action set_paypal; Christopher can edit it). Christopher chose PayPal because Stripe can't pay out to
  most Latin American countries (incl. Colombia). Secrets PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (PAYPAL_MODE=sandbox to test).
  No Cuba agents (PayPal doesn't work there). Database: supabase/016_agents.sql, 020_agent_renewals.sql.

## Automatic prospecting emails

- `prospect-mailer` Edge Function sends from Christopher's own mailbox (Network Solutions Cloud Mail / Open-Xchange: netsol-smtp-oxcs.hostingplatform.com:465, netsol-imap-oxcs.hostingplatform.com:993, stored in `prospect_mailer.smtp_host/imap_host`;
  secret EMAIL_PASSWORD). pg_cron `prospect-mailer` runs every 10 minutes all day, spreading `prospect_mailer.per_hour` (Christopher: 20) evenly, with
  `prospect_mailer.daily_limit` per Colombia day. "Send what's due now" (admin) and `{batch, parts, part, firstOnly}` send everything due at once in parallel parts. It checks the inbox for replies first (marks Replied),
  then sends follow-ups due, then first messages, to Prospecting rows with an email, no agent and status New/WhatsApped/Emailed/Both.
  Every email gets a "reply STOP" line, is saved to the Sent folder and logged in `prospect_emails`.
- Admin Prospecting tab: "Automatic emails" box (on/pause, daily limit, send now, recently sent). Database: supabase/017_prospect_mailer.sql.

## Ebook store (Stripe)

- Ebooks page (`ebooks.html`): 10 covers; the ones for sale show "Available now" + a "Buy now · $9.99" button (a Stripe Payment Link),
  the rest "Coming soon". Every ebook comes as an English AND a Spanish PDF (one purchase = both).
- For sale now: `colombia-on-a-budget` (buy.stripe.com/8x2cN60vZfg16nM0h03oA03), `medellin-like-a-local` (buy.stripe.com/aFaaEY1A33xjaE2fbU3oA04).
  Christopher paused the other 8 ("coming soon"); a Cartagena English draft is in the bucket at src/drafts/.
- Flow: Payment Link (card only, `managed_payments` off, metadata `ebook=<id>`, redirect to `/ebook-download.html?session_id={CHECKOUT_SESSION_ID}`)
  -> `stripe-webhook` (ebook branch, before the listing-upgrade code) records `ebook_orders` and calls `ebook-delivery` (action email)
  -> buyer gets a bilingual email from christopher@ with the download link. The download page calls `ebook-delivery` (action download)
  for 24-hour signed links to `<id>/en.pdf` and `<id>/es.pdf` in the PRIVATE storage bucket `ebooks`. Admin: Statistics tab -> "Ebook sales".
- Database: `ebooks` (id, titles, price, payment link, file paths, active), `ebook_orders` (supabase/019_ebooks.sql). RLS on, no public policies:
  everything goes through the `ebook-delivery` function (JWT off; actions download / email / sales (admins) / import).
- NEVER put ebook PDFs or manuscripts in this repo (it's public). Manuscripts: bucket `ebooks` at `src/<id>.<lang>.md`.
  Build: `python3 scripts/ebooks/build.py SRC OUT <id> <lang>` (pandoc + Playwright, A5, brand cover).
  Publish: `python3 scripts/ebooks/publish.py OUT SRC <id>` encrypts the files and force-pushes them to the temporary branch
  `ebook-transfer`; POST its JSON + `token` (vault `ebook_import_token`) to ebook-delivery action import (from SQL with net.http_post);
  then force-push an empty commit over `ebook-transfer` (the proxy can't delete branches).
  New ebook for sale: create a Payment Link (as above), insert the `ebooks` row (active true), add the Buy button on ebooks.html.
