-- Christopher The Good Gringo: photo uploads for business listings.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- Public photo folder (anyone can view photos on the site; only approved owners and admins can upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Owners upload into a folder named after their own account; admins can upload anywhere.
drop policy if exists "Approved owners upload listing photos" on storage.objects;
create policy "Approved owners upload listing photos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (
      (select public.is_portal_admin())
      or (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (select 1 from public.listing_claims c where c.user_id = (select auth.uid()) and c.status = 'approved')
      )
    )
  );

drop policy if exists "Owners and admins delete listing photos" on storage.objects;
create policy "Owners and admins delete listing photos" on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_portal_admin()))
  );
