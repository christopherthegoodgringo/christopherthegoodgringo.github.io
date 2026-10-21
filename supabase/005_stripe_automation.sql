-- Christopher The Good Gringo: automatic Stripe upgrades.
-- The "stripe-webhook" Edge Function calls these two functions. Only the service role
-- (the Edge Function) can run them; owners and the public cannot.
-- Safe to run more than once.

alter table public.listing_upgrade_requests add column if not exists stripe_subscription_id text;
alter table public.listing_upgrade_requests add column if not exists stripe_customer_id text;
alter table public.listing_upgrade_requests add column if not exists amount_paid_cents integer;
alter table public.listing_upgrade_requests add column if not exists ended_at timestamptz;
create index if not exists listing_upgrade_requests_sub_idx on public.listing_upgrade_requests (stripe_subscription_id);

-- Add 'ended' for subscriptions that were cancelled or stopped paying.
alter table public.listing_upgrade_requests drop constraint if exists listing_upgrade_requests_status_check;
alter table public.listing_upgrade_requests add constraint listing_upgrade_requests_status_check
  check (status in ('pending','paid','approved','cancelled','ended'));

-- Monthly price of each tier in cents. A payment below this is held for manual review.
create or replace function public.listing_tier_price_cents(p_tier text)
returns integer language sql immutable as $$
  select case p_tier when 'silver' then 999 when 'gold' then 1999 when 'platinum' then 4999 end;
$$;

-- Called when Stripe confirms a checkout. Returns what happened, plus any older
-- subscription for the same listing that should now be cancelled.
create or replace function public.stripe_activate_upgrade(
  p_request_id uuid, p_session_id text, p_subscription_id text, p_customer_id text, p_amount_cents integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.listing_upgrade_requests; c public.listing_claims; old_subs text[];
begin
  select * into u from public.listing_upgrade_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('result', 'unknown_request'); end if;
  -- Stripe can send the same event twice; only act once.
  if u.status in ('paid', 'approved', 'ended') and u.stripe_reference = p_session_id then
    return jsonb_build_object('result', 'already_done');
  end if;
  select * into c from public.listing_claims where id = u.claim_id;

  if coalesce(p_amount_cents, 0) < public.listing_tier_price_cents(u.tier) then
    update public.listing_upgrade_requests
      set status = 'paid', stripe_reference = p_session_id, stripe_subscription_id = p_subscription_id,
          stripe_customer_id = p_customer_id, amount_paid_cents = p_amount_cents,
          admin_notes = 'Paid less than the ' || u.tier || ' price. Check in Stripe, then approve by hand.'
      where id = u.id;
    return jsonb_build_object('result', 'held_for_review');
  end if;

  -- Older paid subscriptions for this same listing (e.g. Gold before moving to Platinum).
  select coalesce(array_agg(stripe_subscription_id), '{}') into old_subs
    from public.listing_upgrade_requests
    where claim_id = u.claim_id and id <> u.id and status = 'approved' and stripe_subscription_id is not null;
  update public.listing_upgrade_requests set status = 'ended', ended_at = now(),
         admin_notes = coalesce(admin_notes || ' ', '') || 'Replaced by a ' || u.tier || ' upgrade.'
    where claim_id = u.claim_id and id <> u.id and status = 'approved' and stripe_subscription_id is not null;

  insert into public.published_listing_overrides (listing_type, listing_id, changes, approved_by, updated_at)
  values (c.listing_type, c.listing_id, jsonb_build_object('membershipTier', u.tier), null, now())
  on conflict (listing_type, listing_id) do update
    set changes = public.published_listing_overrides.changes || excluded.changes, updated_at = now();

  update public.listing_upgrade_requests
    set status = 'approved', stripe_reference = p_session_id, stripe_subscription_id = p_subscription_id,
        stripe_customer_id = p_customer_id, amount_paid_cents = p_amount_cents,
        reviewed_at = now(), admin_notes = 'Paid in Stripe and went live automatically.'
    where id = u.id;
  return jsonb_build_object('result', 'approved', 'tier', u.tier, 'cancel_subscriptions', to_jsonb(old_subs));
end;
$$;

-- Called when a subscription ends (cancelled, or Stripe gave up after failed payments).
create or replace function public.stripe_end_subscription(p_subscription_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.listing_upgrade_requests; c public.listing_claims; cur text;
begin
  select * into u from public.listing_upgrade_requests
    where stripe_subscription_id = p_subscription_id and status in ('approved', 'paid') for update;
  if not found then return jsonb_build_object('result', 'nothing_to_end'); end if;
  update public.listing_upgrade_requests
    set status = 'ended', ended_at = now(),
        admin_notes = coalesce(admin_notes || ' ', '') || 'Subscription ended in Stripe.'
    where id = u.id;
  if u.status <> 'approved' then return jsonb_build_object('result', 'ended'); end if;

  -- Drop the listing back to the free tier, but only if it is still on the tier this
  -- subscription paid for (so a tier you set by hand is never touched).
  select * into c from public.listing_claims where id = u.claim_id;
  select changes->>'membershipTier' into cur from public.published_listing_overrides
    where listing_type = c.listing_type and listing_id = c.listing_id;
  if cur = u.tier then
    update public.published_listing_overrides
      set changes = changes || jsonb_build_object('membershipTier', 'bronze'), updated_at = now()
      where listing_type = c.listing_type and listing_id = c.listing_id;
    return jsonb_build_object('result', 'downgraded');
  end if;
  return jsonb_build_object('result', 'ended');
end;
$$;

revoke all on function public.stripe_activate_upgrade(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.stripe_end_subscription(text) from public, anon, authenticated;
grant execute on function public.stripe_activate_upgrade(uuid, text, text, text, integer) to service_role;
grant execute on function public.stripe_end_subscription(text) to service_role;
