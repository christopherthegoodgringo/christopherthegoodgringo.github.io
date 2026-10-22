// Updates views, likes and comments for every Short on YouTube, and moves scheduled Shorts to "published"
// once YouTube has made them public. Called every 6 hours by pg_cron (header x-stats-token, checked against Vault)
// and by the "Refresh stats" button in the admin page (admin login). JWT verification OFF; it checks access itself.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://christopherthegoodgringo.com", "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-stats-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Who is calling: the scheduled job (token) or an admin (login).
  const statsToken = req.headers.get("x-stats-token") ?? "";
  let allowed = false;
  if (statsToken) {
    const { data } = await db.rpc("youtube_stats_token_ok", { p_token: statsToken });
    allowed = data === true;
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
      const { data } = await caller.rpc("is_portal_admin");
      allowed = data === true;
    }
  }
  if (!allowed) return reply(403, { error: "Not allowed." });

  const { data: conn } = await db.from("youtube_connection").select("refresh_token").eq("id", 1).maybeSingle();
  if (!conn?.refresh_token) return reply(200, { ok: true, updated: 0, note: "YouTube not connected" });
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("YOUTUBE_CLIENT_ID") ?? "", client_secret: Deno.env.get("YOUTUBE_CLIENT_SECRET") ?? "",
      refresh_token: conn.refresh_token, grant_type: "refresh_token",
    }),
  }).then((r) => r.json());
  if (!tok.access_token) return reply(400, { error: tok.error === "invalid_grant" ? "YouTube access has expired. Connect your channel again." : "Couldn't reach YouTube." });

  const { data: posts } = await db.from("social_posts").select("id,status,youtube_video_id,published_at,publish_at").not("youtube_video_id", "is", null);
  const list = posts ?? [];
  let updated = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    const r = await fetch("https://www.googleapis.com/youtube/v3/videos?part=statistics,status&id=" + batch.map((p) => p.youtube_video_id).join(","), {
      headers: { Authorization: "Bearer " + tok.access_token },
    });
    const j = await r.json();
    if (!r.ok) return reply(400, { error: "YouTube said: " + (j.error?.message ?? r.status) });
    const byId = new Map((j.items ?? []).map((it: any) => [it.id, it]));
    for (const p of batch) {
      const it: any = byId.get(p.youtube_video_id);
      if (!it) { await db.from("social_posts").update({ youtube_status: "not found", stats_updated_at: now }).eq("id", p.id); continue; }
      const s = it.statistics ?? {}, st = it.status ?? {};
      const views = Number(s.viewCount ?? 0), likes = Number(s.likeCount ?? 0), comments = Number(s.commentCount ?? 0);
      const patch: Record<string, unknown> = { views, likes, comments, stats_updated_at: now, youtube_status: st.uploadStatus === "processed" ? st.privacyStatus : st.uploadStatus };
      if (p.status === "scheduled" && st.privacyStatus === "public") { patch.status = "published"; patch.published_at = p.publish_at ?? now; }
      if ((st.uploadStatus === "rejected" || st.uploadStatus === "failed") && p.status !== "failed") {
        patch.status = "failed"; patch.error = "YouTube " + st.uploadStatus + " the video" + (st.rejectionReason ? ": " + st.rejectionReason : st.failureReason ? ": " + st.failureReason : "") + ".";
      }
      await db.from("social_posts").update(patch).eq("id", p.id);
      await db.from("social_stats").insert({ post_id: p.id, views, likes, comments });
      updated++;
    }
  }
  return reply(200, { ok: true, updated });
});
