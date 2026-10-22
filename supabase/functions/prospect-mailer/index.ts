// Automatic prospecting emails from Christopher's own mailbox (domain.com: smtp.domain.com:465, imap.domain.com:993).
// Deployed as "prospect-mailer" with JWT verification OFF; callers are checked here:
//   the scheduled job (header x-mailer-token, every 10 minutes 9:00-10:50 am Colombia), or an admin ("Run now" button).
// Each run:
//   1. Inbox check: any business waiting for a reply that has written back (From = their email, since we last wrote)
//      is marked Replied, which stops its follow-ups.
//   2. Sends what's due, oldest first: follow-up 1 (4 days after the first message), follow-up 2 (7 days after that),
//      then first messages to businesses not contacted yet. Only Prospecting rows with an email, no agent, and status
//      New / WhatsApped / Emailed / Both. Businesses that now have an owner are marked Claimed instead.
//      At most prospect_mailer.daily_limit per Colombia day, up to 8 per run, a few seconds apart.
//   3. Each email is saved to the mailbox's Sent folder and logged in prospect_emails.
// Templates: prospect_templates (email_es / email_en, f1_email_*, f2_email_*), same placeholders as the admin page.
// Secret: EMAIL_PASSWORD. Optional: EMAIL_USER (default christopher@christopherthegoodgringo.com).
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://christopherthegoodgringo.com", "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];
const SITE = "https://christopherthegoodgringo.com";
const FROM_NAME = "Christopher Kesl";
const SMTP_HOST = "smtp.domain.com", IMAP_HOST = "imap.domain.com";
const PER_RUN = 8, GAP_MS = 3000, DAY = 86400000, FOLLOW_DAYS = [4, 7];
const FINDER: Record<string, [string, string, string]> = {
  hotels: ["/hotels.html", "buscador de hoteles", "hotel finder"],
  hostels: ["/hostels.html", "buscador de hostales", "hostel finder"],
  restaurants: ["/restaurants.html", "buscador de restaurantes", "restaurant finder"],
  bars: ["/bars.html", "buscador de bares", "bar finder"],
  "street-food": ["/street-food-finder.html", "buscador de comida callejera", "street food finder"],
};
const SOURCES: Record<string, Array<[string, string]>> = {
  hotels: [["/data/hotels.json", "hotels"]],
  hostels: [["/data/paid-listings.json", "hostels"], ["/data/hostels-clean.json", "hostels"]],
  restaurants: [["/data/restaurants.json", "restaurants"]],
  bars: [["/data/bars.json", "bars"]],
  "street-food": [["/data/street-food.json", "streetFood"]],
};
const FOOTER = {
  es: "\n\n--\nSi prefieres no recibir más correos míos, solo responde \"STOP\" y no te escribo más.",
  en: "\n\n--\nIf you'd rather not get more emails from me, just reply \"STOP\" and I won't write again.",
};

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mailer-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const enc = new TextEncoder();
function b64(s: string) { const bytes = enc.encode(s); let bin = ""; for (const x of bytes) bin += String.fromCharCode(x); return btoa(bin); }
function wrap76(s: string) { return s.replace(/.{1,76}/g, "$&\r\n").trimEnd(); }
function encodeHeader(s: string) { return /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64(s) + "?="; }

// ---------- A small line-based TLS connection (shared by SMTP and IMAP) ----------
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
  async write(s: string) { const data = enc.encode(s); let off = 0; while (off < data.length) off += await this.conn.write(data.subarray(off)); }
  close() { try { this.conn.close(); } catch { /* already closed */ } }
}

