-- Christopher The Good Gringo: payments move from Stripe to PayPal (Christopher, Oct 2026).
-- Listings: PayPal subscriptions (plans per tier, ids in paypal_config). The "paypal" Edge Function creates subscriptions,
-- plan changes, cancellations and ebook orders; "paypal-webhook" receives PayPal's events and reuses the existing
-- stripe_activate_upgrade / stripe_change_subscription_tier / stripe_end_subscription functions (the stripe_* columns now
-- hold PayPal ids when provider = 'paypal'). Safe to run more than once.

create table if not exists public.paypal_config (key text primary key, value text not null, updated_at timestamptz not null default now());
alter table public.paypal_config enable row level security; -- no policies: only the server reads it

alter table public.listing_upgrade_requests add column if not exists provider text not null default 'stripe';
alter table public.listing_upgrade_requests add column if not exists first_payment_seen boolean not null default false;
alter table public.listing_upgrade_requests add column if not exists ends_at timestamptz;

-- PAYMENT.SALE.COMPLETED: the first payment of a subscription is the "new listing" payment (agents get 30% through the
-- upgrade trigger); every later one is a renewal (15%, record_agent_renewal). 'retry' = activation not processed yet.
create or replace function public.paypal_sale(p_subscription_id text, p_sale_id text, p_amount_cents integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.listing_upgrade_requests;
begin
  select * into u from public.listing_upgrade_requests where stripe_subscription_id = p_subscription_id
    order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('result', 'retry'); end if;
  if not u.first_payment_seen then
    update public.listing_upgrade_requests set first_payment_seen = true where id = u.id;
    return jsonb_build_object('result', 'first');
  end if;
  return public.record_agent_renewal(p_subscription_id, p_sale_id, p_amount_cents);
end $$;
revoke all on function public.paypal_sale(text, text, integer) from public, anon, authenticated;
grant execute on function public.paypal_sale(text, text, integer) to service_role;

-- A cancelled plan stays active until the month already paid for ends (ends_at), then drops to free.
create or replace function public.paypal_end_due()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select stripe_subscription_id from public.listing_upgrade_requests
           where provider = 'paypal' and status = 'approved' and ends_at is not null and ends_at <= now() loop
    perform public.stripe_end_subscription(r.stripe_subscription_id); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.paypal_end_due() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule('paypal-end-due') where exists (select 1 from cron.job where jobname = 'paypal-end-due');
select cron.schedule('paypal-end-due', '17 * * * *', $$select public.paypal_end_due();$$);
