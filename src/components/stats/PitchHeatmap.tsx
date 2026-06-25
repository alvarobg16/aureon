type Props = {
  title?: string;
  points: Array<{ x: number | null; y: number | null }>;
  cols?: number;
  rows?: number;
  accent?: string; // CSS color
};

/**
 * Heatmap sobre pista futsal vertical (ataque hacia arriba).
 *
 * Convención de coordenadas (entrada): vienen del LIVE en orientación
 * horizontal — `x` = eje largo (de portería a portería, 0 = izquierda,
 * 1 = derecha) y `y` = eje corto (de banda a banda, 0 = arriba, 1 = abajo).
 *
 * Para mostrarlas sobre una pista vertical hacemos un giro 90° antihorario:
 * la columna depende de `y_live` y la fila depende de `x_live` invertido
 * (el ataque va hacia arriba → x_live = 1 cae en la fila 0).
 *
 * Por defecto la rejilla es 3×4 = 12 zonas (6 + 6), simétrica respecto a la
 * línea de medio campo.
 */
export function PitchHeatmap({ title, points, cols = 3, rows = 4, accent = "#f97316" }: Props) {
  // Bin con conversión LIVE-horizontal → vertical.
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (const p of points) {
    if (p.x == null || p.y == null) continue;
    const c = Math.min(cols - 1, Math.max(0, Math.floor(p.y * cols)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor((1 - p.x) * rows)));
    grid[r][c]++;
  }
  const flat = grid.flat();
  const total = flat.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...flat);

  // viewBox vertical: 68 ancho, 100 alto
  const W = 68, H = 100;
  const cellW = W / cols;
  const cellH = H / rows;

  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4">
      {title && (
        <p className="text-xs uppercase tracking-[0.2em] text-white font-display mb-3">
          {title}
        </p>
      )}
      <div className="mx-auto" style={{ maxWidth: 320 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-md shadow-lg">
          <defs>
            <linearGradient id="parquetBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c89060" />
              <stop offset="50%" stopColor="#a96a3a" />
              <stop offset="100%" stopColor="#7a4520" />
            </linearGradient>
            <pattern id="parquetPlanks" width="6" height="100" patternUnits="userSpaceOnUse">
              <rect width="6" height="100" fill="url(#parquetBase)" />
              <line x1="0" y1="0" x2="0" y2="100" stroke="#5a3416" strokeWidth="0.25" opacity="0.7" />
              <line x1="3" y1="0" x2="3" y2="100" stroke="#3a2210" strokeWidth="0.12" opacity="0.5" />
            </pattern>
            <pattern id="parquetGrain" width="40" height="14" patternUnits="userSpaceOnUse">
              <rect width="40" height="14" fill="url(#parquetPlanks)" />
              <path d="M0 7 Q10 5 20 7 T40 7" stroke="#3a1f0e" strokeWidth="0.2" fill="none" opacity="0.35" />
              <path d="M0 12 Q10 10 20 12 T40 12" stroke="#5a3416" strokeWidth="0.15" fill="none" opacity="0.3" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#parquetGrain)" />
          {/* Líneas pista */}
          <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke="#ffffff" strokeWidth="0.4" />
          <line x1="1" y1={H / 2} x2={W - 1} y2={H / 2} stroke="#ffffff" strokeWidth="0.3" />
          <circle cx={W / 2} cy={H / 2} r="6" fill="none" stroke="#ffffff" strokeWidth="0.3" />
          <path d={`M ${W / 2 - 14} 1 A 14 14 0 0 1 ${W / 2 + 14} 1`} fill="none" stroke="#fff" strokeWidth="0.3" />
          <path d={`M ${W / 2 - 14} ${H - 1} A 14 14 0 0 0 ${W / 2 + 14} ${H - 1}`} fill="none" stroke="#fff" strokeWidth="0.3" />

          {/* Rejilla de zonas (siempre visible) */}
          {grid.map((row, ri) =>
            row.map((v, ci) => {
              const intensity = v / max;
              const opacity = v === 0 ? 0 : 0.18 + intensity * 0.65;
              const pct = total > 0 ? (v / total) * 100 : 0;
              const zoneNum = ri * cols + ci + 1;
              return (
                <g key={`${ri}-${ci}`}>
                  {/* Fondo del heatmap */}
                  <rect
                    x={ci * cellW}
                    y={ri * cellH}
                    width={cellW}
                    height={cellH}
                    fill={accent}
                    opacity={opacity}
                  />
                  {/* Borde de zona siempre visible */}
                  <rect
                    x={ci * cellW}
                    y={ri * cellH}
                    width={cellW}
                    height={cellH}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.35"
                    strokeWidth="0.25"
                    strokeDasharray="1.2 1"
                  />
                  {/* Numero de zona (esquina) */}
                  <text
                    x={ci * cellW + 1.6}
                    y={ri * cellH + 3.4}
                    fontSize="2.4"
                    fill="#ffffff"
                    opacity="0.55"
                    fontWeight="700"
                  >
                    Z{zoneNum}
                  </text>
                  {v > 0 && (
                    <text
                      x={ci * cellW + cellW / 2}
                      y={ri * cellH + cellH / 2 + 1.2}
                      textAnchor="middle"
                      fontSize="3.2"
                      fill="#fff"
                      fontWeight="700"
                      style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 0.3 }}
                    >
                      {v} · {pct.toFixed(0)}%
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Empty state */}
          {total === 0 && (
            <g>
              <rect x={W / 2 - 18} y={H / 2 - 4} width="36" height="8" rx="1.2" fill="#000" opacity="0.55" />
              <text
                x={W / 2}
                y={H / 2 + 1.4}
                textAnchor="middle"
                fontSize="3.2"
                fill="#fff"
                fontWeight="700"
                letterSpacing="0.4"
              >
                SIN REGISTROS
              </text>
            </g>
          )}
        </svg>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/60 text-center font-display">
          Ataque ↑ · 12 zonas
        </p>
      </div>
    </div>
  );
}
