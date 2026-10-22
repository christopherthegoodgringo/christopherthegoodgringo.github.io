-- Christopher The Good Gringo: free traveler membership (consumer mailing list).
-- members: one row per traveler who joins from the "Become a free member" popup on the Finders.
-- Visitors can only join through public.join_members() (they can't read the list).
-- Admins (public.is_portal_admin()) can view, edit, unsubscribe and delete members.
-- Safe to run more than once.

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  language text not null default 'en' check (language in ('en','es')),
  source text check (char_length(source) <= 60),
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists members_email_key on public.members (lower(email));
alter table public.members enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'members' and policyname = 'admins manage members') then
    create policy "admins manage members" on public.members for all to authenticated
      using (public.is_portal_admin()) with check (public.is_portal_admin());
  end if;
end $$;

-- Join (or re-join) the mailing list. Returns 'joined' for a new member, 'existing' if the email was already on the list.
create or replace function public.join_members(p_name text, p_email text, p_language text default 'en', p_source text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_name text := left(trim(p_name), 120); v_id uuid;
begin
  if v_name is null or v_name = '' then raise exception 'name required'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then raise exception 'invalid email'; end if;
  select id into v_id from public.members where lower(email) = v_email;
  if v_id is not null then
    update public.members set status = 'subscribed', updated_at = now() where id = v_id;
    return 'existing';
  end if;
  insert into public.members (name, email, language, source)
  values (v_name, v_email, case when p_language = 'es' then 'es' else 'en' end, left(p_source, 60));
  return 'joined';
end $$;
revoke all on function public.join_members(text, text, text, text) from public;
grant execute on function public.join_members(text, text, text, text) to anon, authenticated;
