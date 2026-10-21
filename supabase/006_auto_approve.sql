-- Christopher The Good Gringo: automatic approvals.
-- * Claims and new businesses go live right away at Bronze, without admin review.
--   (A claim on a business someone else already owns still waits for the admin.)
-- * A paid level picked when claiming or adding is queued for payment and goes live
--   automatically when Stripe confirms it (stripe_activate_upgrade, unchanged).
-- * Instagram is no longer an editable or published listing field.
-- Safe to run more than once.

-- ---------- Fields that can be published from an edit request (no Instagram) ----------
create or replace function public.listing_allowed_changes(p jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from jsonb_each(p)
  where key = any (array['description','address','phone','email','website','priceRange','hours',
                         'features','cuisine','drinks','photo','photos','whatsapp']);
$$;
update public.published_listing_overrides set changes = changes - 'instagram' where changes ? 'instagram';
update public.published_new_listings set data = data - 'instagram' where data ? 'instagram';

-- ---------- Publish a new business (shared by the admin button and automatic approval) ----------
create or replace function public.publish_listing_submission(p_submission_id uuid, p_approver uuid, p_admin_notes text)
returns text language plpgsql security definer set search_path = public as $$
declare s public.listing_submissions; new_id text; claim_id uuid; data jsonb;
begin
  select * into s from public.listing_submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if s.status <> 'pending' then raise exception 'Submission already reviewed'; end if;

  new_id := trim(both '-' from regexp_replace(lower(s.name || '-' || s.city), '[^a-z0-9]+', '-', 'g'))
            || '-' || left(replace(s.id::text, '-', ''), 6);

  data := jsonb_strip_nulls(jsonb_build_object(
    'id', new_id, 'name', s.name, 'city', s.city, 'countryCode', upper(s.country_code), 'countryName', s.country_name,
    'address', s.address, 'website', s.website, 'phone', s.phone, 'description', s.description,
    'cuisine', case when s.listing_type in ('restaurants','street-food') then s.cuisine end,
    'drinks', case when s.listing_type = 'bars' then s.cuisine end,
    'membershipTier', 'bronze', 'verifiedOn', to_char(now(), 'YYYY-MM-DD'), 'ownerSubmitted', true));

  insert into public.published_new_listings (listing_type, listing_id, data, approved_by)
  values (s.listing_type, new_id, data, p_approver);

  insert into public.listing_claims (user_id, owner_email, listing_type, listing_id, listing_name, contact_name, contact_phone,
                                     role, evidence_notes, requested_tier, status, reviewed_by, reviewed_at, admin_notes)
  values (s.user_id, s.owner_email, s.listing_type, new_id, s.name, s.contact_name, s.phone,
          s.role, s.evidence_notes, s.requested_tier, 'approved', p_approver, now(), 'Added as a new business')
  returning id into claim_id;

  if s.requested_tier in ('silver','gold','platinum') then
    insert into public.listing_upgrade_requests (user_id, claim_id, tier, status)
    values (s.user_id, claim_id, s.requested_tier, 'pending');
  end if;

  update public.listing_submissions
    set status = 'approved', created_listing_id = new_id, reviewed_by = p_approver, reviewed_at = now(), admin_notes = p_admin_notes
    where id = p_submission_id;
  return new_id;
end;
$$;
revoke all on function public.publish_listing_submission(uuid, uuid, text) from public, anon, authenticated;

-- The admin button keeps working for anything still waiting.
create or replace function public.admin_approve_listing_submission(p_submission_id uuid, p_admin_notes text default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_portal_admin() then raise exception 'Not allowed'; end if;
  return public.publish_listing_submission(p_submission_id, auth.uid(), p_admin_notes);
end;
$$;

-- ---------- New businesses go live as soon as they are added ----------
create or replace function public.auto_approve_listing_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    begin
      perform public.publish_listing_submission(new.id, null, 'Approved automatically');
    exception when others then
      -- Leave it for the admin if anything goes wrong.
      update public.listing_submissions set admin_notes = 'Could not approve automatically: ' || sqlerrm where id = new.id;
    end;
  end if;
  return null;
end;
$$;
drop trigger if exists listing_submissions_auto_approve on public.listing_submissions;
create trigger listing_submissions_auto_approve after insert on public.listing_submissions
  for each row execute function public.auto_approve_listing_submission();

-- ---------- Claims are approved as soon as they are sent ----------
create or replace function public.auto_approve_listing_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'pending' then return null; end if;
  -- Someone else already runs this listing: the admin decides.
  if exists (select 1 from public.listing_claims c
             where c.listing_type = new.listing_type and c.listing_id = new.listing_id
               and c.status = 'approved' and c.id <> new.id) then
    update public.listing_claims set admin_notes = 'Already claimed by another owner. Needs admin review.' where id = new.id;
    return null;
  end if;
  update public.listing_claims
    set status = 'approved', reviewed_at = now(), admin_notes = 'Approved automatically'
    where id = new.id;
  -- A paid level waits for payment; Stripe makes it live.
  if new.requested_tier in ('silver','gold','platinum') then
    insert into public.listing_upgrade_requests (user_id, claim_id, tier, status)
    values (new.user_id, new.id, new.requested_tier, 'pending');
  end if;
  return null;
end;
$$;
drop trigger if exists listing_claims_auto_approve on public.listing_claims;
create trigger listing_claims_auto_approve after insert on public.listing_claims
  for each row execute function public.auto_approve_listing_claim();

revoke all on function public.auto_approve_listing_claim() from public, anon, authenticated;
revoke all on function public.auto_approve_listing_submission() from public, anon, authenticated;
