-- Christopher The Good Gringo: automatic prospecting emails, sent from Christopher's own mailbox (domain.com).
-- The "prospect-mailer" Edge Function runs every 10 minutes from 9:00 to 10:50 am Colombia time (14:00-15:50 UTC).
-- Each run: checks the inbox for replies (marks them Replied, which stops follow-ups), then sends the first message and
-- the follow-ups that are due (4 days, then 7 days) to businesses in Prospecting that have an email, aren't an agent's
-- lead and haven't replied, claimed or said no. At most daily_limit emails per day (Colombia time).
-- Needs the Edge Function secret EMAIL_PASSWORD (the christopher@christopherthegoodgringo.com mailbox password).
-- Safe to run more than once.

create table if not exists public.prospect_mailer (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  daily_limit integer not null default 75 check (daily_limit between 0 and 300),
  last_run_at timestamptz,
  last_result text,
  last_error text
);
insert into public.prospect_mailer (id) values (1) on conflict (id) do nothing;
alter table public.prospect_mailer enable row level security;
drop policy if exists "admins manage mailer" on public.prospect_mailer;
create policy "admins manage mailer" on public.prospect_mailer for all to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));

create table if not exists public.prospect_emails (
  id bigint generated always as identity primary key,
  listing_type text not null,
  listing_id text not null,
  listing_name text,
  email text not null,
  round integer not null,
  subject text,
  ok boolean not null default true,
  error text,
  sent_at timestamptz not null default now()
);
create index if not exists prospect_emails_sent on public.prospect_emails (sent_at desc);
alter table public.prospect_emails enable row level security;
drop policy if exists "admins read prospect emails" on public.prospect_emails;
create policy "admins read prospect emails" on public.prospect_emails for select to authenticated using ((select public.is_portal_admin()));

-- The scheduled job proves itself to the function with a random token kept in the vault.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'prospect_mailer_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'prospect_mailer_token', 'Lets the scheduled job call prospect-mailer');
  end if;
end $$;
create or replace function public.prospect_mailer_token_ok(p_token text)
returns boolean language sql security definer set search_path = public, vault stable as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'prospect_mailer_token' and decrypted_secret = p_token);
$$;
revoke all on function public.prospect_mailer_token_ok(text) from public, anon, authenticated;
grant execute on function public.prospect_mailer_token_ok(text) to service_role;

select cron.unschedule('prospect-mailer') where exists (select 1 from cron.job where jobname = 'prospect-mailer');
select cron.schedule('prospect-mailer', '*/10 14-15 * * *', $job$
  select net.http_post(
    url := 'https://dhkyyhbfybbxczveyvfw.supabase.co/functions/v1/prospect-mailer',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-mailer-token', (select decrypted_secret from vault.decrypted_secrets where name = 'prospect_mailer_token')),
    body := '{"source":"schedule"}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
