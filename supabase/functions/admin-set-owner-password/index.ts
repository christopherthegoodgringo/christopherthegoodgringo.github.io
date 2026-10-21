// Lets a portal admin set a temporary password for a business owner account.
// Only callers who pass is_portal_admin() can use it, and admin accounts cannot be changed here.
// Deployed to Supabase as the "admin-set-owner-password" Edge Function (JWT verification on).
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://christopherthegoodgringo.com",
  "https://www.christopherthegoodgringo.com",
  "https://christopherthegoodgringo.github.io",
];

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Please sign in again." });

  // 1) The caller must be a portal admin.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc("is_portal_admin");
  if (adminErr || isAdmin !== true) return reply(403, { error: "Only admins can do this." });

  // 2) Validate input.
  let body: { email?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid request." }); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: "Enter the owner's email address." });
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return reply(400, { error: "The temporary password must be 8-72 characters with a letter and a number." });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 3) Find the owner's account by email.
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return reply(500, { error: "Could not look up accounts." });
    const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (match) userId = match.id;
    if (data.users.length < 1000) break;
  }
  if (!userId) return reply(404, { error: "No account uses that email. The owner needs to create an account first." });

  // 4) Never change admin accounts from here.
  const { data: targetAdmin } = await admin.from("portal_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (targetAdmin) return reply(400, { error: "Admin passwords can't be changed here. Use Set or change password while signed in." });

  // 5) Set the temporary password and ask the owner to choose their own at next sign-in.
  const { data: existing } = await admin.auth.admin.getUserById(userId);
  const meta = { ...(existing?.user?.user_metadata ?? {}), must_change_password: true };
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (updErr) return reply(500, { error: "Could not set the password: " + updErr.message });

  return reply(200, { ok: true });
});
