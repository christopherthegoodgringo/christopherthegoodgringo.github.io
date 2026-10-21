-- Christopher The Good Gringo: owners can add new businesses and choose a level from the portal.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- Level an owner picked when claiming (from the Business & Sponsorship page).
alter table public.listing_claims add column if not exists requested_tier text
  check (requested_tier in ('bronze','silver','gold','platinum'));

-- ---------- New business submissions ----------
create table if not exists public.listing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text check (char_length(owner_email) <= 200),
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  name text not null check (char_length(name) between 2 and 160),
  country_code text not null check (char_length(country_code) = 2),
  country_name text check (char_length(country_name) <= 80),
  city text not null check (char_length(city) between 2 and 120),
  address text check (char_length(address) <= 300),
  website text check (char_length(website) <= 300),
  phone text check (char_length(phone) <= 60),
  description text check (char_length(description) <= 1500),
  cuisine text check (char_length(cuisine) <= 200),
  contact_name text check (char_length(contact_name) <= 120),
  role text check (char_length(role) <= 80),
  evidence_notes text check (char_length(evidence_notes) <= 2000),
  requested_tier text not null default 'bronze' check (requested_tier in ('bronze','silver','gold','platinum')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_listing_id text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);
create index if not exists listing_submissions_user_idx on public.listing_submissions (user_id);
alter table public.listing_submissions enable row level security;

drop policy if exists "Owners submit new businesses" on public.listing_submissions;
create policy "Owners submit new businesses" on public.listing_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and created_listing_id is null
              and reviewed_by is null and reviewed_at is null and admin_notes is null);
drop policy if exists "Owners and admins view submissions" on public.listing_submissions;
create policy "Owners and admins view submissions" on public.listing_submissions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_portal_admin()));
drop policy if exists "Admins review submissions" on public.listing_submissions;
create policy "Admins review submissions" on public.listing_submissions for update to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));

-- ---------- New businesses published to the site ----------
create table if not exists public.published_new_listings (
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (listing_type, listing_id)
);
alter table public.published_new_listings enable row level security;
drop policy if exists "Public reads new listings" on public.published_new_listings;
create policy "Public reads new listings" on public.published_new_listings for select to anon, authenticated using (true);

-- ---------- Admin: approve a claim (and queue the level they picked) ----------
create or replace function public.admin_approve_listing_claim(p_claim_id uuid, p_admin_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.listing_claims;
begin
  if not public.is_portal_admin() then raise exception 'Not allowed'; end if;
  select * into c from public.listing_claims where id = p_claim_id for update;
  if not found then raise exception 'Claim not found'; end if;
  if c.status <> 'pending' then raise exception 'Claim already reviewed'; end if;
  update public.listing_claims
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_admin_notes
    where id = p_claim_id;
  if c.requested_tier in ('silver','gold','platinum') then
    insert into public.listing_upgrade_requests (user_id, claim_id, tier, status)
    values (c.user_id, c.id, c.requested_tier, 'pending');
  end if;
end;
$$;

-- ---------- Admin: approve a new business ----------
create or replace function public.admin_approve_listing_submission(p_submission_id uuid, p_admin_notes text default null)
returns text language plpgsql security definer set search_path = public as $$
declare s public.listing_submissions; new_id text; claim_id uuid; data jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Not allowed'; end if;
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
  values (s.listing_type, new_id, data, auth.uid());

  insert into public.listing_claims (user_id, owner_email, listing_type, listing_id, listing_name, contact_name, contact_phone,
                                     role, evidence_notes, requested_tier, status, reviewed_by, reviewed_at, admin_notes)
  values (s.user_id, s.owner_email, s.listing_type, new_id, s.name, s.contact_name, s.phone,
          s.role, s.evidence_notes, s.requested_tier, 'approved', auth.uid(), now(), 'Added as a new business')
  returning id into claim_id;

  if s.requested_tier in ('silver','gold','platinum') then
    insert into public.listing_upgrade_requests (user_id, claim_id, tier, status)
    values (s.user_id, claim_id, s.requested_tier, 'pending');
  end if;

  update public.listing_submissions
    set status = 'approved', created_listing_id = new_id, reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_admin_notes
    where id = p_submission_id;
  return new_id;
end;
$$;

revoke all on function public.admin_approve_listing_claim(uuid, text) from public, anon;
revoke all on function public.admin_approve_listing_submission(uuid, text) from public, anon;
grant execute on function public.admin_approve_listing_claim(uuid, text) to authenticated;
grant execute on function public.admin_approve_listing_submission(uuid, text) to authenticated;
