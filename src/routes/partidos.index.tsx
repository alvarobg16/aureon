import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { loadEnabledModules } from "@/lib/modules";

export const Route = createFileRoute("/partidos/")({
  head: () => ({
    meta: [
      { title: "Gestión de Partidos — Aureon Futsal Pro Suite" },
      { name: "description", content: "Live y Post-partido: gestiona estadísticas de cada encuentro." },
    ],
  }),
  component: PartidosHub,
});

function PartidosHub() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => loadEnabledModules());
  useEffect(() => {
    const h = () => setEnabled(loadEnabledModules());
    window.addEventListener("aureon:modules-changed", h);
    return () => window.removeEventListener("aureon:modules-changed", h);
  }, []);
  const liveOn = enabled["partidos.live"] !== false;
  const postOn = enabled["partidos.post"] !== false;

  return (
    <ModuleShell title="GESTIÓN DE PARTIDOS" subtitle="Live · Post-partido">
      <div className="grid gap-5 sm:grid-cols-2">
        {liveOn ? (
          <Link
            to="/partidos/live"
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-aureon-red/70 to-aureon-orange/30 ring-1 ring-aureon-red/40 p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.2_28/0.6)]"
          >
            <Radio className="w-9 h-9 text-white" />
            <h2 className="mt-3 font-display text-2xl tracking-[0.06em] text-white">LIVE</h2>
            <p className="mt-2 text-sm text-white/85">Registro de partido en directo: marcador, cronómetro, faltas y acciones.</p>
          </Link>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-background/40 p-6 opacity-60">
            <Radio className="w-9 h-9 text-white/60" />
            <h2 className="mt-3 font-display text-2xl tracking-[0.06em] text-white/70">LIVE</h2>
            <p className="mt-2 text-sm text-white/60">Módulo deshabilitado en Configuración.</p>
          </div>
        )}

        {postOn ? (
          <Link
            to="/partidos/post"
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-aureon-blue/70 to-aureon-blue/20 ring-1 ring-aureon-blue/40 p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.2_240/0.6)]"
          >
            <ClipboardCheck className="w-9 h-9 text-white" />
            <h2 className="mt-3 font-display text-2xl tracking-[0.06em] text-white">POST-PARTIDO</h2>
            <p className="mt-2 text-sm text-white/85">Introduce y consulta estadísticas de un partido.</p>
          </Link>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-background/40 p-6 opacity-60">
            <ClipboardCheck className="w-9 h-9 text-white/60" />
            <h2 className="mt-3 font-display text-2xl tracking-[0.06em] text-white/70">POST-PARTIDO</h2>
            <p className="mt-2 text-sm text-white/60">Módulo deshabilitado en Configuración.</p>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
