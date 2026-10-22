// PayPal webhook for Christopher The Good Gringo (Supabase Edge Function "paypal-webhook", JWT verification OFF).
// Every event is checked with PayPal's verify-webhook-signature API (webhook id saved by the "paypal" function's setup).
//   BILLING.SUBSCRIPTION.ACTIVATED  -> owner subscribed: listing goes live at the paid level (stripe_activate_upgrade, custom_id = request id)
//   PAYMENT.SALE.COMPLETED          -> first payment, or a monthly renewal: 15% agent commission (paypal_sale)
//   BILLING.SUBSCRIPTION.UPDATED    -> plan changed: listing level follows the new plan
//   BILLING.SUBSCRIPTION.CANCELLED  -> stays active until the paid month ends (ends_at; hourly job paypal_end_due)
//   BILLING.SUBSCRIPTION.EXPIRED / SUSPENDED -> drops to free now
import { createClient } from "npm:@supabase/supabase-js@2";

function env(n: string) { return (Deno.env.get(n) ?? "").trim().replace(/^["']|["']$/g, "").trim(); }
const MODE = () => env("PAYPAL_MODE") === "sandbox" ? "sandbox" : "live";
const API = () => MODE() === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
const PRICE_CENTS: Record<string, number> = { silver: 999, gold: 1999, platinum: 4999 };

async function ppToken() {
  const r = await fetch(API() + "/v1/oauth2/token", { method: "POST", headers: { Authorization: "Basic " + btoa(env("PAYPAL_CLIENT_ID") + ":" + env("PAYPAL_CLIENT_SECRET")), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const j = await r.json(); if (!r.ok) throw new Error("PayPal token: " + (j.error_description || r.status));
  return j.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const raw = await req.text();
  let event: any; try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
  const cfg = async (k: string) => (await db.from("paypal_config").select("value").eq("key", MODE() + ":" + k).maybeSingle()).data?.value as string | undefined;

  // Check the event really comes from PayPal.
  const webhookId = await cfg("webhook_id");
  if (!webhookId) return new Response("Webhook not set up", { status: 500 });
  const token = await ppToken();
  const h = (n: string) => req.headers.get(n) ?? "";
  const v = await fetch(API() + "/v1/notifications/verify-webhook-signature", {
    method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: `{"auth_algo":${JSON.stringify(h("paypal-auth-algo"))},"cert_url":${JSON.stringify(h("paypal-cert-url"))},"transmission_id":${JSON.stringify(h("paypal-transmission-id"))},"transmission_sig":${JSON.stringify(h("paypal-transmission-sig"))},"transmission_time":${JSON.stringify(h("paypal-transmission-time"))},"webhook_id":${JSON.stringify(webhookId)},"webhook_event":${raw}}`,
  });
  const vj = await v.json();
  if (vj.verification_status !== "SUCCESS") return new Response("Bad signature", { status: 400 });

  const r = event.resource ?? {};
  const tierOfPlan = async (planId: string) => {
    for (const t of ["silver", "gold", "platinum"]) if ((await cfg("plan_" + t)) === planId) return t;
    return null;
  };
  const fail = (e: unknown) => { console.error(e); return new Response("Database error", { status: 500 }); }; // PayPal retries

  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const requestId = r.custom_id;
      if (!requestId) return Response.json({ ignored: "no request id" });
      const tier = await tierOfPlan(r.plan_id);
      const { data, error } = await db.rpc("stripe_activate_upgrade", {
        p_request_id: requestId, p_session_id: r.id, p_subscription_id: r.id, p_customer_id: r.subscriber?.payer_id ?? null,
        p_amount_cents: PRICE_CENTS[tier || ""] ?? 0,
      });
      if (error) return fail(error);
      await db.from("listing_upgrade_requests").update({ provider: "paypal", admin_notes: "Paid with PayPal and went live automatically." }).eq("id", requestId);
      // Older PayPal plans for the same listing (moving up with a new subscription): cancel them so nobody pays twice.
      for (const old of (data?.cancel_subscriptions ?? []) as string[]) {
        if (!old || old === r.id) continue;
        await fetch(API() + "/v1/billing/subscriptions/" + old + "/cancel", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Replaced by a new plan" }) }).catch(() => {});
      }
      return Response.json(data);
    }
    case "PAYMENT.SALE.COMPLETED": {
      const sub = r.billing_agreement_id;
      if (!sub) return Response.json({ ignored: "not a subscription payment" });
      const cents = Math.round(Number(r.amount?.total ?? 0) * 100);
      const { data, error } = await db.rpc("paypal_sale", { p_subscription_id: sub, p_sale_id: r.id, p_amount_cents: cents });
      if (error) return fail(error);
      if (data?.result === "retry") return new Response("Activation not processed yet", { status: 503 });
      return Response.json(data);
    }
    case "BILLING.SUBSCRIPTION.UPDATED": {
      const tier = await tierOfPlan(r.plan_id);
      if (!tier || r.status !== "ACTIVE") return Response.json({ ignored: "no plan change" });
      const { data, error } = await db.rpc("stripe_change_subscription_tier", { p_subscription_id: r.id, p_tier: tier });
      if (error) return fail(error);
      return Response.json(data);
    }
    case "BILLING.SUBSCRIPTION.CANCELLED": {
      const { data: u } = await db.from("listing_upgrade_requests").select("id, ends_at").eq("stripe_subscription_id", r.id).eq("status", "approved").maybeSingle();
      if (!u) return Response.json({ ignored: "nothing active" });
      if (!u.ends_at) {
        const last = r.billing_info?.last_payment?.time ? new Date(r.billing_info.last_payment.time) : new Date();
        const ends = r.billing_info?.next_billing_time || new Date(last.getTime() + 31 * 86400000).toISOString();
        await db.from("listing_upgrade_requests").update({ ends_at: ends }).eq("id", u.id);
      }
      return Response.json({ cancelled: true });
    }
    case "BILLING.SUBSCRIPTION.EXPIRED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      const { data, error } = await db.rpc("stripe_end_subscription", { p_subscription_id: r.id });
      if (error) return fail(error);
      return Response.json(data);
    }
    default:
      return Response.json({ ignored: event.event_type });
  }
});
