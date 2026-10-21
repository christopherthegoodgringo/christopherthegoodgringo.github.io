-- Christopher The Good Gringo: let admins edit, remove and restore any listing directly.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

drop policy if exists "Admins manage published listing changes" on public.published_listing_overrides;
create policy "Admins manage published listing changes" on public.published_listing_overrides
  for all to authenticated
  using ((select public.is_portal_admin()))
  with check ((select public.is_portal_admin()));

drop policy if exists "Admins manage new listings" on public.published_new_listings;
create policy "Admins manage new listings" on public.published_new_listings
  for all to authenticated
  using ((select public.is_portal_admin()))
  with check ((select public.is_portal_admin()));
