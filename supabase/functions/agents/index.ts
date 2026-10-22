// Commission agents (admin page: Agents tab for Christopher; "My earnings" for agents).
// Deployed as the "agents" Edge Function with JWT verification OFF: every action checks the caller itself.
//   Admin:  { action: "create", name, email, phone, country, language, code } -> agent account + temporary password
//           { action: "reset_password", agent_id }                           -> new temporary password
//           { action: "update", agent_id, name, email, phone, country, language, code, notes } -> edit details (email also changes their sign-in)
//           { action: "delete", agent_id }                                    -> remove agent + sign-in (prospects go back to the shared list)
//           { action: "pay_now" }                                             -> send every payable commission now
//   Public: { action: "signup", name, email, password, phone, country, language, agree } -> agent account right away (agents.html)
//   Agent:  { action: "set_paypal", paypal_email } -> where their commissions are sent (PayPal)
//   Cron:   header x-cron-token = vault secret agents_cron_token, { action: "pay_now" } (daily, pg_cron)
//           { action: "notify_commission", commission_id } (trigger on new agent_commissions rows): "You earned a commission!" email
// Payouts (PayPal, Christopher's choice: Stripe can't pay out to most Latin American countries): each pending commission
// whose 14-day refund window has passed is sent to the agent's PayPal email with the PayPal Payouts API.
// Secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET (live REST app with Payouts enabled); PAYPAL_MODE=sandbox to test.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://christopherthegoodgringo.com", "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];
const SITE = "https://christopherthegoodgringo.com";
// Agents can come from the 17 Latin American countries on the site, the United States, Puerto Rico, Canada or Spain (PayPal payouts work there).
const AGENT_COUNTRIES = "AR BZ BO CL CO CR DO EC SV GT HN MX NI PA PY PE UY US PR CA ES".split(" ");

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

