-- Christopher The Good Gringo: owners change plans in Stripe's "Manage my plan" page.
-- * Upgrade (e.g. Silver -> Gold): Stripe charges only the difference and the listing moves up right away.
-- * Downgrade: Stripe schedules it for the end of the paid month; the listing moves down then.
-- * Cancel: the plan runs to the end of the paid month, then the listing returns to Bronze
--   (customer.subscription.deleted -> stripe_end_subscription, unchanged).
-- The stripe-webhook function calls this on customer.subscription.updated with the plan's level.
-- Safe to run more than once.

create or replace function public.stripe_change_subscription_tier(p_subscription_id text, p_tier text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.listing_upgrade_requests; c public.listing_claims;
begin
  if p_tier not in ('silver', 'gold', 'platinum') then return jsonb_build_object('result', 'unknown_tier'); end if;
  select * into u from public.listing_upgrade_requests
    where stripe_subscription_id = p_subscription_id and status = 'approved' for update;
  if not found then return jsonb_build_object('result', 'no_matching_plan'); end if;
  if u.tier = p_tier then return jsonb_build_object('result', 'unchanged'); end if;

  select * into c from public.listing_claims where id = u.claim_id;
  insert into public.published_listing_overrides (listing_type, listing_id, changes, approved_by, updated_at)
  values (c.listing_type, c.listing_id, jsonb_build_object('membershipTier', p_tier), null, now())
  on conflict (listing_type, listing_id) do update
    set changes = public.published_listing_overrides.changes || excluded.changes, updated_at = now();

  update public.listing_upgrade_requests
    set admin_notes = coalesce(admin_notes || ' ', '') || 'Changed from ' || u.tier || ' to ' || p_tier || ' in Stripe on ' || to_char(now(), 'YYYY-MM-DD') || '.',
        tier = p_tier
    where id = u.id;
  return jsonb_build_object('result', 'changed', 'from', u.tier, 'to', p_tier);
end;
$$;
revoke all on function public.stripe_change_subscription_tier(text, text) from public, anon, authenticated;
grant execute on function public.stripe_change_subscription_tier(text, text) to service_role;
