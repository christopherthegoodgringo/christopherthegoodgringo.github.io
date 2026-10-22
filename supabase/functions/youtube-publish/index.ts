// Sends a Short from the admin page's Social media tab to YouTube. Admins only (JWT verification on).
//   { action: "publish", post_id } -> uploads the video (stored in parts in the social-videos bucket) to YouTube.
//        If the post has a future publish time, YouTube keeps it private and makes it public at that time by itself.
//        Runs in the background; the post's status goes publishing -> scheduled/published (or failed, with the reason).
//   { action: "update", post_id }  -> pushes title, description, tags, privacy and publish time changes to YouTube.
// Uses the channel connected through youtube-auth (refresh token in public.youtube_connection).
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://christopherthegoodgringo.com", "https://www.christopherthegoodgringo.com", "https://christopherthegoodgringo.github.io"];
const BUCKET = "social-videos";

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

type Post = Record<string, any>;

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Please sign in again." });
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: isAdmin } = await caller.rpc("is_portal_admin");
  if (isAdmin !== true) return reply(403, { error: "Only admins can do this." });
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: { action?: string; post_id?: string };
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid request." }); }
  const { data: post } = await db.from("social_posts").select("*").eq("id", String(body.post_id ?? "")).maybeSingle();
  if (!post) return reply(404, { error: "That Short wasn't found." });

  let token: string;
  try { token = await accessToken(db); } catch (e) { return reply(400, { error: (e as Error).message }); }

  if (body.action === "update") {
    if (!post.youtube_video_id) return reply(400, { error: "This Short isn't on YouTube yet." });
    const r = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,status", {
      method: "PUT",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.youtube_video_id, ...metadata(post, post.status === "scheduled") }),
    });
    const j = await r.json();
    if (!r.ok) return reply(400, { error: googleError(j) });
    await db.from("social_posts").update({ error: null, updated_at: new Date().toISOString() }).eq("id", post.id);
    return reply(200, { ok: true });
  }

  if (body.action !== "publish") return reply(400, { error: "Unknown action." });
  if (post.youtube_video_id) return reply(400, { error: "This Short is already on YouTube." });
  if (!post.video_parts || !post.video_size) return reply(400, { error: "Add the video file first." });
  if (!post.title.trim()) return reply(400, { error: "Add a title first." });
  if (post.status === "publishing") return reply(409, { error: "This Short is already being sent to YouTube." });

  await db.from("social_posts").update({ status: "publishing", error: null, updated_at: new Date().toISOString() }).eq("id", post.id);
  // @ts-ignore EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(upload(db, token, post).catch(async (e) => {
    await db.from("social_posts").update({ status: "failed", error: String((e as Error).message ?? e).slice(0, 1900), updated_at: new Date().toISOString() }).eq("id", post.id);
  }));
  return reply(202, { ok: true, status: "publishing" });
});

async function accessToken(db: any): Promise<string> {
  const { data: c } = await db.from("youtube_connection").select("refresh_token").eq("id", 1).maybeSingle();
  if (!c?.refresh_token) throw new Error("Connect your YouTube channel first.");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("YOUTUBE_CLIENT_ID") ?? "", client_secret: Deno.env.get("YOUTUBE_CLIENT_SECRET") ?? "",
      refresh_token: c.refresh_token, grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error === "invalid_grant" ? "YouTube access has expired. Connect your channel again." : "Couldn't reach YouTube: " + (j.error_description || j.error || r.status));
  return j.access_token;
}

// Title, description, tags and when/how it goes public. A future publish time means "private until then".
function metadata(post: Post, allowSchedule = true) {
  const when = post.publish_at ? Date.parse(post.publish_at) : 0;
  const scheduled = allowSchedule && when > Date.now() + 2 * 60e3;
  return {
    snippet: {
      title: post.title.slice(0, 100), description: post.description || "", tags: post.tags || [],
      categoryId: "19", defaultLanguage: post.language, defaultAudioLanguage: post.language,
    },
    status: scheduled
      ? { privacyStatus: "private", publishAt: new Date(when).toISOString(), selfDeclaredMadeForKids: false }
      : { privacyStatus: post.privacy || "public", selfDeclaredMadeForKids: false },
  };
}

function googleError(j: any) {
  const e = j && j.error;
  const reason = e && e.errors && e.errors[0] && e.errors[0].reason;
  if (reason === "quotaExceeded" || reason === "uploadLimitExceeded") return "YouTube's daily upload limit is reached. Try again tomorrow.";
  if (reason === "invalidPublishAt") return "YouTube didn't accept the publish time. Pick a time at least a few minutes from now.";
  return "YouTube said: " + ((e && e.message) || JSON.stringify(j).slice(0, 300));
}

async function upload(db: any, token: string, post: Post) {
  const total = Number(post.video_size);
  const type = post.video_type || "video/mp4";
  const meta = metadata(post);
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token, "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(total), "X-Upload-Content-Type": type,
    },
    body: JSON.stringify(meta),
  });
  if (!init.ok) throw new Error(googleError(await init.json().catch(() => ({}))));
  const session = init.headers.get("Location");
  if (!session) throw new Error("YouTube didn't start the upload.");

  let offset = 0, result: any = null;
  for (let i = 0; i < post.video_parts; i++) {
    const path = `posts/${post.id}/part-${String(i).padStart(3, "0")}`;
    const { data: blob, error } = await db.storage.from(BUCKET).download(path);
    if (error || !blob) throw new Error("Part " + (i + 1) + " of the video is missing. Upload the video again.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const end = offset + bytes.length - 1;
    const r = await fetch(session, {
      method: "PUT",
      headers: { "Content-Length": String(bytes.length), "Content-Range": `bytes ${offset}-${end}/${total}`, "Content-Type": type },
      body: bytes,
    });
    offset = end + 1;
    if (r.status === 308) continue;
    if (r.status === 200 || r.status === 201) { result = await r.json(); break; }
    throw new Error(googleError(await r.json().catch(() => ({ error: { message: "upload failed (" + r.status + ")" } }))));
  }
  if (!result || !result.id) throw new Error("YouTube didn't confirm the upload. Check the video file and try again.");

  const scheduled = meta.status.privacyStatus === "private" && !!(meta.status as any).publishAt;
  await db.from("social_posts").update({
    youtube_video_id: result.id,
    youtube_status: result.status?.uploadStatus ?? "uploaded",
    status: scheduled ? "scheduled" : "published",
    published_at: scheduled ? null : new Date().toISOString(),
    video_parts: 0, error: null, updated_at: new Date().toISOString(),
  }).eq("id", post.id);
  const paths = Array.from({ length: post.video_parts }, (_, i) => `posts/${post.id}/part-${String(i).padStart(3, "0")}`);
  await db.storage.from(BUCKET).remove(paths);
}
