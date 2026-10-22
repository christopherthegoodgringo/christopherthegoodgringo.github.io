-- Christopher The Good Gringo: new agent commission structure (Christopher, Oct 2026).
--   30% of a business's FIRST paid month (new listing), then 15% of every monthly renewal while the business keeps paying.
-- First payments: trigger agent_commission_on_upgrade (listing_upgrade_requests goes live).
-- Renewals: Stripe invoice.paid -> stripe-webhook -> record_agent_renewal() (one commission per Stripe invoice).
-- Commissions stay payable 14 days after each payment (refund window). Safe to run more than once.

alter table public.agent_commissions add column if not exists kind text not null default 'first';
alter table public.agent_commissions add column if not exists stripe_invoice_id text;
alter table public.agent_commissions add column if not exists rate numeric;
alter table public.agent_commissions drop constraint if exists agent_commissions_upgrade_request_id_key;
alter table public.agent_commissions drop constraint if exists agent_commissions_kind_check;
alter table public.agent_commissions add constraint agent_commissions_kind_check check (kind in ('first','renewal'));
create unique index if not exists agent_commissions_first_once on public.agent_commissions (upgrade_request_id) where kind = 'first';
create unique index if not exists agent_commissions_invoice_once on public.agent_commissions (stripe_invoice_id) where stripe_invoice_id is not null;

-- First paid month for a listing: 30%. A later new checkout for the same listing (e.g. moving up a level): 15%.
create or replace function public.agent_commission_on_upgrade()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref public.agent_referrals; c public.listing_claims; is_first boolean; pct numeric; amt integer;
begin
  if new.status <> 'approved' or coalesce(new.amount_paid_cents, 0) <= 0 then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then return new; end if;
  select * into ref from public.agent_referrals where owner_user_id = new.user_id;
  if not found then return new; end if;
  if exists (select 1 from public.agent_commissions k where k.upgrade_request_id = new.id) then return new; end if;
  is_first := not exists (select 1 from public.listing_upgrade_requests u where u.claim_id = new.claim_id and u.id <> new.id
                and coalesce(u.amount_paid_cents, 0) > 0 and u.status in ('approved','ended') and u.created_at < new.created_at)
          and not exists (select 1 from public.agent_commissions k where k.claim_id = new.claim_id and k.kind = 'first' and k.status <> 'cancelled');
  pct := case when is_first then 0.30 else 0.15 end;
  select * into c from public.listing_claims where id = new.claim_id;
  amt := round(new.amount_paid_cents * pct);
  if amt <= 0 then return new; end if;
  insert into public.agent_commissions (agent_id, upgrade_request_id, claim_id, listing_name, tier, amount_paid_cents, commission_cents, kind, rate)
  values (ref.agent_id, new.id, new.claim_id, c.listing_name, new.tier, new.amount_paid_cents, amt, case when is_first then 'first' else 'renewal' end, pct);
  return new;
exception when others then
  raise warning 'agent commission not recorded: %', sqlerrm; -- never block the upgrade itself
  return new;
end $$;

-- Monthly renewal paid in Stripe: 15% to the agent who brought the business in.
create or replace function public.record_agent_renewal(p_subscription_id text, p_invoice_id text, p_amount_cents integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.listing_upgrade_requests; ref public.agent_referrals; c public.listing_claims; amt integer;
begin
  if coalesce(p_amount_cents, 0) <= 0 or p_subscription_id is null or p_invoice_id is null then return jsonb_build_object('ignored', 'nothing paid'); end if;
  select * into u from public.listing_upgrade_requests where stripe_subscription_id = p_subscription_id order by created_at desc limit 1;
  if not found then return jsonb_build_object('ignored', 'unknown subscription'); end if;
  select * into ref from public.agent_referrals where owner_user_id = u.user_id;
  if not found then return jsonb_build_object('ignored', 'no agent'); end if;
  select * into c from public.listing_claims where id = u.claim_id;
  amt := round(p_amount_cents * 0.15);
  insert into public.agent_commissions (agent_id, upgrade_request_id, claim_id, listing_name, tier, amount_paid_cents, commission_cents, kind, rate, stripe_invoice_id)
  values (ref.agent_id, u.id, u.claim_id, c.listing_name, u.tier, p_amount_cents, amt, 'renewal', 0.15, p_invoice_id)
  on conflict (stripe_invoice_id) where stripe_invoice_id is not null do nothing;
  return jsonb_build_object('commission_cents', amt);
end $$;
revoke all on function public.record_agent_renewal(text, text, integer) from public, anon, authenticated;
grant execute on function public.record_agent_renewal(text, text, integer) to service_role;

-- Agent payouts by PayPal (Christopher, Oct 2026: Stripe can't pay out to most of the Latin American countries).
-- Agents add the email of their PayPal account in My earnings; the agents function (action pay_now) sends each payable
-- commission with the PayPal Payouts API (secrets PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET). payout_ref = PayPal batch id.
alter table public.agents add column if not exists paypal_email text check (paypal_email is null or char_length(paypal_email) <= 254);
alter table public.agent_commissions add column if not exists payout_ref text;