// ---------- SMTP (port 465, TLS from the start) ----------
class Smtp {
  l = new Line();
  async reply(): Promise<[number, string]> {
    let text = "";
    while (true) { const line = await this.l.readLine(); text += line + "\n"; if (/^\d{3} /.test(line) || line.length < 4) return [Number(line.slice(0, 3)), text]; }
  }
  async cmd(c: string, ok: number[]) {
    await this.l.write(c + "\r\n");
    const [code, text] = await this.reply();
    if (!ok.includes(code)) throw Object.assign(new Error(text.trim().split("\n").pop() || ("SMTP " + code)), { code });
    return text;
  }
  async open(user: string, pass: string) {
    await this.l.open(SMTP_HOST, 465);
    const [c] = await this.reply(); if (c !== 220) throw new Error("The mail server didn't say hello.");
    await this.cmd("EHLO christopherthegoodgringo.com", [250]);
    await this.cmd("AUTH LOGIN", [334]);
    await this.cmd(b64(user), [334]);
    try { await this.cmd(b64(pass), [235]); } catch { throw new Error("The mailbox didn't accept the email password. Check EMAIL_PASSWORD in Supabase."); }
  }
  async send(from: string, to: string, raw: string) {
    await this.cmd("MAIL FROM:<" + from + ">", [250]);
    await this.cmd("RCPT TO:<" + to + ">", [250, 251]);
    await this.cmd("DATA", [354]);
    await this.l.write(raw.replace(/\r\n\./g, "\r\n..") + "\r\n.\r\n");
    const [code, text] = await this.reply();
    if (code !== 250) throw new Error(text.trim());
    await this.cmd("RSET", [250]);
  }
  async close() { try { await this.l.write("QUIT\r\n"); } catch { /* ignore */ } this.l.close(); }
}

