import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { label: string; gf: number; gc: number; diff: number };

export function TimelineChart({ data }: { data: Row[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
      <h3 className="font-display text-lg tracking-[0.25em] text-aureon-blue mb-4">TIMELINE · FRANJAS DE 5'</h3>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="#ffffff15" />
            <XAxis dataKey="label" stroke="#ffffffaa" fontSize={11} />
            <YAxis stroke="#ffffffaa" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            <Legend wrapperStyle={{ color: "#fff", fontSize: 12 }} />
            <Bar dataKey="gf" name="Goles a favor" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gc" name="Goles en contra" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-8 gap-1 text-[10px] uppercase tracking-wider text-center font-display">
        {data.map((r) => (
          <div key={r.label} className={`rounded px-1 py-1 ${r.diff > 0 ? "bg-emerald-500/20 text-emerald-200" : r.diff < 0 ? "bg-red-500/20 text-red-200" : "bg-white/5 text-white/60"}`}>
            {r.diff > 0 ? "+" : ""}{r.diff}
          </div>
        ))}
      </div>
    </div>
  );
}
