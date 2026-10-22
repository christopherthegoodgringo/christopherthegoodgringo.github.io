-- Christopher The Good Gringo: commission-only sales agents.
-- * Christopher adds agents in the admin page (Agents tab). They sign in on /admin/ and see only: their own Prospecting
--   leads, "Add a business" and "My earnings".
-- * Each agent has a code (e.g. MARIA). Their outreach links carry ?agent=MARIA; the site remembers it, and when that
--   business owner signs in to the owner portal the owner account is credited to the agent (first agent wins).
-- * When a credited owner's FIRST paid month for a listing goes through Stripe, the agent earns 75% of what was paid
--   (Silver $7.49, Gold $14.99, Platinum $37.49; less if a discount code was used; nothing for free Bronze).
--   It becomes payable 14 days later (refund window) and is sent automatically through Stripe Connect (agents function).
-- * Prospecting: a business nobody has contacted is open to every agent; the first one to contact it (or add it)
--   makes it their lead. Businesses Christopher or another agent contacted are hidden from the others.
-- Safe to run more than once.

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 40),
  country text check (country ~ '^[A-Z]{2}$'),
  language text not null default 'es' check (language in ('es','en')),
  code text not null check (code ~ '^[A-Z0-9]{3,20}$'),
  status text not null default 'active' check (status in ('active','inactive')),
  stripe_account_id text,
  payouts_enabled boolean not null default false,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create unique index if not exists agents_code_key on public.agents (code);
create unique index if not exists agents_email_key on public.agents (lower(email));
alter table public.agents enable row level security;

create or replace function public.my_agent_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.agents where user_id = (select auth.uid()) and status = 'active';
$$;
create or replace function public.is_agent()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agents where user_id = (select auth.uid()) and status = 'active');
$$;
grant execute on function public.my_agent_id() to authenticated;
grant execute on function public.is_agent() to authenticated;

drop policy if exists "admins manage agents" on public.agents;
create policy "admins manage agents" on public.agents for all to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));
drop policy if exists "agents read own row" on public.agents;
create policy "agents read own row" on public.agents for select to authenticated using (user_id = (select auth.uid()));

-- Which agent brought in each business owner account (first agent wins).
create table if not exists public.agent_referrals (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.agent_referrals enable row level security;
drop policy if exists "admins and the agent read referrals" on public.agent_referrals;
create policy "admins and the agent read referrals" on public.agent_referrals for select to authenticated
  using ((select public.is_portal_admin()) or agent_id = (select public.my_agent_id()));
drop policy if exists "admins manage referrals" on public.agent_referrals;
create policy "admins manage referrals" on public.agent_referrals for all to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));

-- Called by the owner portal when someone who arrived through an agent's link is signed in.
create or replace function public.record_agent_referral(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare a public.agents; me uuid := auth.uid();
begin
  if me is null then return 'not_signed_in'; end if;
  select * into a from public.agents where code = upper(trim(coalesce(p_code, ''))) and status = 'active';
  if not found then return 'unknown_code'; end if;
  if a.user_id = me or public.is_portal_admin() or exists (select 1 from public.agents where user_id = me) then return 'not_an_owner'; end if;
  insert into public.agent_referrals (owner_user_id, agent_id) values (me, a.id) on conflict (owner_user_id) do nothing;
  return 'ok';
end $$;
revoke all on function public.record_agent_referral(text) from public;
grant execute on function public.record_agent_referral(text) to authenticated;

-- Commissions: one per listing, for its first paid month.
create table if not exists public.agent_commissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  upgrade_request_id uuid not null unique references public.listing_upgrade_requests(id) on delete cascade,
  claim_id uuid references public.listing_claims(id) on delete set null,
  listing_name text,
  tier text,
  amount_paid_cents integer not null,
  commission_cents integer not null check (commission_cents >= 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  available_at timestamptz not null default (now() + interval '14 days'),
  stripe_transfer_id text,
  paid_at timestamptz,
  error text,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists agent_commissions_agent on public.agent_commissions (agent_id, created_at desc);
alter table public.agent_commissions enable row level security;
drop policy if exists "admins manage commissions" on public.agent_commissions;
create policy "admins manage commissions" on public.agent_commissions for all to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));
drop policy if exists "agents read own commissions" on public.agent_commissions;
create policy "agents read own commissions" on public.agent_commissions for select to authenticated
  using (agent_id = (select public.my_agent_id()));

