import type { Leg } from "@/lib/markets";
import { pct } from "@/lib/format";

const STROKES = ["stroke-leg-1", "stroke-leg-2", "stroke-leg-3", "stroke-leg-4"];
const FILLS = ["fill-leg-1", "fill-leg-2", "fill-leg-3", "fill-leg-4"];

// The brand mark as data: each leg is a thread whose thickness is its weight,
// and the threads braid into one strand (the basket), split by weight.
export function Weave({
  legs,
  height = 120,
  active = null,
  draw = false,
  className = "",
}: {
  legs: Pick<Leg, "id" | "short" | "weight">[];
  height?: number;
  active?: number | null;
  draw?: boolean;
  className?: string;
}) {
  const W = 600;
  const H = height;
  const mid = H / 2;
  const join = 400;
  const n = legs.length;
  const pad = Math.min(18, H / 6);
  const ys = legs.map((_, i) => (n === 1 ? mid : pad + ((H - 2 * pad) * i) / (n - 1)));
  const band = Math.max(10, Math.min(20, H / 6));
  // Left edge of each leg's segment in the joined strand.
  const xs = legs.map((_, i) => join + (W - join) * legs.slice(0, i).reduce((t, l) => t + l.weight, 0));
  const clip = `weave-${H}-${legs.map((l) => `${l.id}${Math.round(l.weight * 100)}`).join("-")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`block w-full ${draw ? "weave-draw" : ""} ${className}`}
      style={{ height }}
      role="img"
      aria-label={`Woven from ${legs.map((l) => `${l.short} ${pct(l.weight)}`).join(", ")}`}
    >
      {legs.map((l, i) => {
        const y = ys[i];
        const cross = H - y; // each thread crosses to the other side before joining
        const d = `M0 ${y} C 120 ${y}, 170 ${cross}, 260 ${mid + (cross - mid) * 0.35} S ${join - 40} ${mid}, ${join} ${mid}`;
        return (
          <path
            key={l.id}
            d={d}
            pathLength={1}
            fill="none"
            strokeLinecap="round"
            strokeWidth={3 + l.weight * 10}
            vectorEffect="non-scaling-stroke"
            className={`${STROKES[i % 4]} transition-opacity duration-200`}
            style={{ opacity: active === null || active === i ? 1 : 0.15, animationDelay: `${i * 120}ms` }}
          />
        );
      })}
      <clipPath id={clip}>
        <rect x={join} y={mid - band / 2} width={W - join} height={band} rx={band / 2} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {legs.map((l, i) => {
          const w = (W - join) * l.weight;
          return (
            <rect
              key={l.id}
              x={xs[i]}
              y={mid - band / 2}
              width={w + 0.5}
              height={band}
              className={`${FILLS[i % 4]} transition-opacity duration-200`}
              style={{ opacity: active === null || active === i ? 1 : 0.15 }}
            />
          );
        })}
      </g>
    </svg>
  );
}
