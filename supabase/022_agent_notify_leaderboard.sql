-- Christopher The Good Gringo: agent extras (Oct 2026).
-- 1) "You earned a commission!" email: every new agent_commissions row calls the "agents" Edge Function
--    (action notify_commission, x-cron-token = vault agents_cron_token), which emails the agent in their language.
-- 2) Monthly leaderboard for agents and admins: agent_leaderboard() = top agents this month (Colombia time) by paid sales.
-- Safe to run more than once.

alter table public.agent_commissions add column if not exists notified_at timestamptz;

create or replace function public.agent_commission_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://dhkyyhbfybbxczveyvfw.supabase.co/functions/v1/agents',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'agents_cron_token')),
    body := jsonb_build_object('action', 'notify_commission', 'commission_id', new.id),
    timeout_milliseconds := 30000);
  return new;
exception when others then
  raise warning 'agent commission email not queued: %', sqlerrm;
  return new;
end $$;

drop trigger if exists agent_commission_notify on public.agent_commissions;
create trigger agent_commission_notify after insert on public.agent_commissions
  for each row execute function public.agent_commission_notify();

-- Top agents this month: first name + last initial only (no emails or amounts of other agents).
create or replace function public.agent_leaderboard()
returns table (rank integer, agent_name text, country text, sales integer, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota';
begin
  if not (coalesce(public.is_portal_admin(), false) or coalesce(public.is_agent(), false)) then return; end if;
  return query
  with s as (
    select a.id, a.name, a.country, a.user_id, count(k.id)::int as n, min(k.created_at) as first_at
    from public.agents a join public.agent_commissions k on k.agent_id = a.id
    where k.created_at >= since and k.status <> 'cancelled' and a.status = 'active'
    group by a.id
  )
  select (row_number() over (order by s.n desc, s.first_at))::int,
         split_part(trim(s.name), ' ', 1) || coalesce(' ' || nullif(left(split_part(trim(s.name), ' ', 2), 1), '') || '.', ''),
         s.country, s.n, s.user_id = auth.uid()
  from s order by s.n desc, s.first_at limit 10;
end $$;
revoke all on function public.agent_leaderboard() from public, anon;
grant execute on function public.agent_leaderboard() to authenticated;