-- When a paid level goes live (Stripe or by hand), record the agent's commission if this is the listing's first paid month.
create or replace function public.agent_commission_on_upgrade()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref public.agent_referrals; c public.listing_claims; pct numeric := 0.75; amt integer;
begin
  if new.status <> 'approved' or coalesce(new.amount_paid_cents, 0) <= 0 then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then return new; end if;
  select * into ref from public.agent_referrals where owner_user_id = new.user_id;
  if not found then return new; end if;
  if ref.created_at > now() then return new; end if;
  -- Only the first paid month for this listing earns a commission.
  if exists (select 1 from public.listing_upgrade_requests u where u.claim_id = new.claim_id and u.id <> new.id
             and coalesce(u.amount_paid_cents, 0) > 0 and u.status in ('approved','ended') and u.created_at < new.created_at)
     or exists (select 1 from public.agent_commissions k where k.claim_id = new.claim_id and k.status <> 'cancelled') then
    return new;
  end if;
  select * into c from public.listing_claims where id = new.claim_id;
  amt := floor(new.amount_paid_cents * pct);
  if amt <= 0 then return new; end if;
  insert into public.agent_commissions (agent_id, upgrade_request_id, claim_id, listing_name, tier, amount_paid_cents, commission_cents)
  values (ref.agent_id, new.id, new.claim_id, c.listing_name, new.tier, new.amount_paid_cents, amt)
  on conflict (upgrade_request_id) do nothing;
  return new;
exception when others then
  raise warning 'agent commission not recorded: %', sqlerrm; -- never block the upgrade itself
  return new;
end $$;
drop trigger if exists listing_upgrade_agent_commission on public.listing_upgrade_requests;
create trigger listing_upgrade_agent_commission after insert or update of status, amount_paid_cents on public.listing_upgrade_requests
  for each row execute function public.agent_commission_on_upgrade();
revoke all on function public.agent_commission_on_upgrade() from public, anon, authenticated;

-- ---------- Prospecting for agents ----------
alter table public.prospects add column if not exists agent_id uuid references public.agents(id) on delete set null;
create index if not exists prospects_agent on public.prospects (agent_id);

drop policy if exists "agents read own and open prospects" on public.prospects;
create policy "agents read own and open prospects" on public.prospects for select to authenticated
  using (agent_id = (select public.my_agent_id())
         or ((select public.is_agent()) and agent_id is null and status = 'new' and contact_count = 0));
drop policy if exists "agents add own prospects" on public.prospects;
create policy "agents add own prospects" on public.prospects for insert to authenticated
  with check (agent_id = (select public.my_agent_id()));
drop policy if exists "agents update own prospects" on public.prospects;
create policy "agents update own prospects" on public.prospects for update to authenticated
  using (agent_id = (select public.my_agent_id())
         or ((select public.is_agent()) and agent_id is null and status = 'new' and contact_count = 0))
  with check (agent_id = (select public.my_agent_id()));

drop policy if exists "agents read templates" on public.prospect_templates;
create policy "agents read templates" on public.prospect_templates for select to authenticated using ((select public.is_agent()));

-- Businesses an agent can't work on (contacted by Christopher or another agent): only the keys, nothing else.
create or replace function public.prospects_taken()
returns table (listing_type text, listing_id text) language sql stable security definer set search_path = public as $$
  select p.listing_type, p.listing_id from public.prospects p
  where public.is_agent() and p.agent_id is distinct from public.my_agent_id()
    and not (p.agent_id is null and p.status = 'new' and p.contact_count = 0);
$$;
revoke all on function public.prospects_taken() from public;
grant execute on function public.prospects_taken() to authenticated;

-- An agent adds a business: it goes live as Bronze right away (like owner additions) and becomes the agent's lead.
create or replace function public.agent_add_business(p_type text, p_name text, p_country_code text, p_country_name text, p_city text,
  p_address text default null, p_website text default null, p_whatsapp text default null, p_email text default null, p_language text default 'es')
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_agent_id(); new_id text; data jsonb;
begin
  if me is null then raise exception 'Only agents can do this.'; end if;
  if p_type not in ('hotels','hostels','restaurants','bars','street-food') then raise exception 'Pick a type.'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_city), '') = '' or coalesce(p_country_code, '') !~ '^[A-Za-z]{2}$' then
    raise exception 'Name, country and city are required.';
  end if;
  new_id := trim(both '-' from regexp_replace(lower(trim(p_name) || '-' || trim(p_city)), '[^a-z0-9]+', '-', 'g'))
            || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  data := jsonb_strip_nulls(jsonb_build_object(
    'id', new_id, 'name', left(trim(p_name), 200), 'city', left(trim(p_city), 120), 'countryCode', upper(p_country_code),
    'countryName', left(p_country_name, 80), 'address', nullif(left(trim(coalesce(p_address, '')), 300), ''),
    'website', nullif(left(trim(coalesce(p_website, '')), 300), ''),
    'membershipTier', 'bronze', 'verifiedOn', to_char(now(), 'YYYY-MM-DD')));
  insert into public.published_new_listings (listing_type, listing_id, data, approved_by) values (p_type, new_id, data, auth.uid());
  insert into public.prospects (listing_type, listing_id, listing_name, whatsapp, email, language, status, agent_id, updated_at)
  values (p_type, new_id, left(trim(p_name), 200), nullif(left(trim(coalesce(p_whatsapp, '')), 40), ''), nullif(left(trim(coalesce(p_email, '')), 200), ''),
          case when p_language = 'en' then 'en' else 'es' end, 'new', me, now());
  return new_id;
