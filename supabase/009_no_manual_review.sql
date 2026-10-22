-- Christopher The Good Gringo: nothing waits for admin review.
-- * A claim on a business that already has an approved owner is turned down automatically
--   (the owner portal tells the person to message us if they believe it is theirs).
-- * A payment made with a discount code goes live automatically (no "paid less" hold).
-- Safe to run more than once.

create or replace function public.stripe_activate_upgrade(p_request_id uuid, p_session_id text, p_subscription_id text, p_customer_id text, p_amount_cents integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare u public.listing_upgrade_requests; c public.listing_claims; old_subs text[];
begin
  select * into u from public.listing_upgrade_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('result', 'unknown_request'); end if;
  if u.status in ('paid', 'approved', 'ended') and u.stripe_reference = p_session_id then
    return jsonb_build_object('result', 'already_done');
  end if;
  select * into c from public.listing_claims where id = u.claim_id;

  -- Paid in Stripe (including with a discount code the site owner created): goes live automatically.
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
        reviewed_at = now(),
        admin_notes = case when coalesce(p_amount_cents, 0) < public.listing_tier_price_cents(u.tier)
                           then 'Paid in Stripe with a discount and went live automatically.'
                           else 'Paid in Stripe and went live automatically.' end
    where id = u.id;
  return jsonb_build_object('result', 'approved', 'tier', u.tier, 'cancel_subscriptions', to_jsonb(old_subs));
end;
$function$;

create or replace function public.auto_approve_listing_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'pending' then return null; end if;
  -- Someone else already runs this listing: turned down automatically; the person can contact the team.
  if exists (select 1 from public.listing_claims c
             where c.listing_type = new.listing_type and c.listing_id = new.listing_id
               and c.status = 'approved' and c.id <> new.id) then
    update public.listing_claims
      set status = 'rejected', reviewed_at = now(), admin_notes = 'This business is already linked to another owner.'
      where id = new.id;
    return null;
  end if;
  update public.listing_claims
    set status = 'approved', reviewed_at = now(), admin_notes = 'Approved automatically'
    where id = new.id;
  -- A paid level waits for payment; Stripe makes it live.
  if new.requested_tier in ('silver','gold','platinum') then
    insert into public.listing_upgrade_requests (user_id, claim_id, tier, status)
    values (new.user_id, new.id, new.requested_tier, 'pending');
  end if;
  return null;
end;
$$;
