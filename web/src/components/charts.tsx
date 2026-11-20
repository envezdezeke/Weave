"use client";

import { useEffect, useState } from "react";

function toPath(values: number[], w: number, h: number, pad = 2) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = max === min ? h / 2 : pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export const RANGE_LABEL: Record<string, string> = {
  LIVE: "since you opened this page",
  "1H": "this hour",
  "1D": "past day",
  "1W": "past week",
  "1M": "past month",
  ALL: "all time",
};

export type Hover = { value: number; start: number; range: string } | null;

// Gemini has no price-history endpoint, so charts never invent a past: this
// samples the live value while the page is open (kept per tab in
// sessionStorage) and always returns at least two points.
export function useLiveSeries(key: string, value: number, max = 240): number[] {
  const [points, setPoints] = useState<number[]>([]);
  useEffect(() => {
    if (!(value > 0)) return; // not loaded yet; a zero start would read as +Infinity%
    let saved: number[] = [];
    try {
      const raw = JSON.parse(sessionStorage.getItem(`live:${key}`) ?? "[]");
      if (Array.isArray(raw)) saved = raw.filter((n) => typeof n === "number");
    } catch {}
    const add = () =>
      setPoints((ps) => {
        const next = [...(ps.length ? ps : saved), value].slice(-max);
        try {
          sessionStorage.setItem(`live:${key}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    add();
    const t = setInterval(add, 15_000);
    return () => clearInterval(t);
  }, [key, value, max]);
  if (points.length >= 2) return points;
  return points.length ? [points[0], points[0]] : [value, value];
}

// One line, no axes, a dotted baseline at the range-start price, and a
// crosshair (pointer or arrow keys) that drives the headline number.
export function PriceChart({
  series,
  initial,
  onHover,
  caption,
}: {
  series: Record<string, number[]>;
  initial?: string;
  onHover: (v: Hover) => void;
  caption?: string;
}) {
  const ranges = Object.keys(series);
  const [range, setRange] = useState(initial ?? ranges[0]);
  const [hover, setHover] = useState<number | null>(null);
  const values = series[range];
  const W = 720;
  const H = 240;
  const up = values.at(-1)! >= values[0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y = (v: number) => (max === min ? H / 2 : 8 + (1 - (v - min) / span) * (H - 16));
  const x = (i: number) => (i / (values.length - 1)) * W;

  const show = (i: number | null, r = range) => {
    setHover(i);
    const vs = series[r];
    onHover(i === null ? { value: vs.at(-1)!, start: vs[0], range: r } : { value: vs[i], start: vs[0], range: r });
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (values.length - 1));
    show(Math.max(0, Math.min(values.length - 1, i)));
  };

  const key = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const cur = hover ?? values.length - 1;
    show(Math.max(0, Math.min(values.length - 1, cur + (e.key === "ArrowLeft" ? -step : step))));
  };

  return (
    <div>
      <svg
        key={range}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="fade h-52 w-full touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand sm:h-60"
        onPointerMove={move}
        onPointerLeave={() => show(null)}
        onKeyDown={key}
        onBlur={() => show(null)}
        tabIndex={0}
        role="img"
        aria-label={`Value chart, ${RANGE_LABEL[range] ?? range}. Use arrow keys to inspect.`}
      >
        <line
          x1="0"
          x2={W}
          y1={y(values[0])}
          y2={y(values[0])}
          strokeDasharray="2 5"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="stroke-line-heavy"
        />
        <path
          d={toPath(values, W, H, 8)}
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={up ? "stroke-fg-positive" : "stroke-fg-negative"}
        />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-line-heavy" />
            <circle cx={x(hover)} cy={y(values[hover])} r="4" className={up ? "fill-fg-positive" : "fill-fg-negative"} />
          </>
        )}
      </svg>
      <div className="mt-3 flex items-center gap-1 border-b border-line pb-3">
        {ranges.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={r === range}
            onClick={() => {
              setRange(r);
              setHover(null);
              onHover({ value: series[r].at(-1)!, start: series[r][0], range: r });
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              r === range ? "bg-fg text-bg" : "text-fg-muted hover:text-fg"
            }`}
          >
            {r}
          </button>
        ))}
        {caption && <span className="ml-auto hidden text-xs text-fg-muted sm:inline">{caption}</span>}
      </div>
    </div>
  );
}

export function ChanceBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elev-2">
      <div className="h-full rounded-full bg-fg/70" style={{ width: `${Math.max(2, value * 100)}%` }} />
    </div>
  );
}