end $$;
revoke all on function public.agent_add_business(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.agent_add_business(text, text, text, text, text, text, text, text, text, text) to authenticated;

-- What an agent sees about themselves (and Christopher sees for everyone): sales and money totals.
create or replace function public.agent_summary(p_agent uuid default null)
returns table (agent_id uuid, referrals bigint, sales bigint, earned_cents bigint, paid_cents bigint, waiting_cents bigint)
language sql stable security definer set search_path = public as $$
  select a.id,
    (select count(*) from public.agent_referrals r where r.agent_id = a.id),
    (select count(*) from public.agent_commissions k where k.agent_id = a.id and k.status <> 'cancelled'),
    (select coalesce(sum(commission_cents), 0) from public.agent_commissions k where k.agent_id = a.id and k.status <> 'cancelled'),
    (select coalesce(sum(commission_cents), 0) from public.agent_commissions k where k.agent_id = a.id and k.status = 'paid'),
    (select coalesce(sum(commission_cents), 0) from public.agent_commissions k where k.agent_id = a.id and k.status = 'pending')
  from public.agents a
  where (public.is_portal_admin() and (p_agent is null or a.id = p_agent)) or a.id = public.my_agent_id();
$$;
revoke all on function public.agent_summary(uuid) from public;
grant execute on function public.agent_summary(uuid) to authenticated;

-- Agents can see the names of businesses credited to them (for "My earnings"), nothing else about the owner.
create or replace function public.my_referred_businesses()
returns table (listing_name text, listing_type text, tier text, since timestamptz)
language sql stable security definer set search_path = public as $$
  select c.listing_name, c.listing_type,
         coalesce((select o.changes->>'membershipTier' from public.published_listing_overrides o
                   where o.listing_type = c.listing_type and o.listing_id = c.listing_id), 'bronze'),
         c.created_at
  from public.agent_referrals r join public.listing_claims c on c.user_id = r.owner_user_id and c.status = 'approved'
  where r.agent_id = public.my_agent_id()
  order by c.created_at desc limit 200;
$$;
revoke all on function public.my_referred_businesses() from public;
grant execute on function public.my_referred_businesses() to authenticated;

-- ---------- Daily automatic payouts (agents function, 10:41 UTC) ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'agents_cron_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'agents_cron_token', 'Lets the daily job call the agents function');
  end if;
end $$;
create or replace function public.agents_cron_token_ok(p_token text)
returns boolean language sql security definer set search_path = public, vault stable as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'agents_cron_token' and decrypted_secret = p_token);
$$;
revoke all on function public.agents_cron_token_ok(text) from public, anon, authenticated;
grant execute on function public.agents_cron_token_ok(text) to service_role;
select cron.unschedule('agent-payouts') where exists (select 1 from cron.job where jobname = 'agent-payouts');
select cron.schedule('agent-payouts', '41 10 * * *', $job$
  select net.http_post(
    url := 'https://dhkyyhbfybbxczveyvfw.supabase.co/functions/v1/agents',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'agents_cron_token')),
    body := '{"action":"pay_now"}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

-- Agents' Prospecting hides businesses that already have an owner: only the keys, nothing about the owner.
create or replace function public.claimed_listing_keys()
returns table (listing_type text, listing_id text) language sql stable security definer set search_path = public as $$
  select c.listing_type, c.listing_id from public.listing_claims c
  where c.status = 'approved' and (public.is_agent() or public.is_portal_admin());
$$;
revoke all on function public.claimed_listing_keys() from public;
grant execute on function public.claimed_listing_keys() to authenticated;
