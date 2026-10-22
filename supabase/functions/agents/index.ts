// Commission agents (admin page: Agents tab for Christopher; "My earnings" for agents).
// Deployed as the "agents" Edge Function with JWT verification OFF: every action checks the caller itself.
//   Admin:  { action: "create", name, email, phone, country, language, code } -> agent account + temporary password
//           { action: "reset_password", agent_id }                           -> new temporary password
//           { action: "pay_now" }                                             -> send every payable commission now
//   Agent:  { action: "connect" }  -> link to Stripe to set up payouts (Stripe Connect Express)
//           { action: "refresh" }  -> re-check whether Stripe payouts are ready
//   Cron:   header x-cron-token = vault secret agents_cron_token, { action: "pay_now" } (daily, pg_cron)
// Payouts: each pending commission whose 14-day refund window has passed is sent with a Stripe transfer to the agent's
// connected account. Needs STRIPE_SECRET_KEY with Connect (accounts, account links), Transfers and Balance permissions.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://christopherthegoodgringo.com", "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];
const SITE = "https://christopherthegoodgringo.com";

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function tempPassword() {
  const words = ["Sol", "Mar", "Luna", "Cafe", "Playa", "Monte", "Rio", "Selva", "Brisa", "Coco"];
  const b = crypto.getRandomValues(new Uint32Array(3));
  return words[b[0] % words.length] + words[b[1] % words.length] + "-" + String(1000 + (b[2] % 9000));
}

