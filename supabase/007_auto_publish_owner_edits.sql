-- Christopher The Good Gringo: owners' listing changes go live right away.
-- * An edit sent by the verified owner of a listing (their approved claim on that same listing)
--   is published to the site immediately, with no admin review.
-- * Public "suggest an update" forms (not from the listing's owner) still wait for the admin.
-- * Only the fields an owner may edit are published (public.listing_allowed_changes), and the site
--   still shows only the fields the listing's level includes.
-- Safe to run more than once.

create or replace function public.auto_publish_owner_listing_edit()
returns trigger language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if new.status <> 'pending' or new.user_id is null or new.claim_id is null then return null; end if;

  select exists (
    select 1 from public.listing_claims c
    where c.id = new.claim_id and c.user_id = new.user_id and c.status = 'approved'
      and c.listing_type = new.listing_type and c.listing_id = new.listing_id
  ) into ok;
  if not ok then return null; end if;

  insert into public.published_listing_overrides (listing_type, listing_id, changes, approved_by, updated_at)
  values (new.listing_type, new.listing_id, public.listing_allowed_changes(new.proposed_changes), new.user_id, now())
  on conflict (listing_type, listing_id) do update
    set changes = public.published_listing_overrides.changes || excluded.changes,
        approved_by = excluded.approved_by, updated_at = now();

  update public.listing_edit_requests
    set status = 'approved', reviewed_at = now(), admin_notes = 'Published automatically (verified owner)'
    where id = new.id;
  return null;
end;
$$;

create or replace trigger listing_edit_requests_auto_publish after insert on public.listing_edit_requests
  for each row execute function public.auto_publish_owner_listing_edit();

revoke all on function public.auto_publish_owner_listing_edit() from public, anon, authenticated;
