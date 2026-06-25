import { useLiveSync } from "@/hooks/useLiveSync";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

function timeAgo(t: number | null) {
  if (!t) return "—";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}min`;
  const h = Math.floor(m / 60);
  return `hace ${h}h`;
}

export function LiveSyncBadge() {
  const { status, pending, lastSyncAt, lastError, retry } = useLiveSync();

  const cfg = (() => {
    switch (status) {
      case "online":
        return { color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: <Wifi className="w-3.5 h-3.5" />, label: "Sincronizado", sub: timeAgo(lastSyncAt) };
      case "offline":
        return { color: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: <WifiOff className="w-3.5 h-3.5" />, label: "Sin conexión", sub: `${pending} pendientes` };
      case "syncing":
        return { color: "bg-aureon-blue/15 text-aureon-blue border-aureon-blue/30", icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: "Sincronizando", sub: `${pending} restantes` };
      case "error":
        return { color: "bg-aureon-red/15 text-aureon-red border-aureon-red/30", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Error de sync", sub: `${pending} pendientes` };
    }
  })();

  return (
    <button
      onClick={() => retry()}
      title={lastError || cfg.label}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-display tracking-[0.15em] ${cfg.color}`}
    >
      {cfg.icon}
      <span className="hidden sm:inline">{cfg.label}</span>
      <span className="opacity-70">· {cfg.sub}</span>
    </button>
  );
}
