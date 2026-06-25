import { Insight } from "@/lib/statsEngine";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
      <h3 className="font-display text-lg tracking-[0.25em] text-aureon-blue mb-4">INSIGHTS AUTOMÁTICOS</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((i, idx) => {
          const Icon = i.tone === "good" ? TrendingUp : i.tone === "bad" ? AlertTriangle : Info;
          const ring = i.tone === "good" ? "ring-emerald-400/40 bg-emerald-500/10" :
                       i.tone === "bad"  ? "ring-red-400/40 bg-red-500/10" :
                                           "ring-white/15 bg-white/5";
          const color = i.tone === "good" ? "text-emerald-300" : i.tone === "bad" ? "text-red-300" : "text-white/70";
          return (
            <div key={idx} className={`rounded-xl border border-white/10 ring-1 ${ring} p-4`}>
              <div className={`flex items-center gap-2 ${color}`}>
                <Icon className="w-4 h-4" />
                <p className="font-display text-sm tracking-wider">{i.title}</p>
              </div>
              <p className="text-xs text-white/80 mt-2">{i.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