function stripeKey() {
  return (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

async function stripe(path: string, method: string, params?: Record<string, string>, idem?: string) {
  const key = stripeKey();
  if (!key) throw new Error("Payouts aren't switched on yet: the Stripe key still needs to be added in Supabase.");
  const headers: Record<string, string> = { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" };
  if (idem) headers["Idempotency-Key"] = idem;
  const r = await fetch("https://api.stripe.com/v1/" + path, { method, headers, body: params ? new URLSearchParams(params) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || ("Stripe error " + r.status));
  return j;
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid request." }); }
  const action = String(body.action ?? "");

  // Who is calling: the daily job, Christopher (admin) or an agent.
  let role: "cron" | "admin" | "agent" | null = null, userId = "";
  const cron = req.headers.get("x-cron-token");
  if (cron) {
    const { data: ok } = await db.rpc("agents_cron_token_ok", { p_token: cron });
    if (ok === true) role = "cron";
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
      const { data: u } = await caller.auth.getUser();
      if (u?.user) {
        userId = u.user.id;
        const { data: isAdmin } = await caller.rpc("is_portal_admin");
        if (isAdmin === true) role = "admin";
        else { const { data: isAgent } = await caller.rpc("is_agent"); if (isAgent === true) role = "agent"; }
      }
    }
  }
  if (!role) return reply(403, { error: "Please sign in again." });

  try {
    if (action === "create" && role === "admin") {
      const name = String(body.name ?? "").trim().slice(0, 120);
      const email = String(body.email ?? "").trim().toLowerCase();
      const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
      const country = String(body.country ?? "").trim().toUpperCase();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: "Add the agent's name and a valid email." });
      if (code.length < 3) return reply(400, { error: "The agent code needs at least 3 letters or numbers." });
      const { data: dupe } = await db.from("agents").select("id, code, email").or(`code.eq.${code},email.ilike.${email}`).limit(1);
      if (dupe && dupe.length) return reply(400, { error: dupe[0].code === code ? "That agent code is already used. Pick another." : "There is already an agent with that email." });
      const password = tempPassword();
      const { data: created, error } = await db.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { must_change_password: true, agent: true, name },
      });
      if (error) {
        return reply(400, { error: /already|registered|exists/i.test(error.message) ? "That email already has an account on the site (maybe as a business owner). Use a different email for the agent." : error.message });
      }
      const { data: agent, error: e2 } = await db.from("agents").insert({
        user_id: created.user.id, name, email, code,
        phone: String(body.phone ?? "").trim().slice(0, 40) || null,
        country: /^[A-Z]{2}$/.test(country) ? country : null,
        language: body.language === "en" ? "en" : "es",
      }).select("*").single();
      if (e2) { await db.auth.admin.deleteUser(created.user.id); return reply(400, { error: e2.message }); }
      return reply(200, { agent, password, link: SITE + "/admin/" });
    }

    if (action === "reset_password" && role === "admin") {
      const { data: a } = await db.from("agents").select("user_id, email").eq("id", String(body.agent_id ?? "")).maybeSingle();
      if (!a?.user_id) return reply(404, { error: "That agent wasn't found." });
      const password = tempPassword();
      const { error } = await db.auth.admin.updateUserById(a.user_id, { password, user_metadata: { must_change_password: true, agent: true } });
      if (error) return reply(400, { error: error.message });
      return reply(200, { password, email: a.email });
    }

    if ((action === "connect" || action === "refresh") && role === "agent") {
      const { data: a } = await db.from("agents").select("*").eq("user_id", userId).eq("status", "active").maybeSingle();
      if (!a) return reply(404, { error: "Your agent account wasn't found." });
      let acct = a.stripe_account_id as string | null;
      if (action === "refresh") {
        if (!acct) return reply(200, { payouts_enabled: false, connected: false });
        const s = await stripe("accounts/" + acct, "GET");
        const ready = !!s.payouts_enabled && s.capabilities?.transfers === "active";
        await db.from("agents").update({ payouts_enabled: ready }).eq("id", a.id);
        return reply(200, { payouts_enabled: ready, connected: true });
      }
      if (!acct) {
        const country = a.country || "US";
        const params: Record<string, string> = {
          type: "express", country, email: a.email,
          "capabilities[transfers][requested]": "true",
          "business_type": "individual",
          "metadata[agent_id]": a.id, "metadata[agent_code]": a.code,
        };
        if (country !== "US") params["tos_acceptance[service_agreement]"] = "recipient";
        const s = await stripe("accounts", "POST", params, "agent-account-" + a.id);
        acct = s.id;
        await db.from("agents").update({ stripe_account_id: acct }).eq("id", a.id);
      }
      const link = await stripe("account_links", "POST", {
        account: acct!, type: "account_onboarding",
        refresh_url: SITE + "/admin/?payouts=retry#earnings", return_url: SITE + "/admin/?payouts=done#earnings",
      });
      return reply(200, { url: link.url });
    }

    if (action === "pay_now" && (role === "admin" || role === "cron")) {
      const { data: due } = await db.from("agent_commissions")
        .select("id, agent_id, commission_cents, listing_name, tier, agents!inner(stripe_account_id, payouts_enabled, status, code)")
        .eq("status", "pending").lte("available_at", new Date().toISOString()).limit(200);
      const results: Array<Record<string, unknown>> = [];
      for (const k of due ?? []) {
        const ag = (k as any).agents;
        if (!ag || ag.status !== "active" || !ag.stripe_account_id || !ag.payouts_enabled) {
          await db.from("agent_commissions").update({ error: "Waiting for the agent to set up payouts in Stripe." }).eq("id", k.id);
          results.push({ id: k.id, sent: false, why: "payouts not set up" });
          continue;
        }
        try {
          const t = await stripe("transfers", "POST", {
            amount: String(k.commission_cents), currency: "usd", destination: ag.stripe_account_id,
            description: "Commission: " + (k.listing_name || "listing") + " (" + (k.tier || "") + ")",
            "metadata[commission_id]": k.id, "metadata[agent_code]": ag.code, transfer_group: "commission-" + k.id,
          }, "commission-" + k.id);
          await db.from("agent_commissions").update({ status: "paid", paid_at: new Date().toISOString(), stripe_transfer_id: t.id, error: null }).eq("id", k.id);
          results.push({ id: k.id, sent: true });
        } catch (e) {
          const m = String((e as Error).message || e);
          await db.from("agent_commissions").update({ error: /insufficient/i.test(m) ? "Your Stripe balance doesn't have enough available money yet. It will try again tomorrow." : m.slice(0, 480) }).eq("id", k.id);
          results.push({ id: k.id, sent: false, why: m });
        }
      }
      return reply(200, { checked: (due ?? []).length, sent: results.filter((r) => r.sent).length, results });
    }

    return reply(400, { error: "Unknown action." });
  } catch (e) {
    return reply(400, { error: String((e as Error).message || e) });
  }
});
