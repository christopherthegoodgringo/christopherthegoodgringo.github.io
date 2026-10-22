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

- Commission-only agents earn 75% of a business's FIRST paid month (Silver $7.49, Gold $14.99, Platinum $37.49; 75% of what
  was actually paid if a discount code was used; nothing for Bronze). Everything is automatic: no review by Christopher.
- Christopher adds agents in the admin "Agents" tab (`assets/cgg-agents.js`): the `agents` Edge Function creates their login
  with a temporary password he sends by WhatsApp/email. Agents sign in on /admin/ and only see Prospecting (their own leads
  plus businesses nobody has contacted; contacting or adding one makes it theirs), "Add a business" (live as Bronze, becomes
  their lead) and "My earnings". Outreach links get `&agent=CODE`.
- Credit: any page stores `?agent=CODE` in localStorage `gg-agent` (assets/cgg-app.js, 90 days, first agent wins); the owner
  portal calls `record_agent_referral()` when the owner signs in (`agent_referrals`, first agent wins per owner account).
- A trigger on `listing_upgrade_requests` records `agent_commissions` when a paid level goes live; payable 14 days later and
  sent daily by pg_cron (`agent-payouts`) through Stripe Connect Express transfers (`agents` function, action pay_now).
  Needs STRIPE_SECRET_KEY with Connect + Transfers permissions and Connect enabled in Stripe. Database: supabase/016_agents.sql.
