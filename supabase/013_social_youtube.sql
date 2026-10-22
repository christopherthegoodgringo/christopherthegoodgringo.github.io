-- Christopher The Good Gringo: Social media tab (YouTube Shorts).
-- social_posts: each Short, from idea to published, with its YouTube id and latest stats.
-- social_stats: one row per stats check, for the chart.
-- youtube_connection: the connected channel and its refresh token (no policies: only the server can read it).
-- oauth_states: short-lived values that protect the "Connect YouTube" sign-in.
-- Storage bucket social-videos: private; the admin page uploads each video in parts, the youtube-publish
-- function joins them while sending to YouTube, then deletes them.
-- Stats refresh every 6 hours (pg_cron + pg_net call the youtube-stats function with a token kept in Vault).
-- Admins only (public.is_portal_admin()). Safe to run more than once.

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '' check (char_length(title) <= 100),
  description text not null default '' check (char_length(description) <= 5000),
  tags text[] not null default '{}',
  language text not null default 'es' check (language in ('es','en')),
  status text not null default 'idea' check (status in ('idea','draft','review','approved','publishing','scheduled','published','failed')),
  privacy text not null default 'public' check (privacy in ('public','unlisted','private')),
  publish_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  video_name text check (char_length(video_name) <= 300),
  video_type text check (char_length(video_type) <= 100),
  video_size bigint,
  video_parts integer not null default 0,
  youtube_video_id text check (char_length(youtube_video_id) <= 40),
  youtube_status text,
  views bigint, likes bigint, comments bigint,
  stats_updated_at timestamptz,
  published_at timestamptz,
  error text check (char_length(error) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.social_posts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'social_posts' and policyname = 'admins manage social posts') then
    create policy "admins manage social posts" on public.social_posts for all to authenticated
      using (public.is_portal_admin()) with check (public.is_portal_admin());
  end if;
end $$;

create table if not exists public.social_stats (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  checked_at timestamptz not null default now(),
  views bigint, likes bigint, comments bigint
);
create index if not exists social_stats_post_idx on public.social_stats (post_id, checked_at);
alter table public.social_stats enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'social_stats' and policyname = 'admins read social stats') then
    create policy "admins read social stats" on public.social_stats for select to authenticated using (public.is_portal_admin());
  end if;
end $$;

create table if not exists public.youtube_connection (
  id integer primary key default 1 check (id = 1),
  channel_id text, channel_title text, channel_thumbnail text,
  refresh_token text,
  connected_at timestamptz not null default now()
);
alter table public.youtube_connection enable row level security; -- no policies on purpose

create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.oauth_states enable row level security; -- no policies on purpose

-- What the admin page may know about the connection (never the token).
create or replace function public.youtube_status()
returns table (channel_id text, channel_title text, channel_thumbnail text, connected_at timestamptz)
language sql security definer set search_path = public stable as $$
  select c.channel_id, c.channel_title, c.channel_thumbnail, c.connected_at
  from public.youtube_connection c where public.is_portal_admin() and c.refresh_token is not null;
$$;
revoke all on function public.youtube_status() from public;
grant execute on function public.youtube_status() to authenticated;

create or replace function public.youtube_disconnect()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_portal_admin() then raise exception 'admins only'; end if;
  delete from public.youtube_connection;
end $$;
revoke all on function public.youtube_disconnect() from public;
grant execute on function public.youtube_disconnect() to authenticated;

-- Private bucket for videos waiting to go to YouTube (parts of up to 50 MB each).
insert into storage.buckets (id, name, public, file_size_limit)
values ('social-videos', 'social-videos', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'admins manage social videos') then
    create policy "admins manage social videos" on storage.objects for all to authenticated
      using (bucket_id = 'social-videos' and public.is_portal_admin())
      with check (bucket_id = 'social-videos' and public.is_portal_admin());
  end if;
end $$;

-- Scheduled stats refresh.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'youtube_stats_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'youtube_stats_token', 'Lets the scheduled job call youtube-stats');
  end if;
end $$;
-- The youtube-stats function asks the database whether a token is right (server only).
create or replace function public.youtube_stats_token_ok(p_token text)
returns boolean language sql security definer set search_path = public, vault stable as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'youtube_stats_token' and decrypted_secret = p_token);
$$;
revoke all on function public.youtube_stats_token_ok(text) from public, anon, authenticated;
grant execute on function public.youtube_stats_token_ok(text) to service_role;

select cron.unschedule('youtube-stats') where exists (select 1 from cron.job where jobname = 'youtube-stats');
select cron.schedule('youtube-stats', '17 */6 * * *', $job$
  select net.http_post(
    url := 'https://dhkyyhbfybbxczveyvfw.supabase.co/functions/v1/youtube-stats',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-stats-token', (select decrypted_secret from vault.decrypted_secrets where name = 'youtube_stats_token')),
    body := '{"source":"schedule"}'::jsonb,
    timeout_milliseconds := 60000);
$job$);
