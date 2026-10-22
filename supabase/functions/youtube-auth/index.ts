// Connects Christopher's YouTube channel to the admin page (Social media tab).
// Deployed as the "youtube-auth" Edge Function with JWT verification OFF, because Google's redirect
// back here carries no Supabase login. The "start" step checks the caller is a portal admin itself.
//   POST { action: "start" }  (admin, with Authorization header) -> { url } to send the browser to Google
//   GET  ?code=...&state=...   (Google redirect)                  -> saves the channel, sends the browser back to /admin/
// Needs secrets YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET (Google Cloud OAuth client, type "Web application",
// redirect URI = https://dhkyyhbfybbxczveyvfw.supabase.co/functions/v1/youtube-auth).
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://christopherthegoodgringo.com";
const ALLOWED_ORIGINS = [SITE, "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];
const SCOPES = ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.upload"];

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const back = (result: string) => Response.redirect(SITE + "/admin/?youtube=" + encodeURIComponent(result) + "#social", 302);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("YOUTUBE_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET") ?? "";
  const redirectUri = url + "/functions/v1/youtube-auth";
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) Admin page asks where to send the browser.
  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Please sign in again." });
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: isAdmin } = await caller.rpc("is_portal_admin");
    if (isAdmin !== true) return reply(403, { error: "Only admins can do this." });
    if (!clientId || !clientSecret) {
      // Say which name is missing (never the values), and list similar-looking names that do exist.
      const missing = [!clientId && "YOUTUBE_CLIENT_ID", !clientSecret && "YOUTUBE_CLIENT_SECRET"].filter(Boolean).join(" and ");
      const similar = Object.keys(Deno.env.toObject()).filter((k) => /youtube|client|google|secret/i.test(k) && !/^SUPABASE_/.test(k));
      return reply(400, { error: "YouTube isn't set up yet. Supabase is missing the secret named " + missing + "." +
        (similar.length ? " Secret names found: " + similar.join(", ") + "." : " No similar secret names were found.") });
    }
    const { data: me } = await caller.auth.getUser();
    const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    await admin.from("oauth_states").delete().lt("created_at", new Date(Date.now() - 3600e3).toISOString());
    const { error } = await admin.from("oauth_states").insert({ state, user_id: me!.user!.id });
    if (error) return reply(500, { error: error.message });
    const q = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "),
      access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
    });
    return reply(200, { url: "https://accounts.google.com/o/oauth2/v2/auth?" + q.toString() });
  }

  // 2) Google sends the browser back here.
  if (req.method === "GET") {
    const p = new URL(req.url).searchParams;
    if (p.get("error")) return back(p.get("error") === "access_denied" ? "cancelled" : "error");
    const code = p.get("code") ?? "", state = p.get("state") ?? "";
    if (!code || !state) return back("error");
    const { data: st } = await admin.from("oauth_states").select("*").eq("state", state).maybeSingle();
    await admin.from("oauth_states").delete().eq("state", state);
    if (!st || Date.now() - Date.parse(st.created_at) > 15 * 60e3) return back("expired");

    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    }).then((r) => r.json());
    if (!tok.access_token) return back("error");
    const { data: existing } = await admin.from("youtube_connection").select("refresh_token").eq("id", 1).maybeSingle();
    const refresh = tok.refresh_token || existing?.refresh_token;
    if (!refresh) return back("error");

    const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: "Bearer " + tok.access_token },
    }).then((r) => r.json());
    const c = ch.items && ch.items[0];
    if (!c) return back("nochannel");
    const { error } = await admin.from("youtube_connection").upsert({
      id: 1, channel_id: c.id, channel_title: c.snippet?.title ?? "", channel_thumbnail: c.snippet?.thumbnails?.default?.url ?? null,
      refresh_token: refresh, connected_at: new Date().toISOString(),
    });
    return back(error ? "error" : "connected");
  }

  return reply(405, { error: "Method not allowed" });
});
