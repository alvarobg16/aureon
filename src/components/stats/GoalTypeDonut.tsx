import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { StatGoal } from "@/lib/statsEngine";
import { getCategoryLabel, getSubLabel, type GoalSide } from "@/lib/goalCategories";

const PALETTE = [
  "#f97316", "#38bdf8", "#34d399", "#ef4444", "#a78bfa",
  "#facc15", "#22d3ee", "#fb7185", "#84cc16", "#e879f9",
  "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#0ea5e9",
];

export type GoalTypeSlice = {
  key: string;        // category|subcategory
  label: string;      // display label
  value: number;
  pct: number;
  color: string;
};

export function buildGoalTypeSlices(goals: StatGoal[], side: GoalSide): GoalTypeSlice[] {
  const counts = new Map<string, number>();
  for (const g of goals) {
    const cat = (g.category || "").trim() || "SIN CATEGORÍA";
    const sub = (g.subcategory || "").trim();
    const key = `${cat}|${sub}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = goals.length || 1;
  const arr: GoalTypeSlice[] = [];
  let i = 0;
  for (const [key, value] of counts.entries()) {
    const [cat, sub] = key.split("|");
    let label: string;
    if (cat === "SIN CATEGORÍA") label = "SIN CATEGORÍA";
    else if (sub) label = `${getCategoryLabel(side, cat)} · ${getSubLabel(side, cat, sub)}`;
    else label = getCategoryLabel(side, cat);
    arr.push({ key, label, value, pct: (value / total) * 100, color: PALETTE[i % PALETTE.length] });
    i++;
  }
  return arr.sort((a, b) => b.value - a.value);
}

type Props = {
  title: string;
  goals: StatGoal[];
  side: GoalSide;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
};

export function GoalTypeDonut({ title, goals, side, selectedKey, onSelect }: Props) {
  const slices = useMemo(() => buildGoalTypeSlices(goals, side), [goals, side]);
  const total = goals.length;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white font-display mb-3">{title}</p>
        <p className="text-center text-white/50 text-xs py-6">Sin goles registrados</p>
      </div>
    );
  }

  const selected = slices.find((s) => s.key === selectedKey) ?? null;

  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4">
      <div className="flex items-start justify-between mb-2 gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white font-display">{title}</p>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            className="text-[10px] uppercase tracking-wider text-white/60 hover:text-white"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
        <div className="relative" style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                stroke="none"
                onClick={(d: any) => onSelect(selectedKey === d.key ? null : d.key)}
              >
                {slices.map((s) => (
                  <Cell
                    key={s.key}
                    fill={s.color}
                    opacity={!selectedKey || selectedKey === s.key ? 1 : 0.25}
                    style={{ cursor: "pointer", outline: "none" }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0a0a0a", border: "1px solid #ffffff22", borderRadius: 8, fontSize: 11 }}
                formatter={(v: any, _n: any, p: any) => [`${v} · ${p.payload.pct.toFixed(0)}%`, p.payload.label]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-display text-2xl text-white tabular-nums">{selected ? selected.value : total}</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/60">
              {selected ? `${selected.pct.toFixed(0)}%` : "Goles"}
            </span>
          </div>
        </div>
        <ul className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
          {slices.map((s) => {
            const active = selectedKey === s.key;
            const dim = selectedKey && !active;
            return (
              <li key={s.key}>
                <button
                  onClick={() => onSelect(active ? null : s.key)}
                  className={`w-full flex items-center gap-2 text-left text-[11px] px-2 py-1 rounded transition ${
                    active ? "bg-white/10" : "hover:bg-white/5"
                  } ${dim ? "opacity-40" : ""}`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                  <span className="flex-1 text-white truncate" title={s.label}>{s.label}</span>
                  <span className="tabular-nums text-white/80">{s.value}</span>
                  <span className="tabular-nums text-white/50 w-9 text-right">{s.pct.toFixed(0)}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
