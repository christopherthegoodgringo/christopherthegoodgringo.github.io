-- Christopher The Good Gringo: site statistics (admin page, Statistics tab).
-- site_events: one row per page view, Finder search, click through to a business, app install or first app open.
-- No names, emails or IP addresses: a visitor is a random id kept in that browser (localStorage gg-visitor).
-- Visitors can only add events through public.track_event(); only admins can read them, through public.site_stats().
-- Events older than 400 days are deleted every night. Safe to run more than once.

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('view','search','click','install','app_open')),
  visitor text check (char_length(visitor) <= 40),
  path text check (char_length(path) <= 200),
  listing text check (char_length(listing) <= 160),
  target text check (char_length(target) <= 20),
  q text check (char_length(q) <= 160),
  ref text check (char_length(ref) <= 100),
  tz text check (char_length(tz) <= 64),
  lang text check (lang in ('en','es')),
  device text check (device in ('phone','tablet','computer')),
  app boolean not null default false
);
create index if not exists site_events_at on public.site_events (at);
create index if not exists site_events_kind_at on public.site_events (kind, at);
alter table public.site_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'site_events' and policyname = 'admins read site events') then
    create policy "admins read site events" on public.site_events for select to authenticated using (public.is_portal_admin());
  end if;
end $$;

create or replace function public.track_event(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k text := p->>'kind';
begin
  if k not in ('view','search','click','install','app_open') then return; end if;
  insert into public.site_events (kind, visitor, path, listing, target, q, ref, tz, lang, device, app)
  values (k, left(p->>'visitor', 40), left(p->>'path', 200), nullif(left(p->>'listing', 160), ''), left(p->>'target', 20),
          nullif(left(p->>'q', 160), ''), nullif(left(p->>'ref', 100), ''), left(p->>'tz', 64),
          case when p->>'lang' = 'es' then 'es' else 'en' end,
          case when p->>'device' in ('phone','tablet','computer') then p->>'device' else null end,
          coalesce((p->>'app')::boolean, false));
exception when others then return; -- statistics must never break the site
end $$;
revoke all on function public.track_event(jsonb) from public;
grant execute on function public.track_event(jsonb) to anon, authenticated;

-- Everything the Statistics tab shows, for the last p_days days (plus the same totals for the period before, to compare).
create or replace function public.site_stats(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d int := greatest(1, least(coalesce(p_days, 30), 400));
  since timestamptz := case when d = 1 then date_trunc('day', now() at time zone 'America/Chicago') at time zone 'America/Chicago' else now() - make_interval(days => d) end;
  prev timestamptz := since - make_interval(days => d);
  r jsonb;
begin
  if not public.is_portal_admin() then raise exception 'not allowed'; end if;
  with e as (select * from public.site_events where at >= since),
       p as (select * from public.site_events where at >= prev and at < since)
  select jsonb_build_object(
    'days', d,
    'totals', jsonb_build_object(
      'views', (select count(*) from e where kind = 'view'),
      'visitors', (select count(distinct visitor) from e where kind = 'view'),
      'searches', (select count(*) from e where kind = 'search'),
      'clicks', (select count(*) from e where kind = 'click'),
      'installs', (select count(*) from e where kind in ('install','app_open')),
      'app_views', (select count(*) from e where kind = 'view' and app),
      'members', (select count(*) from public.members where created_at >= since)),
    'previous', jsonb_build_object(
      'views', (select count(*) from p where kind = 'view'),
      'visitors', (select count(distinct visitor) from p where kind = 'view'),
      'searches', (select count(*) from p where kind = 'search'),
      'clicks', (select count(*) from p where kind = 'click'),
      'installs', (select count(*) from p where kind in ('install','app_open')),
      'members', (select count(*) from public.members where created_at >= prev and created_at < since)),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', k, 'views', n, 'visitors', u) order by k) from (
        select to_char(at at time zone 'America/Chicago', case when d = 1 then 'HH24' else 'YYYY-MM-DD' end) k,
               count(*) n, count(distinct visitor) u
        from e where kind = 'view' group by 1) s), '[]'),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('k', path, 'n', n, 'u', u)) from (
        select path, count(*) n, count(distinct visitor) u from e where kind = 'view' group by path order by n desc limit 15) s), '[]'),
    'refs', coalesce((select jsonb_agg(jsonb_build_object('k', ref, 'n', n)) from (
        select coalesce(ref, '') ref, count(distinct visitor) n from e where kind = 'view' group by 1 order by n desc limit 12) s), '[]'),
    'tz', coalesce((select jsonb_agg(jsonb_build_object('k', tz, 'n', n)) from (
        select coalesce(tz, '') tz, count(distinct visitor) n from e where kind = 'view' group by 1 order by n desc limit 60) s), '[]'),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('k', device, 'n', n)) from (
        select coalesce(device, 'computer') device, count(distinct visitor) n from e where kind = 'view' group by 1 order by n desc) s), '[]'),
    'langs', coalesce((select jsonb_agg(jsonb_build_object('k', lang, 'n', n)) from (
        select coalesce(lang, 'en') lang, count(distinct visitor) n from e where kind = 'view' group by 1 order by n desc) s), '[]'),
    'searches', coalesce((select jsonb_agg(jsonb_build_object('k', q, 'n', n)) from (
        select q, count(*) n from e where kind = 'search' and q is not null group by q order by n desc limit 15) s), '[]'),
    'listings', coalesce((select jsonb_agg(jsonb_build_object('k', listing, 'n', n, 't', t)) from (
        select listing, sum(c) n, jsonb_object_agg(coalesce(target, 'other'), c) t from (
          select listing, coalesce(target, 'other') target, count(*) c from e where kind = 'click' and listing is not null group by listing, coalesce(target, 'other')) z
        group by listing order by sum(c) desc limit 20) s), '[]'),
    'targets', coalesce((select jsonb_agg(jsonb_build_object('k', target, 'n', n)) from (
        select coalesce(target, 'other') target, count(*) n from e where kind = 'click' group by 1 order by n desc) s), '[]')
  ) into r;
  return r;
end $$;
revoke all on function public.site_stats(int) from public;
grant execute on function public.site_stats(int) to authenticated;

-- Nightly clean-up of old events.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'site-events-cleanup';
    perform cron.schedule('site-events-cleanup', '23 4 * * *', $c$delete from public.site_events where at < now() - interval '400 days'$c$);
  end if;
end $$;
