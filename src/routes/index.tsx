import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ImageIcon } from "lucide-react";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aureon Futsal Pro Suite — Inicio" },
      { name: "description", content: "Plataforma integral de gestión para fútbol sala: equipo, tareas, club, estadísticas y temporadas." },
      { property: "og:title", content: "Aureon Futsal Pro Suite" },
      { property: "og:description", content: "Plataforma integral de gestión para fútbol sala." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { settings } = useSettings();
  return (
    <div className="relative h-screen overflow-hidden aureon-bg">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-aureon-blue/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-aureon-orange/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-aureon-red/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 aureon-grid opacity-40" />

      <main className="relative h-full flex flex-col items-center justify-between px-6 py-10">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl text-center gap-8">
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-[0.08em] leading-none">
            <span className="aureon-title-gradient">{settings.heroTitleLine1}</span>
            <br />
            <span className="text-foreground/95">{settings.heroTitleLine2}</span>
          </h1>

          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl border border-aureon-blue/40 bg-background/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_60px_-15px_oklch(0.7_0.18_240/0.6)] overflow-hidden">
            <div className="absolute inset-0 rounded-2xl aureon-logo-frame" />
            {settings.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="Logotipo" className="relative w-full h-full object-contain p-2" />
            ) : (
              <div className="relative flex flex-col items-center gap-2 text-muted-foreground/70">
                <ImageIcon className="w-10 h-10" />
                <span className="text-[10px] uppercase tracking-[0.3em]">Logotipo</span>
              </div>
            )}
          </div>

          <Link
            to="/plataforma"
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-display tracking-[0.25em] text-base sm:text-lg text-white aureon-cta shadow-[0_10px_40px_-10px_oklch(0.65_0.2_30/0.7)] hover:scale-105 transition-transform"
          >
            <span>{settings.ctaText}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <footer className="text-center text-xs sm:text-sm uppercase tracking-[0.35em] text-muted-foreground/80">
          {settings.footerText}
        </footer>
      </main>
    </div>
  );
}
