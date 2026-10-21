// Admin tools for business owner accounts. Only callers who pass is_portal_admin() can use it,
// and admin accounts can never be changed or deleted here.
// Deployed to Supabase as the "admin-set-owner-password" Edge Function (JWT verification on).
//   { action: "list" }                         -> owner accounts
//   { action: "set_password", email, password } -> temporary password (default action)
//   { action: "delete", user_id }               -> delete an owner account and its claims
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
  const { data: me } = await caller.auth.getUser();

  let body: { action?: unknown; email?: unknown; password?: unknown; user_id?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid request." }); }
  const action = String(body.action ?? "set_password");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: adminRows } = await admin.from("portal_admins").select("user_id");
  const adminIds = new Set((adminRows ?? []).map((r: { user_id: string }) => r.user_id));

  async function allUsers() {
    const users: Array<Record<string, any>> = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }
    return users;
  }

  try {
    if (action === "list") {
      const owners = (await allUsers())
        .filter((u) => !adminIds.has(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          confirmed: !!(u.email_confirmed_at || u.confirmed_at),
          temp_password: !!(u.user_metadata && u.user_metadata.must_change_password),
        }));
      return reply(200, { owners });
    }

    if (action === "delete") {
      const userId = String(body.user_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return reply(400, { error: "Invalid account." });
      if (adminIds.has(userId) || userId === me?.user?.id) return reply(400, { error: "Admin accounts can't be deleted here." });
      // Claims, edits and upgrade requests are removed with the account; published listings stay on the site.
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return reply(500, { error: "Could not delete the account: " + error.message });
      return reply(200, { ok: true });
    }

    // Default: set a temporary password.
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: "Enter the owner's email address." });
    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return reply(400, { error: "The temporary password must be 8-72 characters with a letter and a number." });
    }
    const target = (await allUsers()).find((u) => (u.email ?? "").toLowerCase() === email);
    if (!target) return reply(404, { error: "No account uses that email. The owner needs to create an account first." });
    if (adminIds.has(target.id)) return reply(400, { error: "Admin passwords can't be changed here. Use Set or change password while signed in." });
    const meta = { ...(target.user_metadata ?? {}), must_change_password: true };
    const { error: updErr } = await admin.auth.admin.updateUserById(target.id, { password, email_confirm: true, user_metadata: meta });
    if (updErr) return reply(500, { error: "Could not set the password: " + updErr.message });
    return reply(200, { ok: true });
  } catch (e) {
    return reply(500, { error: "Something went wrong: " + (e instanceof Error ? e.message : String(e)) });
  }
});
