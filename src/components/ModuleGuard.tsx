import type { ReactNode } from "react";
import { useEffect } from "react";
import { useModuleAccess } from "@/lib/access";
import { AccessBlocked } from "@/components/AccessBlocked";
import { logActivity } from "@/lib/auth";

export function ModuleGuard({ moduleKey, label, children }: { moduleKey: string; label?: string; children: ReactNode }) {
  const access = useModuleAccess(moduleKey);

  useEffect(() => {
    if (access.status === "active") logActivity("module_access", { moduleKey });
    else if (access.status === "no-access" || access.status === "pending" || access.status === "expired") {
      logActivity("module_blocked", { moduleKey, reason: access.status });
    }
  }, [access.status, moduleKey]);

  if (access.status === "loading") {
    return <div className="min-h-screen aureon-bg flex items-center justify-center text-muted-foreground text-sm">Comprobando acceso…</div>;
  }
  if (access.status === "active") return <>{children}</>;
  return <AccessBlocked status={access.status} moduleLabel={label} endsAt={access.endsAt} startsAt={access.startsAt} />;
}
