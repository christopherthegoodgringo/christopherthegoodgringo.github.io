// Ebook delivery for Christopher The Good Gringo (Supabase Edge Function "ebook-delivery", JWT verification OFF).
// Actions (POST JSON):
//   { action: "download", session_id }  -> public. Looks up the paid order and returns 24-hour signed links to the
//                                          English and Spanish PDFs in the private "ebooks" bucket.
//   { action: "email", session_id }     -> called by stripe-webhook / paypal with the service role key. Emails the buyer
//                                          the download link (bilingual) from christopher@christopherthegoodgringo.com.
//   { action: "sales" }                 -> admins only (their sign-in token). Returns recent orders and totals.
//   { action: "import", token, key, items:[{url,path,type}] } -> publishing: fetch AES-GCM encrypted files from
//                                          raw.githubusercontent.com, decrypt, store in the bucket (token = vault ebook_import_token).
// Secrets: EMAIL_PASSWORD (same mailbox as prospect-mailer). Mail servers come from public.prospect_mailer.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://christopherthegoodgringo.com";
const ALLOWED_ORIGINS = [SITE, "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];
function cors(req: Request) {
  const o = req.headers.get("Origin") ?? "";
  return { "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(o) ? o : SITE, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
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

function emailBody(title: string, titleEs: string, link: string) {
  return `Thank you for buying "${title}"!

Download your ebook here (English and Spanish PDFs):
${link}

Keep this email: the link works any time you need to download your ebook again.

Have a great trip,
Christopher Kesl
Christopher The Good Gringo
${SITE}

---

¡Gracias por comprar "${titleEs || title}"!

Descarga tu ebook aquí (PDF en inglés y en español):
${link}

Guarda este correo: el enlace funciona cada vez que necesites descargar tu ebook de nuevo.

¡Buen viaje!
Christopher Kesl
Christopher The Good Gringo
`;
}

Deno.serve(async (req: Request) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const json = (b: unknown, status = 200) => Response.json(b, { status, headers });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action || "");
  const sessionId = String(body.session_id || "");

  if (action === "download") {
    if (!/^(cs_(live|test)_[A-Za-z0-9]{10,}|PP-[A-Z0-9]{10,25})$/.test(sessionId)) return json({ error: "That download link isn't valid." }, 400);
    const { data: order } = await db.from("ebook_orders").select("id, ebook_id, downloads").eq("session_id", sessionId).maybeSingle();
    if (!order) return json({ error: "pending" }, 404); // Stripe/PayPal may still be confirming the payment: the page retries.
    const { data: book } = await db.from("ebooks").select("id, title, title_es, file_en, file_es").eq("id", order.ebook_id).single();
    const files: Record<string, string> = {};
    for (const [lang, path] of [["en", book?.file_en], ["es", book?.file_es]] as const) {
      if (!path) continue;
      const { data: s } = await db.storage.from("ebooks").createSignedUrl(path, 86400, { download: `${book!.id}-${lang}.pdf` });
      if (s?.signedUrl) files[lang] = s.signedUrl;
    }
    await db.from("ebook_orders").update({ downloads: (order.downloads ?? 0) + 1, last_download_at: new Date().toISOString() }).eq("id", order.id);
    return json({ title: book?.title, title_es: book?.title_es, files });
  }

  if (action === "email") {
    const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: tokOk } = body.token ? await db.rpc("ebook_import_token_ok", { p_token: String(body.token) }) : { data: false };
    if (auth !== serviceKey && tokOk !== true) return json({ error: "Not allowed" }, 403);
    const { data: order } = await db.from("ebook_orders").select("id, ebook_id, email, emailed_at").eq("session_id", sessionId).maybeSingle();
    if (!order || !order.email) return json({ error: "No order or no email" }, 404);
    if (order.emailed_at) return json({ ok: true, already: true });
    const { data: book } = await db.from("ebooks").select("title, title_es").eq("id", order.ebook_id).single();
    const { data: cfg } = await db.from("prospect_mailer").select("smtp_host").eq("id", 1).maybeSingle();
    const user = (Deno.env.get("EMAIL_USER") ?? "christopher@christopherthegoodgringo.com").trim();
    const pass = (Deno.env.get("EMAIL_PASSWORD") ?? "").replace(/^["']|["']$/g, "");
    const link = `${SITE}/ebook-download.html?session_id=${encodeURIComponent(sessionId)}`;
    const subject = `Your ebook / Tu ebook: ${book?.title ?? "Christopher The Good Gringo"}`;
    const raw = ["From: " + encodeHeader("Christopher The Good Gringo") + " <" + user + ">", "To: <" + order.email + ">", "Subject: " + encodeHeader(subject),
      "Date: " + new Date().toUTCString().replace("GMT", "+0000"), "Message-ID: <" + crypto.randomUUID() + "@christopherthegoodgringo.com>",
      "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "",
      wrap76(b64(emailBody(book?.title ?? "", book?.title_es ?? "", link).replace(/\r?\n/g, "\r\n")))].join("\r\n");
    const smtp = new Smtp();
    try {
      await smtp.open(cfg?.smtp_host || "netsol-smtp-oxcs.hostingplatform.com", user, pass);
      await smtp.send(user, order.email, raw);
      await db.from("ebook_orders").update({ emailed_at: new Date().toISOString(), email_error: null }).eq("id", order.id);
      return json({ ok: true });
    } catch (e) {
      await db.from("ebook_orders").update({ email_error: String((e as Error).message || e).slice(0, 300) }).eq("id", order.id);
      return json({ error: String((e as Error).message || e) }, 500);
    } finally { await smtp.close(); }
  }

  if (action === "import") {
    // Claude's publishing step: fetch AES-GCM encrypted files (12-byte IV + ciphertext), decrypt, store in the private bucket.
    const { data: tokOk } = await db.rpc("ebook_import_token_ok", { p_token: String(body.token || "") });
    if (tokOk !== true) return json({ error: "Not allowed" }, 403);
    const keyBytes = Uint8Array.from(atob(String(body.key || "")), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const done: string[] = [], failed: string[] = [];
    for (const it of (body.items ?? []) as Array<{ url: string; path: string; type?: string }>) {
      try {
        if (!/^https:\/\/raw\.githubusercontent\.com\/christopherthegoodgringo\//.test(it.url)) throw new Error("bad url");
        const r = await fetch(it.url); if (!r.ok) throw new Error("fetch " + r.status);
        const buf = new Uint8Array(await r.arrayBuffer());
        const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, key, buf.slice(12)));
        const { error } = await db.storage.from("ebooks").upload(it.path, plain, { contentType: it.type || "application/pdf", upsert: true });
        if (error) throw error; done.push(it.path);
      } catch (e) { failed.push(it.path + ": " + String((e as Error).message || e)); }
    }
    return json({ done, failed });
  }

  if (action === "sales") {
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
    const { data: isAdmin } = await caller.rpc("is_portal_admin");
    if (isAdmin !== true) return json({ error: "Admins only" }, 403);
    const { data: orders } = await db.from("ebook_orders").select("created_at, ebook_id, email, amount_cents, currency, emailed_at, email_error, downloads").order("created_at", { ascending: false }).limit(200);
    const { data: books } = await db.from("ebooks").select("id, title, price_cents, active, payment_link_url").order("sort");
    return json({ orders: orders ?? [], books: books ?? [] });
  }

  return json({ error: "Unknown action" }, 400);
});
