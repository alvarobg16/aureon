import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getDeviceId, logActivity } from "@/lib/auth";

export type DeviceState = "checking" | "ok" | "pending" | "blocked" | "noauth";

/** Asegura que el dispositivo actual está aprobado. Solo uno aprobado por usuario. */
export function useDeviceGuard(): DeviceState {
  const { user, loading } = useAuth();
  const [state, setState] = useState<DeviceState>("checking");

  useEffect(() => {
    if (loading) return;
    if (!user) { setState("noauth"); return; }
    let cancelled = false;
    (async () => {
      const deviceId = getDeviceId();
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const { data: mine } = await supabase.from("user_devices").select("*").eq("user_id", user.id);
      if (cancelled) return;
      const list = mine ?? [];
      const current = list.find((d) => d.device_id === deviceId);
      const approvedExists = list.some((d) => d.status === "approved");

      if (current?.status === "approved") {
        await supabase.from("user_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", current.id);
        if (!cancelled) setState("ok");
        return;
      }
      if (current?.status === "revoked") { if (!cancelled) setState("blocked"); return; }
      if (!current) {
        const token = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8).toUpperCase();
        const status = approvedExists ? "pending" : "approved";
        await supabase.from("user_devices").insert({
          user_id: user.id, device_id: deviceId, user_agent: ua,
          status, confirmation_token: token,
        });
        await logActivity(status === "approved" ? "device_approved" : "device_pending", { deviceId });
        if (!cancelled) setState(status === "approved" ? "ok" : "pending");
        return;
      }
      if (!cancelled) setState("pending");
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  return state;
}
