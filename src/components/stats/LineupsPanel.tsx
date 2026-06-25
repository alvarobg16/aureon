import { useMemo, useState } from "react";
import { LineupRow, StatPlayer, playerName, topLineups } from "@/lib/statsEngine";

type Props = { lineups: LineupRow[]; players: StatPlayer[] };

export function LineupsPanel({ lineups, players }: Props) {
  const [tab, setTab] = useState<"uses" | "diff" | "vulnerable">("uses");
  const rows = useMemo(() => topLineups(lineups, tab, 8), [lineups, tab]);

  if (lineups.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-6 text-center text-white/70">
        Sin datos de quintetos todavía. Necesitas registrar acciones con el quinteto en pista marcado en LIVE.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg tracking-[0.25em] text-aureon-blue">QUINTETOS</h3>
        <div className="flex gap-1 rounded-lg bg-black/30 p-1">
          {([
            { k: "uses", l: "Más utilizados" },
            { k: "diff", l: "Más efectivos" },
            { k: "vulnerable", l: "Más vulnerables" },
          ] as const).map(o => (
            <button key={o.k} onClick={() => setTab(o.k)}
              className={`text-xs font-display tracking-wider px-3 py-1.5 rounded-md transition ${
                tab === o.k ? "bg-aureon-orange text-black" : "text-white/70 hover:text-white"
              }`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-[10px] uppercase tracking-[0.2em] text-white font-display">
            <tr>
              <th className="text-left p-2">Quinteto</th>
              <th className="text-right p-2">Usos</th>
              <th className="text-right p-2">GF</th>
              <th className="text-right p-2">GC</th>
              <th className="text-right p-2">+/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="p-2 text-white">
                  <div className="flex flex-wrap gap-1">
                    {r.ids.map((id) => (
                      <span key={id} className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                        {playerName(players, id)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-2 text-right tabular-nums text-white">{r.uses}</td>
                <td className="p-2 text-right tabular-nums text-aureon-blue">{r.goalsFor}</td>
                <td className="p-2 text-right tabular-nums text-aureon-red">{r.goalsAgainst}</td>
                <td className={`p-2 text-right tabular-nums font-display ${r.diff >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {r.diff > 0 ? "+" : ""}{r.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
