-- Christopher The Good Gringo: business owner portal (all listing types)
-- Builds on the existing hostel portal: reuses public.portal_admins and public.is_portal_admin().
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------- Ownership claims ----------
create table if not exists public.listing_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text check (char_length(owner_email) <= 200),
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null check (char_length(listing_id) <= 200),
  listing_name text check (char_length(listing_name) <= 200),
  contact_name text check (char_length(contact_name) <= 120),
  contact_phone text check (char_length(contact_phone) <= 60),
  role text check (char_length(role) <= 80),
  evidence_notes text check (char_length(evidence_notes) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists listing_claims_one_approved_owner
  on public.listing_claims (listing_type, listing_id) where status = 'approved';
create index if not exists listing_claims_user_idx on public.listing_claims (user_id);
alter table public.listing_claims enable row level security;

drop policy if exists "Owners submit own claims" on public.listing_claims;
create policy "Owners submit own claims" on public.listing_claims for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null and reviewed_at is null and admin_notes is null);
drop policy if exists "Owners and admins view claims" on public.listing_claims;
create policy "Owners and admins view claims" on public.listing_claims for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_portal_admin()));
drop policy if exists "Admins review claims" on public.listing_claims;
create policy "Admins review claims" on public.listing_claims for update to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));

-- ---------- Update requests (public suggestions and owner edits) ----------
create table if not exists public.listing_edit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  claim_id uuid references public.listing_claims(id) on delete set null,
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null check (char_length(listing_id) <= 200),
  listing_name text check (char_length(listing_name) <= 200),
  proposed_changes jsonb not null check (jsonb_typeof(proposed_changes) = 'object' and pg_column_size(proposed_changes) < 20000),
  contact_name text check (char_length(contact_name) <= 120),
  contact_email text check (char_length(contact_email) <= 200),
  note text check (char_length(note) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);
create index if not exists listing_edit_requests_user_idx on public.listing_edit_requests (user_id);
create index if not exists listing_edit_requests_claim_idx on public.listing_edit_requests (claim_id);
alter table public.listing_edit_requests enable row level security;

drop policy if exists "Anyone suggests updates" on public.listing_edit_requests;
create policy "Anyone suggests updates" on public.listing_edit_requests for insert to anon, authenticated
  with check (
    status = 'pending' and reviewed_by is null and reviewed_at is null and admin_notes is null
    and (user_id is null or user_id = (select auth.uid()))
    and (claim_id is null or exists (
      select 1 from public.listing_claims c
      where c.id = listing_edit_requests.claim_id and c.user_id = (select auth.uid()) and c.status = 'approved'
        and c.listing_type = listing_edit_requests.listing_type and c.listing_id = listing_edit_requests.listing_id))
  );
drop policy if exists "Owners and admins view edit requests" on public.listing_edit_requests;
create policy "Owners and admins view edit requests" on public.listing_edit_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_portal_admin()));
drop policy if exists "Admins review edit requests" on public.listing_edit_requests;
create policy "Admins review edit requests" on public.listing_edit_requests for update to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));

-- ---------- Published changes (read by the public website) ----------
create table if not exists public.published_listing_overrides (
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null,
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  approved_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (listing_type, listing_id)
);
alter table public.published_listing_overrides enable row level security;

drop policy if exists "Public reads published listing changes" on public.published_listing_overrides;
create policy "Public reads published listing changes" on public.published_listing_overrides for select to anon, authenticated using (true);

-- ---------- Tier upgrades ----------
create table if not exists public.listing_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  claim_id uuid not null references public.listing_claims(id) on delete cascade,
  tier text not null check (tier in ('silver','gold','platinum')),
  status text not null default 'pending' check (status in ('pending','paid','approved','cancelled')),
  stripe_reference text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);
create index if not exists listing_upgrade_requests_user_idx on public.listing_upgrade_requests (user_id);
create index if not exists listing_upgrade_requests_claim_idx on public.listing_upgrade_requests (claim_id);
alter table public.listing_upgrade_requests enable row level security;

drop policy if exists "Owners request upgrades" on public.listing_upgrade_requests;
create policy "Owners request upgrades" on public.listing_upgrade_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and stripe_reference is null and reviewed_by is null
    and exists (select 1 from public.listing_claims c
                where c.id = listing_upgrade_requests.claim_id and c.user_id = (select auth.uid()) and c.status = 'approved'));
drop policy if exists "Owners and admins view upgrades" on public.listing_upgrade_requests;
create policy "Owners and admins view upgrades" on public.listing_upgrade_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_portal_admin()));
drop policy if exists "Admins review upgrades" on public.listing_upgrade_requests;
create policy "Admins review upgrades" on public.listing_upgrade_requests for update to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));

-- ---------- Admin actions ----------
-- Only these listing fields can ever be published from an edit request.
create or replace function public.listing_allowed_changes(p jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from jsonb_each(p)
  where key = any (array['description','address','phone','email','website','priceRange','hours',
                         'features','cuisine','drinks','photo','photos','whatsapp','instagram']);
$$;

create or replace function public.admin_publish_listing_edit(p_request_id uuid, p_admin_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.listing_edit_requests;
begin
  if not public.is_portal_admin() then raise exception 'Not allowed'; end if;
  select * into r from public.listing_edit_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Request already reviewed'; end if;
  insert into public.published_listing_overrides (listing_type, listing_id, changes, approved_by, updated_at)
  values (r.listing_type, r.listing_id, public.listing_allowed_changes(r.proposed_changes), auth.uid(), now())
  on conflict (listing_type, listing_id) do update
    set changes = public.published_listing_overrides.changes || excluded.changes,
        approved_by = excluded.approved_by, updated_at = now();
  update public.listing_edit_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_admin_notes
    where id = p_request_id;
end;
$$;

create or replace function public.admin_approve_listing_upgrade(p_request_id uuid, p_admin_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare u public.listing_upgrade_requests; c public.listing_claims;
begin
  if not public.is_portal_admin() then raise exception 'Not allowed'; end if;
  select * into u from public.listing_upgrade_requests where id = p_request_id for update;
  if not found then raise exception 'Upgrade not found'; end if;
  select * into c from public.listing_claims where id = u.claim_id;
  insert into public.published_listing_overrides (listing_type, listing_id, changes, approved_by, updated_at)
  values (c.listing_type, c.listing_id, jsonb_build_object('membershipTier', u.tier), auth.uid(), now())
  on conflict (listing_type, listing_id) do update
    set changes = public.published_listing_overrides.changes || excluded.changes,
        approved_by = excluded.approved_by, updated_at = now();
  update public.listing_upgrade_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_admin_notes
    where id = p_request_id;
end;
$$;

revoke all on function public.admin_publish_listing_edit(uuid, text) from public, anon;
revoke all on function public.admin_approve_listing_upgrade(uuid, text) from public, anon;
grant execute on function public.admin_publish_listing_edit(uuid, text) to authenticated;
grant execute on function public.admin_approve_listing_upgrade(uuid, text) to authenticated;