function env(name: string) { return (Deno.env.get(name) ?? "").trim().replace(/^["']|["']$/g, "").trim(); }
const PAYPAL_API = () => env("PAYPAL_MODE") === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

async function paypalToken() {
  const id = env("PAYPAL_CLIENT_ID"), secret = env("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Payouts aren't switched on yet: the PayPal keys still need to be added in Supabase.");
  const r = await fetch(PAYPAL_API() + "/v1/oauth2/token", {
    method: "POST", headers: { Authorization: "Basic " + btoa(id + ":" + secret), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const j = await r.json();
  if (!r.ok) throw new Error("PayPal didn't accept the keys: " + (j.error_description || j.error || r.status));
  return j.access_token as string;
}

// ---- Email (same mailbox as prospect-mailer / ebook-delivery): "You earned a commission!" ----
const enc = new TextEncoder();
function b64(s: string) { const bytes = enc.encode(s); let bin = ""; for (const x of bytes) bin += String.fromCharCode(x); return btoa(bin); }
function wrap76(s: string) { return s.replace(/.{1,76}/g, "$&\r\n").trimEnd(); }
function encodeHeader(s: string) { return /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64(s) + "?="; }

class Line {
  conn!: Deno.TlsConn; buf = ""; dec = new TextDecoder();
  async open(host: string, port: number) { this.conn = await Deno.connectTls({ hostname: host, port }); }
  async readLine(timeoutMs = 30000): Promise<string> {
    const start = Date.now();
    while (true) {
      const i = this.buf.indexOf("\r\n");
      if (i >= 0) { const line = this.buf.slice(0, i); this.buf = this.buf.slice(i + 2); return line; }
      if (Date.now() - start > timeoutMs) throw new Error("The mail server stopped answering.");
      const chunk = new Uint8Array(16384);
      const n = await this.conn.read(chunk);
      if (n === null) throw new Error("The mail server closed the connection.");
      this.buf += this.dec.decode(chunk.subarray(0, n), { stream: true });
    }
  }
  async write(s: string) { const d = enc.encode(s); let off = 0; while (off < d.length) off += await this.conn.write(d.subarray(off)); }
  close() { try { this.conn.close(); } catch { /* closed */ } }
}
class Smtp {
  l = new Line();
  async reply(): Promise<[number, string]> { let t = ""; while (true) { const line = await this.l.readLine(); t += line + "\n"; if (/^\d{3} /.test(line) || line.length < 4) return [Number(line.slice(0, 3)), t]; } }
  async cmd(c: string, ok: number[]) { await this.l.write(c + "\r\n"); const [code, text] = await this.reply(); if (!ok.includes(code)) throw new Error(text.trim().split("\n").pop() || "SMTP " + code); return text; }
  async open(host: string, user: string, pass: string) {
    await this.l.open(host, 465);
    const [c] = await this.reply(); if (c !== 220) throw new Error("The mail server didn't say hello.");
    await this.cmd("EHLO christopherthegoodgringo.com", [250]);
    await this.cmd("AUTH LOGIN", [334]); await this.cmd(b64(user), [334]);
    try { await this.cmd(b64(pass), [235]); } catch { await this.cmd("AUTH PLAIN " + b64("\u0000" + user + "\u0000" + pass), [235]); }
  }
  async send(from: string, to: string, raw: string) {
    await this.cmd("MAIL FROM:<" + from + ">", [250]); await this.cmd("RCPT TO:<" + to + ">", [250, 251]); await this.cmd("DATA", [354]);
    await this.l.write(raw.replace(/\r\n\./g, "\r\n..") + "\r\n.\r\n");
    const [code, text] = await this.reply(); if (code !== 250) throw new Error(text.trim());
  }
  async close() { try { await this.l.write("QUIT\r\n"); } catch { /* ignore */ } this.l.close(); }
}

function usd(c: number) { return "$" + (Number(c || 0) / 100).toFixed(2); }
function commissionEmail(a: any, k: any) {
  const es = a.language !== "en";
  const first = String(a.name || "").trim().split(/\s+/)[0] || (es ? "agente" : "agent");
  const tier = ({ silver: es ? "Plata" : "Silver", gold: es ? "Oro" : "Gold", platinum: es ? "Platino" : "Platinum" } as Record<string, string>)[k.tier] || k.tier;
  const when = new Date(k.available_at || Date.now()).toLocaleDateString(es ? "es-CO" : "en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" });
  const kind = k.kind === "renewal" ? (es ? "renovación mensual (15%)" : "monthly renewal (15%)") : (es ? "nuevo anuncio (30%)" : "new listing (30%)");
  const pay = a.paypal_email
    ? (es ? `Se enviará automáticamente a tu PayPal (${a.paypal_email}) el ${when}.` : `It will be sent to your PayPal (${a.paypal_email}) automatically on ${when}.`)
    : (es ? `Para recibirlo, agrega tu correo de PayPal en "Mis ganancias": ${SITE}/admin/#earnings` : `To get paid, add your PayPal email in "My earnings": ${SITE}/admin/#earnings`);
  const subject = es ? `¡Ganaste una comisión de ${usd(k.commission_cents)}!` : `You earned a ${usd(k.commission_cents)} commission!`;
  const body = es
    ? `¡Hola ${first}!\n\n¡Buenas noticias! ${k.listing_name || "Un negocio"} pagó su plan ${tier} y ganaste ${usd(k.commission_cents)}.\n\nTipo de comisión: ${kind}\nEl negocio pagó: ${usd(k.amount_paid_cents)}\n\n${pay}\n\nMira todas tus ganancias aquí: ${SITE}/admin/#earnings\n\n¡Sigue así!\nChristopher Kesl\nChristopher The Good Gringo\n`
    : `Hi ${first}!\n\nGreat news! ${k.listing_name || "A business"} paid for its ${tier} plan and you earned ${usd(k.commission_cents)}.\n\nCommission type: ${kind}\nThe business paid: ${usd(k.amount_paid_cents)}\n\n${pay}\n\nSee all your earnings here: ${SITE}/admin/#earnings\n\nKeep it up!\nChristopher Kesl\nChristopher The Good Gringo\n`;
  return { subject, body };
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

  // Public sign-up from /agents.html: the account works right away (Christopher doesn't review anything).
  if (action === "signup") {
    if (String(body.website ?? "")) return reply(200, { ok: true }); // hidden honeypot field filled = bot
    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const country = String(body.country ?? "").trim().toUpperCase();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: "Add your name and a valid email." });
    if (password.length < 8) return reply(400, { error: "Choose a password with at least 8 characters." });
    if (!body.agree) return reply(400, { error: "Please accept the agent terms." });
    if (!AGENT_COUNTRIES.includes(country)) return reply(400, { error: "Agents can sign up from the Latin American countries on the site, the United States, Puerto Rico, Canada or Spain." });
    const { data: dupe } = await db.from("agents").select("id").ilike("email", email).limit(1);
    if (dupe && dupe.length) return reply(400, { error: "There's already an agent account with that email. Sign in instead." });
    const base = (name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().match(/[A-Z0-9]+/g) || ["AGENT"])[0].slice(0, 12).padEnd(3, "X");
    let code = base;
    for (let i = 0; i < 20; i++) {
      const { data: taken } = await db.from("agents").select("id").eq("code", code).limit(1);
      if (!taken || !taken.length) break;
      code = base.slice(0, 10) + String(10 + Math.floor(Math.random() * 990));
    }
    const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { agent: true, name } });
    if (error) return reply(400, { error: /already|registered|exists/i.test(error.message) ? "That email already has an account on the site (maybe as a business owner). Use a different email." : error.message });
    const { data: agent, error: e2 } = await db.from("agents").insert({
      user_id: created.user.id, name, email, code,
      phone: String(body.phone ?? "").trim().slice(0, 40) || null,
      country: /^[A-Z]{2}$/.test(country) ? country : null,
      language: body.language === "en" ? "en" : "es",
      notes: "Signed up on the agent page",
    }).select("name, email, code").single();
    if (e2) { await db.auth.admin.deleteUser(created.user.id); return reply(400, { error: e2.message }); }
    return reply(200, { agent, link: SITE + "/owner/?agent=" + agent.code });
  }

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

    if (action === "update" && role === "admin") {
      // Christopher edits an agent's details. A new email also changes the agent's sign-in email.
      const id = String(body.agent_id ?? "");
      const { data: a } = await db.from("agents").select("*").eq("id", id).maybeSingle();
      if (!a) return reply(404, { error: "That agent wasn't found." });
      const name = String(body.name ?? "").trim().slice(0, 120);
      const email = String(body.email ?? "").trim().toLowerCase();
      const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
      const country = String(body.country ?? "").trim().toUpperCase();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: "Add the agent's name and a valid email." });
      if (code.length < 3) return reply(400, { error: "The agent code needs at least 3 letters or numbers." });
      if (code !== a.code) {
        const { data: d } = await db.from("agents").select("id").eq("code", code).neq("id", id).limit(1);
        if (d && d.length) return reply(400, { error: "That agent code is already used. Pick another." });
      }
      if (email !== String(a.email).toLowerCase()) {
        const { data: d } = await db.from("agents").select("id").ilike("email", email).neq("id", id).limit(1);
        if (d && d.length) return reply(400, { error: "There is already an agent with that email." });
        if (a.user_id) {
          const { error } = await db.auth.admin.updateUserById(a.user_id, { email, email_confirm: true });
          if (error) return reply(400, { error: /already|registered|exists/i.test(error.message) ? "That email already has an account on the site (maybe as a business owner). Use a different email for the agent." : error.message });
        }
      }
      const { data: agent, error } = await db.from("agents").update({
        name, email, code,
        phone: String(body.phone ?? "").trim().slice(0, 40) || null,
        country: /^[A-Z]{2}$/.test(country) ? country : null,
        language: body.language === "en" ? "en" : "es",
        notes: String(body.notes ?? "").trim().slice(0, 2000) || null,
        ...(body.paypal_email !== undefined ? (() => { const pe = String(body.paypal_email ?? "").trim().toLowerCase(); return { paypal_email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pe) ? pe : null, payouts_enabled: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pe) }; })() : {}),
      }).eq("id", id).select("*").single();
      if (error) return reply(400, { error: error.message });
      return reply(200, { agent });
    }

    if (action === "delete" && role === "admin") {
      // Removes the agent, their sign-in, referrals and commissions; their prospects go back to the shared list.
      const { data: a } = await db.from("agents").select("id, user_id").eq("id", String(body.agent_id ?? "")).maybeSingle();
      if (!a) return reply(404, { error: "That agent wasn't found." });
      const { error } = await db.from("agents").delete().eq("id", a.id);
      if (error) return reply(400, { error: error.message });
      if (a.user_id) await db.auth.admin.deleteUser(a.user_id);
      return reply(200, { deleted: true });
    }

    if (action === "reset_password" && role === "admin") {
      const { data: a } = await db.from("agents").select("user_id, email").eq("id", String(body.agent_id ?? "")).maybeSingle();
      if (!a?.user_id) return reply(404, { error: "That agent wasn't found." });
      const password = tempPassword();
      const { error } = await db.auth.admin.updateUserById(a.user_id, { password, user_metadata: { must_change_password: true, agent: true } });
      if (error) return reply(400, { error: error.message });
      return reply(200, { password, email: a.email });
    }

    if (action === "set_paypal" && role === "agent") {
      const pe = String(body.paypal_email ?? "").trim().toLowerCase();
      if (pe && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pe)) return reply(400, { error: "Add a valid PayPal email." });
      const { data: a, error } = await db.from("agents").update({ paypal_email: pe || null, payouts_enabled: !!pe })
        .eq("user_id", userId).select("paypal_email, payouts_enabled").single();
      if (error) return reply(400, { error: error.message });
      return reply(200, { agent: a });
    }

    if (action === "notify_commission" && role === "cron") {
      const { data: k } = await db.from("agent_commissions").select("*").eq("id", String(body.commission_id ?? "")).maybeSingle();
      if (!k) return reply(404, { error: "Commission not found." });
      if (k.notified_at) return reply(200, { already: true });
      const { data: a } = await db.from("agents").select("name, email, language, paypal_email, status").eq("id", k.agent_id).maybeSingle();
      if (!a?.email || a.status !== "active") return reply(200, { skipped: true });
      const { data: cfg } = await db.from("prospect_mailer").select("smtp_host").eq("id", 1).maybeSingle();
      const user = (Deno.env.get("EMAIL_USER") ?? "christopher@christopherthegoodgringo.com").trim();
      const pass = (Deno.env.get("EMAIL_PASSWORD") ?? "").replace(/^["']|["']$/g, "");
      const m = commissionEmail(a, k);
      const raw = ["From: " + encodeHeader("Christopher The Good Gringo") + " <" + user + ">", "To: <" + a.email + ">", "Subject: " + encodeHeader(m.subject),
        "Date: " + new Date().toUTCString().replace("GMT", "+0000"), "Message-ID: <" + crypto.randomUUID() + "@christopherthegoodgringo.com>",
        "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "",
        wrap76(b64(m.body.replace(/\r?\n/g, "\r\n")))].join("\r\n");
      const smtp = new Smtp();
      try {
        await smtp.open(cfg?.smtp_host || "netsol-smtp-oxcs.hostingplatform.com", user, pass);
        await smtp.send(user, a.email, raw);
        await db.from("agent_commissions").update({ notified_at: new Date().toISOString() }).eq("id", k.id);
        return reply(200, { sent: true });
      } finally { await smtp.close(); }
    }

    if (action === "pay_now" && (role === "admin" || role === "cron")) {
      const { data: due } = await db.from("agent_commissions")
        .select("id, agent_id, commission_cents, listing_name, tier, kind, agents!inner(paypal_email, status, code)")
        .eq("status", "pending").lte("available_at", new Date().toISOString()).limit(500);
      const ready: any[] = [], results: Array<Record<string, unknown>> = [];
      for (const k of due ?? []) {
        const ag = (k as any).agents;
        if (!ag || ag.status !== "active" || !ag.paypal_email) {
          await db.from("agent_commissions").update({ error: "Waiting for the agent to add their PayPal email in My earnings." }).eq("id", k.id);
          results.push({ id: k.id, sent: false, why: "no PayPal email" });
        } else ready.push(k);
      }
      if (ready.length) {
        try {
          const token = await paypalToken();
          const batchId = "gg-" + new Date().toISOString().slice(0, 10) + "-" + crypto.randomUUID().slice(0, 8);
          const r = await fetch(PAYPAL_API() + "/v1/payments/payouts", {
            method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "PayPal-Request-Id": batchId },
            body: JSON.stringify({
              sender_batch_header: { sender_batch_id: batchId, email_subject: "Your Christopher The Good Gringo commission", email_message: "Thank you for bringing businesses to Christopher The Good Gringo!" },
              items: ready.map((k: any) => ({
                recipient_type: "EMAIL", receiver: k.agents.paypal_email, sender_item_id: k.id,
                amount: { value: (k.commission_cents / 100).toFixed(2), currency: "USD" },
                note: "Commission: " + (k.listing_name || "listing") + " (" + (k.kind === "renewal" ? "monthly renewal" : "new listing") + ")",
              })),
            }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.message || j.name || ("PayPal error " + r.status));
          const ref = j.batch_header?.payout_batch_id || batchId;
          for (const k of ready) {
            await db.from("agent_commissions").update({ status: "paid", paid_at: new Date().toISOString(), payout_ref: ref, error: null }).eq("id", k.id);
            results.push({ id: k.id, sent: true });
          }
        } catch (e) {
          const m = String((e as Error).message || e);
          for (const k of ready) {
            await db.from("agent_commissions").update({ error: /insufficient|balance|fund/i.test(m) ? "Your PayPal balance doesn't have enough money yet. It will try again tomorrow." : m.slice(0, 480) }).eq("id", k.id);
            results.push({ id: k.id, sent: false, why: m });
          }
        }
      }
      return reply(200, { checked: (due ?? []).length, sent: results.filter((r) => r.sent).length, results });
    }

    return reply(400, { error: "Unknown action." });
  } catch (e) {
    return reply(400, { error: String((e as Error).message || e) });
  }
});
