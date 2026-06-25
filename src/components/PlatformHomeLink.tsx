import { Link, useRouter } from "@tanstack/react-router";
import { Home, ArrowLeft } from "lucide-react";

export function PlatformHomeLink({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Link
        to="/plataforma"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-aureon-orange text-black hover:brightness-110 transition-all shadow-[0_4px_18px_-6px_oklch(0.72_0.18_55/0.7)] font-display tracking-[0.25em] text-xs"
      >
        <Home className="w-4 h-4" />
        <span>INICIO</span>
      </Link>
      <button
        type="button"
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-aureon-red text-white hover:brightness-110 transition-all shadow-[0_4px_18px_-6px_oklch(0.62_0.22_28/0.7)] font-display tracking-[0.25em] text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>ATRÁS</span>
      </button>
    </div>
  );
}
