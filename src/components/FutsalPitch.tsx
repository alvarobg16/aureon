import { useRef } from "react";

type Props = {
  onPick?: (x: number, y: number) => void;
  marker?: { x: number; y: number } | null;
  markers?: Array<{ x: number; y: number }>;
  interactive?: boolean;
  showArrow?: boolean;
  vertical?: boolean;
};

/**
 * Futsal pitch in normalized 0-1 coordinates.
 * Width 100, height 60 viewBox.
 */
export function FutsalPitch({ onPick, marker, markers, interactive = true, showArrow = true, vertical = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Playing-area bounds inside the viewBox (matches the rect at x=2,y=2,w=96,h=60).
  const PX = 2, PY = 2, PW = 96, PH = 60;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onPick) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    // Normalize to the actual playing area so x,y ∈ [0,1] over the lined pitch.
    const x = Math.max(0, Math.min(1, (loc.x - PX) / PW));
    const y = Math.max(0, Math.min(1, (loc.y - PY) / PH));
    onPick(x, y);
  };

  if (vertical) {
    return (
      <div className="w-full" style={{ position: "relative", paddingBottom: `${(100 / 68) * 100}%` }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: `${(68 / 100) * 100}%`, transform: "rotate(-90deg)" }}>
            <svg
              ref={svgRef}
              viewBox="0 0 100 68"
              className={`w-full h-auto rounded-md ${interactive ? "cursor-crosshair" : ""}`}
              onClick={handleClick}
            >{renderContent()}</svg>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 100 68"
        className={`w-full h-auto rounded-md ${interactive ? "cursor-crosshair" : ""}`}
        onClick={handleClick}
      >{renderContent()}</svg>
    </div>
  );

  function renderContent() {
    return (<>
        {/* Parquet background */}
        <defs>
          <linearGradient id="plankBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9883f" />
            <stop offset="100%" stopColor="#a8662a" />
          </linearGradient>
          <pattern id="parquet" width="20" height="6" patternUnits="userSpaceOnUse">
            <rect width="20" height="6" fill="url(#plankBase)" />
            {/* plank seams */}
            <line x1="0" y1="0" x2="20" y2="0" stroke="#7a4a1d" strokeWidth="0.25" />
            <line x1="10" y1="0" x2="10" y2="6" stroke="#7a4a1d" strokeWidth="0.18" />
            {/* wood grain */}
            <line x1="0" y1="2" x2="20" y2="2.2" stroke="#8a5524" strokeWidth="0.12" opacity="0.55" />
            <line x1="0" y1="4" x2="20" y2="3.8" stroke="#b97a36" strokeWidth="0.1" opacity="0.45" />
          </pattern>
        </defs>
        <rect x="2" y="2" width="96" height="60" fill="url(#parquet)" stroke="#ffffff" strokeWidth="0.4" />
        {/* Center line */}
        <line x1="50" y1="2" x2="50" y2="62" stroke="#ffffff" strokeWidth="0.3" />
        {/* Center circle */}
        <circle cx="50" cy="32" r="6" fill="none" stroke="#ffffff" strokeWidth="0.3" />
        <circle cx="50" cy="32" r="0.5" fill="#ffffff" />
        {/* Left penalty area (semi-circle 6m) */}
        <path d="M 2 20 A 14 14 0 0 1 2 44" fill="none" stroke="#ffffff" strokeWidth="0.3" />
        <circle cx="12" cy="32" r="0.4" fill="#ffffff" />
        {/* Right penalty area */}
        <path d="M 98 20 A 14 14 0 0 0 98 44" fill="none" stroke="#ffffff" strokeWidth="0.3" />
        <circle cx="88" cy="32" r="0.4" fill="#ffffff" />
        {/* Goals */}
        <rect x="0.5" y="29" width="1.5" height="6" fill="#ffffff" />
        <rect x="98" y="29" width="1.5" height="6" fill="#ffffff" />
        {/* Second penalty mark 10m */}
        <circle cx="18" cy="32" r="0.4" fill="#ffffff" />
        <circle cx="82" cy="32" r="0.4" fill="#ffffff" />

        {/* Multi markers (exact spots) */}
        {markers && markers.map((m, i) => (
          <circle key={i} cx={PX + m.x * PW} cy={PY + m.y * PH} r="0.9" fill="#fde047" stroke="#000" strokeWidth="0.25" opacity="0.95" />
        ))}
        {/* Single marker */}
        {marker && (
          <g>
            <circle cx={PX + marker.x * PW} cy={PY + marker.y * PH} r="1.6" fill="#ef4444" stroke="#fff" strokeWidth="0.3" />
          </g>
        )}

        {/* Sentido del ataque arrow OUTSIDE the pitch (below) */}
        {showArrow && (
          <g>
            <defs>
              <marker id="arrhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#f59e0b" />
              </marker>
            </defs>
            <line
              x1="20"
              y1="65.5"
              x2="78"
              y2="65.5"
              stroke="#f59e0b"
              strokeWidth="1.6"
              markerEnd="url(#arrhead)"
            />
            <text
              x="49"
              y="66.6"
              textAnchor="middle"
              fontSize="2.2"
              fill="#0b0b0b"
              fontWeight="700"
              letterSpacing="0.3"
            >
              SENTIDO DEL ATAQUE
            </text>
          </g>
        )}
      </>
    );
  }
}