// ---------- IMAP (port 993) ----------
class Imap {
  l = new Line(); n = 0;
  async open(user: string, pass: string) {
    await this.l.open(IMAP_HOST, 993);
    await this.l.readLine();
    const q = (s: string) => '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    const r = await this.cmd("LOGIN " + q(user) + " " + q(pass));
    if (!r.ok) throw new Error("The mailbox didn't accept the email password (inbox check). Check EMAIL_PASSWORD in Supabase.");
  }
  async cmd(c: string, literal?: string): Promise<{ ok: boolean; lines: string[] }> {
    const tag = "A" + (++this.n);
    await this.l.write(tag + " " + c + "\r\n");
    const lines: string[] = [];
    while (true) {
      const line = await this.l.readLine(60000);
      if (line.startsWith("+") && literal !== undefined) { await this.l.write(literal + "\r\n"); literal = undefined; continue; }
      if (line.startsWith(tag + " ")) return { ok: line.startsWith(tag + " OK"), lines };
      lines.push(line);
    }
  }
  async sentFolder(): Promise<string | null> {
    const r = await this.cmd('LIST "" "*"');
    const pick = r.lines.find((x) => /\\Sent\b/i.test(x)) || r.lines.find((x) => /"?(INBOX[./])?Sent( Items| Messages)?"?\s*$/i.test(x));
    if (!pick) return null;
    const m = pick.match(/"((?:[^"\\]|\\.)*)"\s*$/) || pick.match(/\s(\S+)\s*$/);
    return m ? m[1] : null;
  }
  async append(folder: string, raw: string) {
    const size = enc.encode(raw).length;
    await this.cmd('APPEND "' + folder.replace(/"/g, '\\"') + '" (\\Seen) {' + size + "}", raw);
  }
  async repliedSince(from: string, since: Date): Promise<boolean> {
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][since.getUTCMonth()];
    const d = since.getUTCDate() + "-" + mon + "-" + since.getUTCFullYear();
    const r = await this.cmd('UID SEARCH SINCE ' + d + ' FROM "' + from.replace(/["\\\r\n]/g, "") + '"');
    const line = r.lines.find((x) => x.startsWith("* SEARCH"));
    return !!line && line.trim().length > "* SEARCH".length;
  }
  async close() { try { await this.cmd("LOGOUT"); } catch { /* ignore */ } this.l.close(); }
}

function message(fromAddr: string, to: string, subject: string, body: string) {
  const id = crypto.randomUUID() + "@christopherthegoodgringo.com";
  return [
    "From: " + encodeHeader(FROM_NAME) + " <" + fromAddr + ">",
    "To: <" + to + ">",
    "Subject: " + encodeHeader(subject),
    "Date: " + new Date().toUTCString().replace("GMT", "+0000"),
    "Message-ID: <" + id + ">",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(body.replace(/\r?\n/g, "\r\n"))),
  ].join("\r\n");
}

async function loadListings(db: any) {
  const out: Record<string, any> = {};
  for (const type of Object.keys(SOURCES)) {
    for (const [path, key] of SOURCES[type]) {
      try {
        const r = await fetch(SITE + path + "?mailer=" + Date.now());
        const d = await r.json();
        for (const h of (Array.isArray(d[key]) ? d[key] : [])) { const k = type + "|" + String(h.id || h.name); if (!out[k]) out[k] = h; }
      } catch { /* a missing file just means fewer listings */ }
    }
  }
  const { data: extra } = await db.from("published_new_listings").select("listing_type, listing_id, data");
  for (const x of extra ?? []) { const k = x.listing_type + "|" + x.listing_id; if (!out[k]) out[k] = x.data; }
  return out;
}

function fill(text: string, p: any, h: any, lang: string) {
  const f = FINDER[p.listing_type] || FINDER.hostels;
  const vals: Record<string, string> = {
    name: (h && h.name) || p.listing_name || "", city: (h && h.city) || "",
    finder: SITE + f[0] + "?lang=" + lang, finder_label: lang === "en" ? f[2] : f[1],
    claim: SITE + "/owner/?type=" + encodeURIComponent(p.listing_type) + "&id=" + encodeURIComponent(p.listing_id) + "&lang=" + lang,
    plans: SITE + "/business-sponsorship.html?lang=" + lang,
  };
  return String(text || "").replace(/\{(\w+)\}/g, (m, k) => Object.prototype.hasOwnProperty.call(vals, k) ? vals[k] : m);
}

function colombiaMidnight() {
  const now = new Date(Date.now() - 5 * 3600000); // Colombia is UTC-5 all year
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 5 * 3600000);
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  let allowed = false, manual = false;
  const token = req.headers.get("x-mailer-token");
  if (token) { const { data } = await db.rpc("prospect_mailer_token_ok", { p_token: token }); allowed = data === true; }
  else {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth.startsWith("Bearer ")) {
      const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const { data } = await caller.rpc("is_portal_admin"); allowed = data === true; manual = allowed;
    }
  }
  if (!allowed) return reply(403, { error: "Please sign in again." });

  const { data: settings } = await db.from("prospect_mailer").select("*").eq("id", 1).maybeSingle();
  const finish = async (result: string, error: string | null, extra: Record<string, unknown> = {}) => {
    await db.from("prospect_mailer").update({ last_run_at: new Date().toISOString(), last_result: result, last_error: error }).eq("id", 1);
    return reply(200, { result, error, ...extra });
  };
  if (!settings?.enabled && !manual) return reply(200, { result: "Automatic emails are paused." });

  const user = (Deno.env.get("EMAIL_USER") ?? "christopher@christopherthegoodgringo.com").trim();
  const pass = (Deno.env.get("EMAIL_PASSWORD") ?? "").replace(/^["']|["']$/g, "");
  if (!pass) return finish("Not sent", "Add your email password in Supabase (Edge Functions > Secrets, name EMAIL_PASSWORD) to switch on automatic emails.");

  const { data: allRows, error: pe } = await db.from("prospects").select("*").not("email", "is", null)
    .in("status", ["new", "whatsapped", "emailed", "both"]);
  if (pe) return finish("Not sent", pe.message);
  const rows = (allRows ?? []).filter((p: any) => !p.agent_id); // agents send to their own leads themselves
  const now = Date.now();
  const waiting = (p: any) => ["whatsapped", "emailed", "both"].includes(p.status);
  const stageOf = (p: any) => p.stage || (waiting(p) ? 1 : 0);
  const lastSent = (p: any) => new Date(p.last_contacted_at || p.updated_at || now).getTime();

  // 1. Replies.
  let replied = 0, imap: Imap | null = null, sentBox: string | null = null, imapError: string | null = null;
  try {
    imap = new Imap(); await imap.open(user, pass);
    sentBox = await imap.sentFolder();
    await imap.cmd("SELECT INBOX");
    for (const p of (rows ?? []).filter((p) => waiting(p) && p.email && p.last_contacted_at)) {
      if (await imap.repliedSince(String(p.email).trim(), new Date(lastSent(p) - DAY))) {
        await db.from("prospects").update({ status: "replied", updated_at: new Date().toISOString() }).eq("listing_type", p.listing_type).eq("listing_id", p.listing_id);
        p.status = "replied"; replied++;
      }
    }
  } catch (e) { imapError = String((e as Error).message || e); }

  // 2. What's due.
  const { data: claims } = await db.from("listing_claims").select("listing_type, listing_id").eq("status", "approved");
  const owned = new Set((claims ?? []).map((c: any) => c.listing_type + "|" + c.listing_id));
  const { data: badRows } = await db.from("prospect_emails").select("email").eq("ok", false).gte("sent_at", new Date(now - 30 * DAY).toISOString());
  const bad = new Set((badRows ?? []).map((r: any) => String(r.email).toLowerCase()));
  const due: Array<{ p: any; round: number; at: number }> = [];
  for (const p of rows ?? []) {
    if (p.status === "replied" || bad.has(String(p.email).toLowerCase())) continue;
    if (owned.has(p.listing_type + "|" + p.listing_id)) {
      await db.from("prospects").update({ status: "claimed", updated_at: new Date().toISOString() }).eq("listing_type", p.listing_type).eq("listing_id", p.listing_id);
      continue;
    }
    const st = stageOf(p);
    if (p.status === "new" && st === 0) due.push({ p, round: 1, at: Infinity });
    else if (waiting(p) && st >= 1 && st <= 2) {
      const at = lastSent(p) + FOLLOW_DAYS[st - 1] * DAY;
      if (at <= now) due.push({ p, round: st + 1, at });
    }
  }
  due.sort((a, b) => (a.round === 1 ? 1 : 0) - (b.round === 1 ? 1 : 0) || a.at - b.at || String(a.p.updated_at).localeCompare(String(b.p.updated_at)));

  const { count: sentToday } = await db.from("prospect_emails").select("id", { count: "exact", head: true }).eq("ok", true).gte("sent_at", colombiaMidnight().toISOString());
  const room = Math.max(0, Math.min(PER_RUN, (settings?.daily_limit ?? 75) - (sentToday ?? 0)));
  if (!due.length || !room) {
    if (imap) await imap.close();
    return finish(!due.length ? "Nothing due" : "Daily limit reached", imapError, { replied, sent: 0, due: due.length });
  }

  const { data: tpls } = await db.from("prospect_templates").select("*");
  const T: Record<string, any> = {}; (tpls ?? []).forEach((t: any) => { T[t.id] = t; });
  const listings = await loadListings(db);
  let sent = 0, failed = 0, lastErr: string | null = null;
  const smtp = new Smtp();
  try { await smtp.open(user, pass); } catch (e) { if (imap) await imap.close(); return finish("Not sent", String((e as Error).message || e), { replied }); }
  for (const { p, round } of due.slice(0, room)) {
    const lang = p.language === "en" ? "en" : "es";
    const t = T[(round === 2 ? "f1_" : round === 3 ? "f2_" : "") + "email_" + lang] || T["email_" + lang];
    if (!t || !t.body) { lastErr = "An email template is empty. Fill in your messages in Prospecting."; break; }
    const h = listings[p.listing_type + "|" + p.listing_id];
    if (!h) continue; // the business isn't on the site any more
    const subject = fill(t.subject || "", p, h, lang), body = fill(t.body, p, h, lang).replace(/\s+$/, "") + FOOTER[lang];
    const to = String(p.email).trim();
    const raw = message(user, to, subject, body);
    try {
      await smtp.send(user, to, raw);
      sent++;
      const status = p.status === "new" ? "emailed" : p.status === "whatsapped" ? "both" : p.status;
      await db.from("prospects").update({ status, stage: round, last_contacted_at: new Date().toISOString(), contact_count: (p.contact_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("listing_type", p.listing_type).eq("listing_id", p.listing_id);
      await db.from("prospect_emails").insert({ listing_type: p.listing_type, listing_id: p.listing_id, listing_name: h.name || p.listing_name, email: to, round, subject, ok: true });
      if (imap && sentBox) { try { await imap.append(sentBox, raw); } catch { /* the email still went out */ } }
    } catch (e) {
      failed++; lastErr = String((e as Error).message || e).slice(0, 400);
      await db.from("prospect_emails").insert({ listing_type: p.listing_type, listing_id: p.listing_id, listing_name: h.name || p.listing_name, email: to, round, subject, ok: false, error: lastErr });
      if (/rate|limit|too many|quota/i.test(lastErr)) break;
    }
    await sleep(GAP_MS);
  }
  await smtp.close();
  if (imap) await imap.close();
  return finish("Sent " + sent + (failed ? ", " + failed + " failed" : ""), lastErr || imapError, { replied, sent, failed, due: due.length });
});
