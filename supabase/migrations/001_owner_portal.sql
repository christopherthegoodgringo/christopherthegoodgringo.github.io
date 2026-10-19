-- Good Gringo Hostel Owner Portal: initial secure schema
-- Safe to run in a new Supabase project. Does not modify public hostel/city JSON data.
-- All owner claims and edit requests remain private and pending until an admin reviews them.

create table if not exists public.portal_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.hostel_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hostel_id text not null,
  hostel_name text not null,
  country text not null,
  city text not null,
  contact_email text not null,
  evidence_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hostel_claims_user_id_idx on public.hostel_claims(user_id);
create index if not exists hostel_claims_hostel_id_idx on public.hostel_claims(hostel_id);
create index if not exists hostel_claims_status_idx on public.hostel_claims(status);

create table if not exists public.hostel_edit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hostel_id text not null,
  proposed_changes jsonb not null
    check (jsonb_typeof(proposed_changes) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

create index if not exists hostel_edit_requests_user_id_idx on public.hostel_edit_requests(user_id);
create index if not exists hostel_edit_requests_hostel_id_idx on public.hostel_edit_requests(hostel_id);
create index if not exists hostel_edit_requests_status_idx on public.hostel_edit_requests(status);

-- Use a security-definer helper so RLS policies can safely check admin membership
-- without exposing the admin roster or recursing into its own policy.
create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.portal_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_portal_admin() from public;
grant execute on function public.is_portal_admin() to authenticated;

alter table public.portal_admins enable row level security;
alter table public.hostel_claims enable row level security;
alter table public.hostel_edit_requests enable row level security;

-- Admin roster is not public. Admins may view it; adding/removing admins is reserved
-- for the project owner through the Supabase SQL Editor.
drop policy if exists "Admins can view portal admins" on public.portal_admins;
create policy "Admins can view portal admins"
  on public.portal_admins for select to authenticated
  using ((select public.is_portal_admin()));

-- Owners can submit claims for their own account and see only their own requests.
-- They cannot approve claims or change review status.
drop policy if exists "Users can submit own hostel claims" on public.hostel_claims;
create policy "Users can submit own hostel claims"
  on public.hostel_claims for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending'
    and reviewed_by is null and reviewed_at is null and admin_notes is null);

drop policy if exists "Users can view own hostel claims" on public.hostel_claims;
create policy "Users can view own hostel claims"
  on public.hostel_claims for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_portal_admin()));

drop policy if exists "Admins can review hostel claims" on public.hostel_claims;
create policy "Admins can review hostel claims"
  on public.hostel_claims for update to authenticated
  using ((select public.is_portal_admin()))
  with check ((select public.is_portal_admin()));

-- Owners can submit proposed edits and see only their own requests.
-- No direct client policy permits edits to the public directory or changes to review status.
drop policy if exists "Users can submit own hostel edit requests" on public.hostel_edit_requests;
create policy "Users can submit own hostel edit requests"
  on public.hostel_edit_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending'
    and reviewed_by is null and reviewed_at is null and admin_notes is null);

drop policy if exists "Users can view own hostel edit requests" on public.hostel_edit_requests;
create policy "Users can view own hostel edit requests"
  on public.hostel_edit_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_portal_admin()));

drop policy if exists "Admins can review hostel edit requests" on public.hostel_edit_requests;
create policy "Admins can review hostel edit requests"
  on public.hostel_edit_requests for update to authenticated
  using ((select public.is_portal_admin()))
  with check ((select public.is_portal_admin()));

-- No delete policies are provided. No anon/public policies are provided.
-- Paid listing status/payment activation is intentionally not part of this schema.
