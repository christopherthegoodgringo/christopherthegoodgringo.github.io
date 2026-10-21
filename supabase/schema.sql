-- Christopher The Good Gringo: business owner portal
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------- Admins (you) ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "admins see admins" on public.admins;
create policy "admins see admins" on public.admins for select using (public.is_admin() or user_id = auth.uid());

-- ---------- Ownership claims ----------
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text,
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null check (char_length(listing_id) <= 200),
  listing_name text check (char_length(listing_name) <= 200),
  contact_name text check (char_length(contact_name) <= 120),
  contact_phone text check (char_length(contact_phone) <= 60),
  role text check (char_length(role) <= 80),
  note text check (char_length(note) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists claims_one_approved_owner
  on public.claims (listing_type, listing_id) where status = 'approved';
alter table public.claims enable row level security;

drop policy if exists "owners create claims" on public.claims;
create policy "owners create claims" on public.claims for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "owners and admins read claims" on public.claims;
create policy "owners and admins read claims" on public.claims for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admins update claims" on public.claims;
create policy "admins update claims" on public.claims for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Listing edits / update requests ----------
-- Anyone can suggest an update (user_id empty); verified owners submit edits for their claim.
create table if not exists public.listing_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  claim_id uuid references public.claims(id) on delete set null,
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null check (char_length(listing_id) <= 200),
  listing_name text check (char_length(listing_name) <= 200),
  changes jsonb not null check (pg_column_size(changes) < 20000),
  contact_name text check (char_length(contact_name) <= 120),
  contact_email text check (char_length(contact_email) <= 200),
  note text check (char_length(note) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.listing_edits enable row level security;

drop policy if exists "anyone suggests updates" on public.listing_edits;
create policy "anyone suggests updates" on public.listing_edits for insert to anon, authenticated
  with check (
    status = 'pending'
    and (user_id is null or user_id = auth.uid())
    and (claim_id is null or exists (
      select 1 from public.claims c
      where c.id = claim_id and c.user_id = auth.uid() and c.status = 'approved'
        and c.listing_type = listing_edits.listing_type and c.listing_id = listing_edits.listing_id))
  );
drop policy if exists "owners and admins read edits" on public.listing_edits;
create policy "owners and admins read edits" on public.listing_edits for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admins update edits" on public.listing_edits;
create policy "admins update edits" on public.listing_edits for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Published changes (read by the public website) ----------
create table if not exists public.listing_overrides (
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (listing_type, listing_id)
);
alter table public.listing_overrides enable row level security;

drop policy if exists "public reads published changes" on public.listing_overrides;
create policy "public reads published changes" on public.listing_overrides for select to anon, authenticated using (true);
drop policy if exists "admins write published changes" on public.listing_overrides;
create policy "admins write published changes" on public.listing_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Tier upgrades ----------
create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  claim_id uuid not null references public.claims(id) on delete cascade,
  tier text not null check (tier in ('silver','gold','platinum')),
  status text not null default 'pending' check (status in ('pending','paid','approved','cancelled')),
  stripe_reference text,
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.upgrade_requests enable row level security;

drop policy if exists "owners request upgrades" on public.upgrade_requests;
create policy "owners request upgrades" on public.upgrade_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and exists (
    select 1 from public.claims c where c.id = claim_id and c.user_id = auth.uid() and c.status = 'approved'));
drop policy if exists "owners and admins read upgrades" on public.upgrade_requests;
create policy "owners and admins read upgrades" on public.upgrade_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admins update upgrades" on public.upgrade_requests;
create policy "admins update upgrades" on public.upgrade_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Make yourself the admin ----------
-- 1) Sign in once at https://christopherthegoodgringo.com/owner/ with your email.
-- 2) Then run this line with your email address:
-- insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL@example.com' on conflict do nothing;
