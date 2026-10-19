# Hostelworld Affiliate Setup

This site is preparing to add tracked Hostelworld booking links. Do not publish guessed tracking URLs or an invented affiliate ID.

## Apply for the official programme

1. Open the official [Hostelworld Affiliate Programme](https://partners.hostelworld.com/).
2. Choose **Sign up today** and create an affiliate account through Partnerize.
3. In Partnerize, open **Campaigns → Join campaigns**, select **Hostelworld** under **Invited & available**, accept the programme terms, and submit the application.
4. Wait for Hostelworld to approve the application.
5. Once approved, copy one official tracking/deep link from the Hostelworld campaign tools and provide that link (or the campaign's documented link format and your affiliate ID) so it can be integrated accurately.

## Important programme notes

- The official programme says joining is free.
- Commission is paid for qualifying completed bookings; the current FAQ describes a 30-day tracking cookie and last-click attribution.
- The programme offers deep links, creatives, feeds, and case-by-case API access. Use only links/assets provided by the approved affiliate account.
- Do not claim a listing is bookable on Hostelworld unless that specific property is verified there.

## Site implementation guardrails

- Keep the existing `data/hostels.json` and `data/cities.json` unchanged while adding affiliate functionality.
- Add booking links only where a valid official tracking link or verified property deep link is available.
- Label affiliate links clearly and add a site-wide disclosure before monetized links go live.
- Keep the current owner request workflow manual; affiliate integration must not alter or publish directory records.
