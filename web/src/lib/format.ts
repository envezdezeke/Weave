// Number and time formats from docs/design/DESIGN.md (Number formatting).

export const usd = (n: number, digits = 2) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// Basket tokens can cost a few cents, so keep a third decimal under $0.10.
export const tokenUsd = (n: number) => usd(n, n > 0 && n < 0.1 ? 3 : 2);

// "$12.4K" in lists; receipts use usd() for the full value.
export const compactUsd = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : usd(n);

// Weights use one precision everywhere: whole percent.
export const pct = (n: number) => `${Math.round(n * 100)}%`;

// Leg chance: whole percent, "<1%" and ">99%" at the edges, never "0%".
export function chance(p: number) {
  if (p <= 0) return "<1%";
  if (p < 0.005) return "<1%";
  if (p > 0.995) return ">99%";
  return `${Math.round(p * 100)}%`;
}

export const cents = (p: number) => `${Math.round(p * 100)}¢`;

export function oneIn(p: number) {
  if (p <= 0.005) return "less than 1 in 100";
  if (p >= 0.5) return p >= 0.995 ? "almost certain" : `about ${Math.round(p * 10)} in 10`;
  return `about 1 in ${Math.round(1 / p)}`;
}

const MINUS = "−";

// Signed changes carry an arrow and a true minus sign, so color is never the only signal.
export const arrowPct = (n: number) =>
  `${n >= 0 ? "▲ +" : `▼ ${MINUS}`}${Math.abs(n * 100).toFixed(2)}%`;

export const signedUsd = (n: number, digits = 2) => `${n >= 0 ? "+" : MINUS}${usd(Math.abs(n), digits)}`;

export const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

// Every timestamp shows its zone. The demo runs in Austin, so times are Central.
const TZ = "America/Chicago";

function zone(ms: number) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "short" })
    .formatToParts(new Date(ms))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? "CT";
}

const ms = (t: number | string) => (typeof t === "string" ? new Date(t).getTime() : t);

export function clock(t: number | string) {
  const m = ms(t);
  return `${new Date(m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ })} ${zone(m)}`;
}

export function dateTime(t: number | string) {
  const m = ms(t);
  const d = new Date(m).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });
  return `${d}, ${clock(m)}`;
}

export const day = (t: number | string) =>
  new Date(ms(t)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ });

export function left(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// 6 + 4 characters, e.g. 0x12ab…9f3c.
export const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

// Deterministic hex, so mock addresses and hashes match on server and client.
export function hex(seed: string, length: number) {
  let h = 2166136261;
  let out = "";
  let i = 0;
  while (out.length < length) {
    for (const c of `${seed}:${i++}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return `0x${out.slice(0, length)}`;
}

// Deterministic price history ending at `end`, for charts. Seeded by id so the
// server and client render the same path.
export function history(id: string, end: number, change: number, points = 90) {
  let seed = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const start = Math.max(0.005, end - change);
  const vol = Math.max(0.004, end * 0.035);
  const out: number[] = [];
  let walk = 0;
  for (let i = 0; i < points; i++) {
    walk += (rand() - 0.5) * vol;
    const t = i / (points - 1);
    const drift = start + (end - start) * t;
    // pin both ends so the line starts at `start` and ends at `end`
    out.push(Math.max(0.001, drift + walk * Math.sin(Math.PI * t)));
  }
  out[points - 1] = end;
  return out;
}
