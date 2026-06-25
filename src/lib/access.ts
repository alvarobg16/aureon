import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AccessStatus = "loading" | "no-access" | "pending" | "active" | "expired";

export type ModuleAccessInfo = {
  status: AccessStatus;
  startsAt?: string;
  endsAt?: string;
  daysToExpire?: number;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function computeStatus(um: { starts_at: string; ends_at: string; disabled?: boolean } | null | undefined): ModuleAccessInfo {
  if (!um) return { status: "no-access" };
  if (um.disabled) return { status: "no-access" };
  const today = todayStr();
  let status: AccessStatus = "active";
  if (today < um.starts_at) status = "pending";
  else if (today > um.ends_at) status = "expired";
  return { status, startsAt: um.starts_at, endsAt: um.ends_at, daysToExpire: daysBetween(today, um.ends_at) };
}

export function useModuleAccess(moduleKey: string): ModuleAccessInfo {
  const { user, isAdmin, loading } = useAuth();
  const [info, setInfo] = useState<ModuleAccessInfo>({ status: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) { setInfo({ status: "no-access" }); return; }
    if (isAdmin) { setInfo({ status: "active" }); return; }

    let cancelled = false;
    (async () => {
      const parentKey = moduleKey.includes(".") ? moduleKey.split(".")[0] : null;
      const keysToFetch = parentKey ? [moduleKey, parentKey] : [moduleKey];

      const { data: mods } = await supabase
        .from("modules").select("id, key").in("key", keysToFetch);
      if (!mods || mods.length === 0) { if (!cancelled) setInfo({ status: "no-access" }); return; }

      const ids = mods.map((m) => m.id);
      const { data: ums } = await supabase
        .from("user_modules")
        .select("module_id, starts_at, ends_at, disabled")
        .eq("user_id", user.id).in("module_id", ids);

      if (cancelled) return;
      const byKey = new Map<string, { starts_at: string; ends_at: string; disabled: boolean }>();
      for (const u of ums ?? []) {
        const mod = mods.find((m) => m.id === u.module_id);
        if (mod) byKey.set(mod.key, { starts_at: u.starts_at, ends_at: u.ends_at, disabled: (u as { disabled?: boolean }).disabled ?? false });
      }

      if (parentKey) {
        const parentInfo = computeStatus(byKey.get(parentKey));
        if (parentInfo.status !== "active") { setInfo(parentInfo); return; }
        const childRow = byKey.get(moduleKey);
        if (childRow) { setInfo(computeStatus(childRow)); return; }
        // No explicit child row → inherit parent (backwards-compat)
        setInfo(computeStatus(byKey.get(parentKey)));
      } else {
        setInfo(computeStatus(byKey.get(moduleKey)));
      }
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin, loading, moduleKey]);

  return info;
}

export type EnabledModule = {
  key: string;
  label: string;
  route: string;
  status: AccessStatus;
  endsAt?: string;
};

export function useUserModules(): { items: EnabledModule[]; loading: boolean } {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [items, setItems] = useState<EnabledModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setItems([]); setLoading(false); return; }

    (async () => {
      setLoading(true);
      const { data: mods } = await supabase.from("modules").select("id, key, label, route");
      if (isAdmin) {
        setItems((mods ?? []).map((m) => ({ key: m.key, label: m.label, route: m.route, status: "active" as const })));
        setLoading(false);
        return;
      }
      const { data: ums } = await supabase
        .from("user_modules").select("module_id, starts_at, ends_at")
        .eq("user_id", user.id);
      const byMod = new Map((ums ?? []).map((u) => [u.module_id, u]));
      const today = todayStr();
      const out: EnabledModule[] = [];
      for (const m of mods ?? []) {
        const um = byMod.get(m.id);
        if (!um) continue;
        let status: AccessStatus = "active";
        if (today < um.starts_at) status = "pending";
        else if (today > um.ends_at) status = "expired";
        out.push({ key: m.key, label: m.label, route: m.route, status, endsAt: um.ends_at });
      }
      setItems(out);
      setLoading(false);
    })();
  }, [user, isAdmin, authLoading]);

  return { items, loading };
}
