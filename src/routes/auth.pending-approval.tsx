import { createFileRoute } from "@tanstack/react-router";
import { Clock, ShieldAlert, ShieldX, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth/pending-approval")({
  component: PendingApproval,
});

function PendingApproval() {
  const status =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("status") ?? "pending"
      : "pending";

  const cfg: Record<string, { icon: typeof Clock; title: string; desc: string; tone: string }> = {
    pending: {
      icon: Clock,
      title: "Cuenta pendiente de aprobación",
      desc: "Tu registro ha sido recibido. El administrador debe aprobar manualmente tu acceso antes de que puedas entrar a la plataforma. Recibirás acceso en cuanto sea revisado.",
      tone: "text-amber-300",
    },
    suspended: {
      icon: ShieldAlert,
      title: "Cuenta suspendida",
      desc: "Tu cuenta ha sido suspendida temporalmente. Contacta con el administrador para más información.",
      tone: "text-amber-400",
    },
    rejected: {
      icon: ShieldX,
      title: "Acceso denegado",
      desc: "Tu solicitud de acceso ha sido rechazada. Si crees que es un error, contacta con el administrador.",
      tone: "text-red-400",
    },
    approved: {
      icon: ShieldCheck,
      title: "Cuenta aprobada",
      desc: "Tu cuenta ya está aprobada. Vuelve al login para entrar.",
      tone: "text-emerald-400",
    },
  };

  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;

  return (
    <div className="min-h-screen aureon-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8 text-center">
        <Icon className={`w-12 h-12 mx-auto ${c.tone}`} />
        <h1 className="mt-4 font-display text-2xl tracking-[0.1em] text-white">{c.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
        <a
          href="/auth"
          className="mt-6 inline-flex px-4 py-2 rounded-md bg-aureon-orange text-black text-sm font-display tracking-[0.15em]"
        >
          VOLVER AL LOGIN
        </a>
      </div>
    </div>
  );
}
