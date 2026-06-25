import { bucketGrid } from "@/lib/statsEngine";

type Props = {
  title?: string;
  shots: Array<{ x: number | null; y: number | null }>;
  goals: Array<{ x: number | null; y: number | null }>;
  saves?: Array<{ x: number | null; y: number | null }>;
};

/**
 * Heatmap 3×3 sobre portería con:
 *  - intensidad por nº de tiros
 *  - % de tiros y % de gol por celda
 */
export function GoalHeatmap({ title, shots, goals, saves = [] }: Props) {
  const cols = 3, rows = 3;
  const gShots = bucketGrid(shots, cols, rows);
  const gGoals = bucketGrid(goals, cols, rows);
  const gSaves = bucketGrid(saves, cols, rows);
  const totalShots = shots.length;
  const max = Math.max(1, ...gShots.flat());

  const W = 90, H = 60;
  const cellW = (W - 10) / cols;
  const cellH = (H - 10) / rows;

  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4">
      {title && <p className="text-xs uppercase tracking-[0.2em] text-white font-display mb-3">{title}</p>}
      <div className="mx-auto" style={{ maxWidth: 360 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* Marco portería + red */}
          <defs>
            <pattern id="goalNet" width="2" height="2" patternUnits="userSpaceOnUse">
              <path d="M0 0 L2 2 M2 0 L0 2" stroke="#ffffff22" strokeWidth="0.2" />
            </pattern>
          </defs>
          <rect x="5" y="5" width={W - 10} height={H - 10} fill="url(#goalNet)" stroke="#ffffff" strokeWidth="0.6" />
          {/* Postes */}
          <rect x="3.5" y="3.5" width="1.5" height={H - 7} fill="#fff" />
          <rect x={W - 5} y="3.5" width="1.5" height={H - 7} fill="#fff" />
          <rect x="3.5" y="3.5" width={W - 7} height="1.5" fill="#fff" />

          {gShots.map((row, ri) =>
            row.map((s, ci) => {
              const intensity = s / max;
              const opacity = s === 0 ? 0 : 0.18 + intensity * 0.6;
              const goals = gGoals[ri][ci];
              const saves = gSaves[ri][ci];
              const pctShot = totalShots > 0 ? (s / totalShots) * 100 : 0;
              const pctGoal = s > 0 ? (goals / s) * 100 : 0;
              return (
                <g key={`${ri}-${ci}`}>
                  <rect
                    x={5 + ci * cellW}
                    y={5 + ri * cellH}
                    width={cellW}
                    height={cellH}
                    fill="#ef4444"
                    opacity={opacity}
                  />
                  <rect
                    x={5 + ci * cellW}
                    y={5 + ri * cellH}
                    width={cellW}
                    height={cellH}
                    fill="none"
                    stroke="#ffffff44"
                    strokeWidth="0.2"
                  />
                  {s > 0 && (
                    <>
                      <text x={5 + ci * cellW + cellW / 2} y={5 + ri * cellH + cellH / 2 - 2}
                        textAnchor="middle" fontSize="3.2" fill="#fff" fontWeight="700"
                        style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 0.3 }}>
                        {s} tiros · {pctShot.toFixed(0)}%
                      </text>
                      <text x={5 + ci * cellW + cellW / 2} y={5 + ri * cellH + cellH / 2 + 2.5}
                        textAnchor="middle" fontSize="2.6" fill="#fef3c7"
                        style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 0.2 }}>
                        {goals}G · {saves}P · {pctGoal.toFixed(0)}%
                      </text>
                    </>
                  )}
                </g>
              );
            })
          )}
        </svg>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/60 text-center font-display">G = Gol · P = Parada</p>
      </div>
    </div>
  );
}
