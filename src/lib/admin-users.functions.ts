import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DELETED_USER_STATUSES = ["deleted", "removed", "archived", "inactive_deleted"] as const;

type AdminUserRow = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  modules_count: number;
  device_status: string;
  approval_status: string;
  created_at: string | null;
  provider: string;
};

type AdminUserProfile = Pick<AdminUserRow, "user_id" | "email" | "full_name">;

function isDeletedStatus(status: string | null | undefined) {
  return DELETED_USER_STATUSES.includes((status ?? "").trim().toLowerCase() as (typeof DELETED_USER_STATUSES)[number]);
}

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const isAdmin = (data ?? []).some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("No autorizado");
}

async function getActiveAuthUserIds(supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"]) {
  const activeIds = new Set<string>();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const users = data.users ?? [];
    users.forEach((user) => {
      if (!user.deleted_at && !isDeletedStatus(String(user.app_metadata?.status ?? ""))) {
        activeIds.add(user.id);
      }
    });

    if (users.length < perPage) break;
    page += 1;
  }

  return activeIds;
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const activeAuthUserIds = await getActiveAuthUserIds(supabaseAdmin);

    if (activeAuthUserIds.size === 0) return [] satisfies AdminUserRow[];

    const deletedStatusList = `(${DELETED_USER_STATUSES.map((status) => `"${status}"`).join(",")})`;
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name, approval_status, created_at")
      .not("approval_status", "in", deletedStatusList)
      .order("created_at", { ascending: false });
    if (profilesError) throw new Error(profilesError.message);

    const activeProfiles = (profiles ?? []).filter(
      (profile) => activeAuthUserIds.has(profile.user_id) && !isDeletedStatus(profile.approval_status),
    );

    if (activeProfiles.length === 0) return [] satisfies AdminUserRow[];

    const userIds = activeProfiles.map((profile) => profile.user_id);
    const [{ data: roles, error: rolesError }, { data: ums, error: umsError }, { data: devs, error: devsError }, { data: logs, error: logsError }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabaseAdmin.from("user_modules").select("user_id").in("user_id", userIds),
      supabaseAdmin.from("user_devices").select("user_id, status, user_agent").in("user_id", userIds),
      supabaseAdmin.from("activity_logs").select("user_id, action, metadata, created_at").in("user_id", userIds).in("action", ["login_success", "login_blocked_approval"]).order("created_at", { ascending: false }).limit(500),
    ]);
    const firstError = rolesError ?? umsError ?? devsError ?? logsError;
    if (firstError) throw new Error(firstError.message);

    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((role) => {
      if (role.role === "admin" || !roleMap.get(role.user_id)) roleMap.set(role.user_id, role.role);
    });

    const moduleCount = new Map<string, number>();
    (ums ?? []).forEach((module) => moduleCount.set(module.user_id, (moduleCount.get(module.user_id) ?? 0) + 1));

    const deviceMap = new Map<string, string>();
    (devs ?? []).forEach((device) => {
      const current = deviceMap.get(device.user_id);
      if (device.status === "approved" || !current) deviceMap.set(device.user_id, device.status);
    });

    const providerMap = new Map<string, string>();
    (logs ?? []).forEach((log) => {
      const metadata = (log.metadata ?? {}) as Record<string, unknown>;
      if (log.user_id && !providerMap.has(log.user_id)) {
        providerMap.set(log.user_id, typeof metadata.provider === "string" ? metadata.provider : "email");
      }
    });

    return activeProfiles.map((profile) => ({
      user_id: profile.user_id,
      email: profile.email,
      full_name: profile.full_name,
      role: roleMap.get(profile.user_id) ?? "user",
      modules_count: moduleCount.get(profile.user_id) ?? 0,
      device_status: deviceMap.get(profile.user_id) ?? "—",
      approval_status: profile.approval_status ?? "approved",
      created_at: profile.created_at ?? null,
      provider: providerMap.get(profile.user_id) ?? "email",
    })) satisfies AdminUserRow[];
  });

export const listAdminUserProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const activeAuthUserIds = await getActiveAuthUserIds(supabaseAdmin);
    if (activeAuthUserIds.size === 0) return [] satisfies AdminUserProfile[];

    const deletedStatusList = `(${DELETED_USER_STATUSES.map((status) => `"${status}"`).join(",")})`;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name")
      .not("approval_status", "in", deletedStatusList)
      .order("email");
    if (error) throw new Error(error.message);

    return (data ?? []).filter((profile) => activeAuthUserIds.has(profile.user_id)) satisfies AdminUserProfile[];
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ targetUserId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.targetUserId === context.userId) {
      throw new Error("No puedes eliminar tu propia cuenta");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort: drop auth user (cascade FKs remove profile/user_roles/user_devices/user_modules).
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);

    // Belt-and-suspenders: ensure no residual rows remain in public schema even if
    // auth.users delete failed (e.g., user already removed) so the admin panel stops showing them.
    await supabaseAdmin.from("user_devices").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("user_modules").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
    const { error: profErr } = await supabaseAdmin.from("profiles").delete().eq("user_id", data.targetUserId);

    if (authErr && profErr) throw new Error(authErr.message);
    return { ok: true };
  });

export const updateUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      targetUserId: z.string().uuid(),
      newPassword: z.string().min(8, "Mínimo 8 caracteres"),
      requireChange: z.boolean().optional().default(false),
      signOutSessions: z.boolean().optional().default(true),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: data.requireChange })
      .eq("user_id", data.targetUserId);

    if (data.signOutSessions) {
      try { await supabaseAdmin.auth.admin.signOut(data.targetUserId, "global"); } catch { /* best effort */ }
    }

    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "admin_password_reset",
      metadata: {
        target_user: data.targetUserId,
        require_change: data.requireChange,
        signed_out_sessions: data.signOutSessions,
      } as never,
    });

    return { ok: true };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      currentPassword: z.string().min(1, "Contraseña actual requerida"),
      newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.currentPassword === data.newPassword) {
      throw new Error("La nueva contraseña no puede ser igual a la anterior.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userInfo, error: gErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (gErr || !userInfo?.user?.email) throw new Error("Usuario no encontrado");
    const email = userInfo.user.email;

    const { createClient } = await import("@supabase/supabase-js");
    const verifier = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { error: signErr } = await verifier.auth.signInWithPassword({ email, password: data.currentPassword });
    if (signErr) throw new Error("La contraseña actual es incorrecta.");
    await verifier.auth.signOut();

    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.newPassword,
    });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("user_id", context.userId);

    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "user_password_changed",
      metadata: {} as never,
    });

    return { ok: true };
  });

export const getMustChangePassword = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("must_change_password")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { mustChange: Boolean(data?.must_change_password) };
  });
