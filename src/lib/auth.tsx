import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export type AppRole = "admin" | "user";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  isAdmin: boolean;
  approvalStatus: ApprovalStatus | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string; status?: ApprovalStatus }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshRole: () => Promise<void>;
};

const STATUS_MESSAGES: Record<ApprovalStatus, string> = {
  pending: "Tu cuenta está pendiente de aprobación por el administrador.",
  approved: "",
  rejected: "Tu acceso ha sido denegado. Contacta con el administrador.",
  suspended: "Tu cuenta está suspendida. Contacta con el administrador.",
};

export function approvalMessage(s: ApprovalStatus | null | undefined) {
  if (!s) return "Cuenta no autorizada.";
  return STATUS_MESSAGES[s] || "Cuenta no autorizada.";
}

const Ctx = createContext<AuthCtx | null>(null);

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "aureon.deviceId";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + "-" + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export async function logActivity(action: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from("activity_logs").insert({
      user_id: uid,
      action,
      metadata: metadata as never,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
  } catch {
    /* silent */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string | undefined) => {
    if (!uid) { setRole(null); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const roles = (data ?? []).map((r) => r.role as AppRole);
    setRole(roles.includes("admin") ? "admin" : roles.includes("user") ? "user" : null);
  };

  const loadApproval = async (uid: string | undefined): Promise<ApprovalStatus | null> => {
    if (!uid) { setApprovalStatus(null); return null; }
    const { data } = await supabase.from("profiles").select("approval_status").eq("user_id", uid).maybeSingle();
    const s = (data?.approval_status ?? null) as ApprovalStatus | null;
    setApprovalStatus(s);
    return s;
  };

  // Cierra sesión automáticamente si el usuario no está aprobado
  const enforceApproval = async (uid: string | undefined) => {
    if (!uid) return;
    const status = await loadApproval(uid);
    if (status && status !== "approved") {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setRole(null);
      if (typeof window !== "undefined") {
        const onPending = window.location.pathname === "/auth/pending-approval";
        if (!onPending) {
          window.location.href = `/auth/pending-approval?status=${status}`;
        }
      }
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => {
        loadRole(s?.user?.id);
        enforceApproval(s?.user?.id);
      }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      Promise.all([
        loadRole(data.session?.user?.id),
        enforceApproval(data.session?.user?.id),
      ]).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const ctx: AuthCtx = {
    session,
    user,
    role,
    isAdmin: role === "admin",
    approvalStatus,
    loading,
    refreshRole: async () => { await loadRole(user?.id); },
    signInWithEmail: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        await logActivity("login_failed", { email, reason: error.message });
        return { error: error.message };
      }
      // Verificar approval antes de continuar
      const uid = data.user?.id;
      const { data: prof } = await supabase.from("profiles").select("approval_status").eq("user_id", uid!).maybeSingle();
      const status = (prof?.approval_status ?? "pending") as ApprovalStatus;
      if (status !== "approved") {
        await supabase.auth.signOut();
        await logActivity("login_blocked_approval", { email, status });
        return { error: approvalMessage(status), status };
      }
      await logActivity("login_success", { email });
      return { status };
    },
    signUpWithEmail: async (email, password, fullName) => {
      const redirectUrl = `${window.location.origin}/auth/verify-pending`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
      });
      if (error) return { error: error.message };
      return {};
    },
    signInWithGoogle: async () => {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) return { error: result.error.message ?? "Error con Google" };
      return {};
    },
    signOut: async () => {
      await logActivity("logout", {});
      await supabase.auth.signOut();
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) return { error: error.message };
      return {};
    },
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
