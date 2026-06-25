import { useRef } from "react";

type Props = {
  onPick?: (x: number, y: number) => void;
  marker?: { x: number; y: number } | null;
  markers?: Array<{ x: number; y: number }>;
  interactive?: boolean;
};

/**
 * Futsal goal: 3m wide x 2m tall (ratio 3:2).
 * ViewBox 100x66 (with net).
 */
export function FutsalGoal({ onPick, marker, markers, interactive = true }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

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
    // Goal area: x 6..94 (88 wide), y 4..62 (58 tall)
    const gx = Math.max(0, Math.min(1, (loc.x - 6) / 88));
    const gy = Math.max(0, Math.min(1, (loc.y - 4) / 58));
    onPick(gx, gy);
  };

  // grid for visual reference (3x2 zones overlay)
  const cols = [6, 6 + 88 / 3, 6 + (2 * 88) / 3, 94];
  const rows = [4, 4 + 58 / 2, 62];

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 100 66"
        className={`w-full h-auto rounded-md ${interactive ? "cursor-crosshair" : ""}`}
        onClick={handleClick}
      >
        {/* Background */}
        <rect x="0" y="0" width="100" height="66" fill="#0f172a" />
        {/* Net */}
        <g opacity="0.45" stroke="#94a3b8" strokeWidth="0.2">
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`v${i}`} x1={6 + (i * 88) / 17} y1="4" x2={6 + (i * 88) / 17} y2="62" />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1="6" y1={4 + (i * 58) / 11} x2="94" y2={4 + (i * 58) / 11} />
          ))}
        </g>
        {/* Zones grid (subtle) */}
        <g stroke="#ffffff" strokeWidth="0.15" opacity="0.35" strokeDasharray="0.6 0.6">
          {cols.slice(1, -1).map((x) => (
            <line key={`cz${x}`} x1={x} y1="4" x2={x} y2="62" />
          ))}
          {rows.slice(1, -1).map((y) => (
            <line key={`rz${y}`} x1="6" y1={y} x2="94" y2={y} />
          ))}
        </g>
        {/* Posts and crossbar — red & white striped */}
        <defs>
          <pattern id="postStripeV" width="2" height="6" patternUnits="userSpaceOnUse">
            <rect width="2" height="3" fill="#ffffff" />
            <rect y="3" width="2" height="3" fill="#ef4444" />
          </pattern>
          <pattern id="postStripeH" width="6" height="2" patternUnits="userSpaceOnUse">
            <rect width="3" height="2" fill="#ffffff" />
            <rect x="3" width="3" height="2" fill="#ef4444" />
          </pattern>
        </defs>
        {/* Left post */}
        <rect x="4" y="2" width="2" height="62" fill="url(#postStripeV)" stroke="#000" strokeWidth="0.15" />
        {/* Right post */}
        <rect x="94" y="2" width="2" height="62" fill="url(#postStripeV)" stroke="#000" strokeWidth="0.15" />
        {/* Crossbar */}
        <rect x="4" y="2" width="92" height="2" fill="url(#postStripeH)" stroke="#000" strokeWidth="0.15" />
        {/* Ground line */}
        <line x1="0" y1="64" x2="100" y2="64" stroke="#ffffff" strokeWidth="0.4" />

        {markers && markers.map((m, i) => (
          <circle
            key={i}
            cx={6 + m.x * 88}
            cy={4 + m.y * 58}
            r="1.1"
            fill="#fde047"
            stroke="#000"
            strokeWidth="0.25"
            opacity="0.95"
          />
        ))}
        {marker && (
          <circle
            cx={6 + marker.x * 88}
            cy={4 + marker.y * 58}
            r="2"
            fill="#ef4444"
            stroke="#fff"
            strokeWidth="0.3"
          />
        )}
      </svg>
    </div>
  );
}
