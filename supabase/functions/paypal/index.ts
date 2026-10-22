// PayPal payments for Christopher The Good Gringo (Supabase Edge Function "paypal", JWT verification OFF: checks callers itself).
// Secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE ("sandbox" to test, anything else = live).
// Actions (POST JSON):
//   { action: "setup", token }              -> admin/Claude: creates the listing product, the Silver/Gold/Platinum monthly plans
//                                              and the webhook (paypal-webhook) once per mode; ids saved in public.paypal_config.
//   { action: "subscribe", request_id }     -> owner (signed in): PayPal subscription for a pending listing_upgrade_request,
//                                              returns the PayPal approval link. custom_id = request id.
//   { action: "change_plan", claim_id, tier } -> owner: move a PayPal plan to another paid tier (approval link) or "bronze" = cancel
//                                              (the level stays until the paid month ends: ends_at).
//   { action: "ebook_order", ebook_id }     -> public: PayPal order for an ebook, returns the approval link.
//   { action: "capture_ebook", order_id }   -> public: after PayPal sends the buyer back, captures the payment, records the order
//                                              (session_id "PP-<order id>") and emails the download link. Returns session_id.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://christopherthegoodgringo.com";
const ORIGINS = [SITE, "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];
const PRICES: Record<string, string> = { silver: "9.99", gold: "19.99", platinum: "49.99" };
const TIER_NAMES: Record<string, string> = { silver: "Silver", gold: "Gold", platinum: "Platinum" };

function env(n: string) { return (Deno.env.get(n) ?? "").trim().replace(/^["']|["']$/g, "").trim(); }
const MODE = () => env("PAYPAL_MODE") === "sandbox" ? "sandbox" : "live";
const API = () => MODE() === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

let cached: { token: string; until: number } | null = null;
async function ppToken() {
  if (cached && cached.until > Date.now()) return cached.token;
  const id = env("PAYPAL_CLIENT_ID"), secret = env("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal isn't connected yet: the PayPal keys still need to be added in Supabase.");
  const r = await fetch(API() + "/v1/oauth2/token", { method: "POST", headers: { Authorization: "Basic " + btoa(id + ":" + secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const j = await r.json();
  if (!r.ok) throw new Error("PayPal didn't accept the keys: " + (j.error_description || j.error || r.status));
  cached = { token: j.access_token, until: Date.now() + (Number(j.expires_in || 300) - 60) * 1000 };
  return cached.token;
}
async function pp(path: string, method = "GET", body?: unknown, extra: Record<string, string> = {}) {
  const r = await fetch(API() + path, { method, headers: { Authorization: "Bearer " + await ppToken(), "Content-Type": "application/json", Prefer: "return=representation", ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); const j = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error((j.details && j.details[0] && (j.details[0].description || j.details[0].issue)) || j.message || j.name || ("PayPal error " + r.status));
  return j;
}
const approveLink = (j: any) => (j.links || []).find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href;

Deno.serve(async (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  const headers = { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : SITE, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const json = (b: unknown, status = 200) => Response.json(b, { status, headers });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: any = {}; try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action || "");
  const cfg = async (k: string) => (await db.from("paypal_config").select("value").eq("key", MODE() + ":" + k).maybeSingle()).data?.value as string | undefined;
  const setCfg = (k: string, v: string) => db.from("paypal_config").upsert({ key: MODE() + ":" + k, value: v, updated_at: new Date().toISOString() });
  async function caller() {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return null;
    const c = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data } = await c.auth.getUser();
    if (!data?.user) return null;
    const { data: isAdmin } = await c.rpc("is_portal_admin");
    return { id: data.user.id, email: data.user.email ?? "", admin: isAdmin === true };
  }

  try {
    if (action === "setup") {
      const who = await caller();
      const { data: tokOk } = body.token ? await db.rpc("ebook_import_token_ok", { p_token: String(body.token) }) : { data: false };
      if (!who?.admin && tokOk !== true) return json({ error: "Admins only" }, 403);
      const done: Record<string, string> = {};
      let product = await cfg("product");
      if (!product) {
        const p = await pp("/v1/catalogs/products", "POST", { name: "Christopher The Good Gringo listing", description: "Monthly business listing on christopherthegoodgringo.com", type: "SERVICE", category: "ONLINE_SERVICES", home_url: SITE }, { "PayPal-Request-Id": "gg-product-" + MODE() });
        product = p.id as string; await setCfg("product", product);
      }
      done.product = product!;
      for (const t of ["silver", "gold", "platinum"]) {
        let plan = await cfg("plan_" + t);
        if (!plan) {
          const p = await pp("/v1/billing/plans", "POST", {
            product_id: product, name: TIER_NAMES[t] + " listing", description: TIER_NAMES[t] + " listing on Christopher The Good Gringo, billed monthly",
            status: "ACTIVE",
            billing_cycles: [{ frequency: { interval_unit: "MONTH", interval_count: 1 }, tenure_type: "REGULAR", sequence: 1, total_cycles: 0, pricing_scheme: { fixed_price: { value: PRICES[t], currency_code: "USD" } } }],
            payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 3 },
          }, { "PayPal-Request-Id": "gg-plan-" + t + "-" + MODE() });
          plan = p.id as string; await setCfg("plan_" + t, plan);
        }
        done["plan_" + t] = plan!;
      }
      let hook = await cfg("webhook_id");
      if (!hook) {
        const h = await pp("/v1/notifications/webhooks", "POST", {
          url: url + "/functions/v1/paypal-webhook",
          event_types: ["BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.UPDATED", "BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED",
            "BILLING.SUBSCRIPTION.SUSPENDED", "PAYMENT.SALE.COMPLETED", "PAYMENT.SALE.REFUNDED"].map((name) => ({ name })),
        });
        hook = h.id as string; await setCfg("webhook_id", hook);
      }
      done.webhook_id = hook!;
      return json({ ok: true, mode: MODE(), ...done });
    }

    if (action === "subscribe") {
      const who = await caller(); if (!who) return json({ error: "Please sign in again." }, 403);
      const { data: u } = await db.from("listing_upgrade_requests").select("id, user_id, tier, status").eq("id", String(body.request_id || "")).maybeSingle();
      if (!u || u.user_id !== who.id) return json({ error: "That upgrade wasn't found." }, 404);
      if (u.status !== "pending") return json({ error: "That upgrade is already paid or cancelled." }, 400);
      const plan = await cfg("plan_" + u.tier); if (!plan) return json({ error: "PayPal plans aren't set up yet." }, 400);
      const s = await pp("/v1/billing/subscriptions", "POST", {
        plan_id: plan, custom_id: u.id, subscriber: who.email ? { email_address: who.email } : undefined,
        application_context: { brand_name: "Christopher The Good Gringo", user_action: "SUBSCRIBE_NOW", shipping_preference: "NO_SHIPPING",
          return_url: SITE + "/owner/?paid=1", cancel_url: SITE + "/owner/?paid=cancelled" },
      }, { "PayPal-Request-Id": "gg-sub-" + u.id });
      await db.from("listing_upgrade_requests").update({ provider: "paypal" }).eq("id", u.id);
      return json({ url: approveLink(s) });
    }

    if (action === "change_plan") {
      const who = await caller(); if (!who) return json({ error: "Please sign in again." }, 403);
      const tier = String(body.tier || "");
      const { data: u } = await db.from("listing_upgrade_requests").select("id, user_id, tier, stripe_subscription_id, provider")
        .eq("claim_id", String(body.claim_id || "")).eq("status", "approved").eq("provider", "paypal").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!u || u.user_id !== who.id || !u.stripe_subscription_id) return json({ error: "No PayPal plan was found for this listing." }, 404);
      if (tier === "bronze") {
        const sub = await pp("/v1/billing/subscriptions/" + u.stripe_subscription_id);
        const { data: had } = await db.from("listing_upgrade_requests").select("ends_at").eq("id", u.id).single();
        const ends = had?.ends_at || sub.billing_info?.next_billing_time || new Date(Date.now() + 30 * 86400000).toISOString();
        // Already cancelled (a second click, or cancelled in PayPal itself): just keep the level until the paid month ends.
        if (sub.status === "ACTIVE" || sub.status === "SUSPENDED") await pp("/v1/billing/subscriptions/" + u.stripe_subscription_id + "/cancel", "POST", { reason: "Cancelled by the owner in the business portal" });
        await db.from("listing_upgrade_requests").update({ ends_at: ends }).eq("id", u.id);
        return json({ cancelled: true, ends_at: ends });
      }
      const plan = await cfg("plan_" + tier); if (!plan) return json({ error: "That level isn't available." }, 400);
      const r = await pp("/v1/billing/subscriptions/" + u.stripe_subscription_id + "/revise", "POST", {
        plan_id: plan, application_context: { brand_name: "Christopher The Good Gringo", shipping_preference: "NO_SHIPPING", return_url: SITE + "/owner/?paid=1", cancel_url: SITE + "/owner/?paid=cancelled" },
      });
      return json({ url: approveLink(r) });
    }

    if (action === "ebook_order") {
      const { data: b } = await db.from("ebooks").select("id, title, price_cents, active").eq("id", String(body.ebook_id || "")).maybeSingle();
      if (!b || !b.active) return json({ error: "That ebook isn't for sale yet." }, 404);
      const o = await pp("/v2/checkout/orders", "POST", {
        intent: "CAPTURE",
        purchase_units: [{ reference_id: b.id, custom_id: b.id, description: b.title + " (ebook, English + Spanish PDF)", amount: { currency_code: "USD", value: (b.price_cents / 100).toFixed(2) } }],
        payment_source: { paypal: { experience_context: { brand_name: "Christopher The Good Gringo", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW",
          return_url: SITE + "/ebook-download.html", cancel_url: SITE + "/ebooks.html" } } },
      });
      return json({ url: approveLink(o) });
    }

    if (action === "capture_ebook") {
      const id = String(body.order_id || "");
      if (!/^[A-Z0-9]{10,25}$/.test(id)) return json({ error: "That payment link isn't valid." }, 400);
      const sessionId = "PP-" + id;
      const { data: have } = await db.from("ebook_orders").select("id").eq("session_id", sessionId).maybeSingle();
      if (have) return json({ session_id: sessionId });
      let o = await pp("/v2/checkout/orders/" + id);
      if (o.status === "APPROVED") o = await pp("/v2/checkout/orders/" + id + "/capture", "POST", {}, { "PayPal-Request-Id": "gg-cap-" + id });
      if (o.status !== "COMPLETED") return json({ error: "The payment wasn't completed. If you paid, please email us." }, 400);
      const unit = o.purchase_units?.[0] ?? {};
      const cap = unit.payments?.captures?.[0] ?? {};
      const ebookId = unit.custom_id || cap.custom_id || unit.reference_id;
      await db.from("ebook_orders").upsert({
        session_id: sessionId, ebook_id: ebookId, email: o.payer?.email_address ?? null,
        amount_cents: Math.round(Number(cap.amount?.value ?? unit.amount?.value ?? 0) * 100), currency: (cap.amount?.currency_code ?? "USD").toLowerCase(),
      }, { onConflict: "session_id", ignoreDuplicates: true });
      try {
        await fetch(url + "/functions/v1/ebook-delivery", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + serviceKey }, body: JSON.stringify({ action: "email", session_id: sessionId }) });
      } catch (e) { console.error("ebook email", e); }
      return json({ session_id: sessionId });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 400);
  }
});
