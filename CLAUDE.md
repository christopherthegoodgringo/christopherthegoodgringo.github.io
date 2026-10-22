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
1. New page: add `<script src="/assets/cgg-i18n.js?v=YYYYMMDD (bump it whenever assets/cgg-i18n.js changes)"></script>` right after `<head>` (or
   `<meta charset>`), and give it the same `<footer>` as the other pages (the language toggle goes there).
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
