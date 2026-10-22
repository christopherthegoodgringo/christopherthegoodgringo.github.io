// Stripe webhook: makes listing upgrades fully automatic.
// Deployed to Supabase as the "stripe-webhook" Edge Function (JWT verification OFF;
// every request is checked with Stripe's signature instead).
//
// Events to send from Stripe (Developers > Webhooks):
//   checkout.session.completed      -> owner paid: listing goes live at the new tier
//   customer.subscription.updated   -> plan changed in "Manage my plan": listing level follows it
//   customer.subscription.deleted   -> subscription ended: listing drops back to free
//
// Secrets (Supabase > Edge Functions > Secrets):
//   STRIPE_WEBHOOK_SECRET  required. The "Signing secret" (whsec_...) of the webhook.
//   STRIPE_SECRET_KEY      optional. A restricted key with "Subscriptions: Write" only.
//                          When set, an owner's old subscription is cancelled automatically
//                          when they move up a tier, so they are never billed twice.
import { createClient } from "npm:@supabase/supabase-js@2";

const enc = new TextEncoder();

async function validSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(",").map((p) => p.split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // older than 5 minutes
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === expected.length &&
    [...s].reduce((diff, ch, i) => diff | (ch.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0);
}

async function cancelSubscription(id: string, apiKey: string) {
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok && r.status !== 404) console.error("Could not cancel old subscription", id, r.status, await r.text());
}

// Live Stripe prices and products for each level.
const TIER_BY_PRICE: Record<string, string> = {
  "price_1UT9e9L2i5rxKga7cNRDlC3P": "silver",
  "price_1UT9eDL2i5rxKga78DSYKOQl": "gold",
  "price_1UT9eEL2i5rxKga7wA0ZUNya": "platinum",
};
const TIER_BY_PRODUCT: Record<string, string> = {
  "prod_VU7tbm08GTV2hj": "silver",
  "prod_VU7uuSYoEulcGS": "gold",
  "prod_VU7u0T6DSfzmqm": "platinum",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  // Ignore stray spaces, line breaks or quotes from copy and paste.
  const secret = (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim().replace(/^["']|["']$/g, "").trim();
  if (!secret) return new Response("Webhook secret not set", { status: 500 });

  const body = await req.text();
  if (!(await validSignature(body, req.headers.get("Stripe-Signature") ?? "", secret))) {
    return new Response("Bad signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const obj = event.data?.object ?? {};

  if (event.type === "checkout.session.completed") {
    const requestId = obj.client_reference_id;
    if (!requestId || !UUID.test(requestId)) return Response.json({ ignored: "no listing request on this payment" });
    if (obj.payment_status !== "paid" && obj.payment_status !== "no_payment_required") {
      return Response.json({ ignored: "not paid yet" });
    }
    const { data, error } = await db.rpc("stripe_activate_upgrade", {
      p_request_id: requestId,
      p_session_id: obj.id,
      p_subscription_id: typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id ?? null,
      p_customer_id: typeof obj.customer === "string" ? obj.customer : obj.customer?.id ?? null,
      p_amount_cents: obj.amount_total ?? 0,
    });
    if (error) { console.error(error); return new Response("Database error", { status: 500 }); } // Stripe retries
    const apiKey = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim().replace(/^["']|["']$/g, "").trim();
    if (apiKey && Array.isArray(data?.cancel_subscriptions)) {
      for (const id of data.cancel_subscriptions) await cancelSubscription(id, apiKey);
    }
    return Response.json(data);
  }

  if (event.type === "customer.subscription.updated") {
    // The owner switched plans in Stripe's "Manage my plan" page. Upgrades arrive right away;
    // downgrades arrive at the end of the paid month, when Stripe applies them.
    const price = obj.items?.data?.[0]?.price ?? {};
    const tier = TIER_BY_PRICE[String(price.id ?? "")] || TIER_BY_PRODUCT[String(typeof price.product === "string" ? price.product : price.product?.id ?? "")];
    if (!tier) return Response.json({ ignored: "unknown plan" });
    if (obj.status !== "active" && obj.status !== "trialing") return Response.json({ ignored: "plan not active" });
    const { data, error } = await db.rpc("stripe_change_subscription_tier", { p_subscription_id: obj.id, p_tier: tier });
    if (error) { console.error(error); return new Response("Database error", { status: 500 }); }
    return Response.json(data);
  }

  if (event.type === "customer.subscription.deleted") {
    const { data, error } = await db.rpc("stripe_end_subscription", { p_subscription_id: obj.id });
    if (error) { console.error(error); return new Response("Database error", { status: 500 }); }
    return Response.json(data);
  }

  return Response.json({ ignored: event.type });
});
