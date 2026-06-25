import { Link } from "@tanstack/react-router";
import { ShieldAlert, Clock, Ban, CalendarX } from "lucide-react";
import type { AccessStatus } from "@/lib/access";

export function AccessBlocked({
  status,
  moduleLabel,
  endsAt,
  startsAt,
}: {
  status: Exclude<AccessStatus, "active" | "loading">;
  moduleLabel?: string;
  endsAt?: string;
  startsAt?: string;
}) {
  const cfg = {
    "no-access": {
      icon: Ban,
      title: "Acceso bloqueado",
      desc: `No tienes acceso a este módulo${moduleLabel ? ` (${moduleLabel})` : ""}. Contacta con el administrador para solicitar acceso.`,
    },
    pending: {
      icon: Clock,
      title: "Acceso aún no disponible",
      desc: `El acceso a este módulo comenzará el ${startsAt ?? ""}.`,
    },
    expired: {
      icon: CalendarX,
      title: "Módulo caducado",
      desc: `Tu acceso a este módulo finalizó el ${endsAt ?? ""}. Contacta con el administrador para renovarlo.`,
    },
  }[status];

  const Icon = cfg.icon;
  return (
    <div className="relative min-h-screen aureon-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-aureon-red/15 flex items-center justify-center">
          <Icon className="w-8 h-8 text-aureon-red" />
        </div>
        <h1 className="mt-4 font-display text-2xl tracking-[0.1em] text-white">{cfg.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{cfg.desc}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/plataforma" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-aureon-orange text-black text-sm font-display tracking-[0.15em] hover:bg-aureon-orange/90">
            <ShieldAlert className="w-4 h-4" /> VOLVER
          </Link>
        </div>
      </div>
    </div>
  );
}
