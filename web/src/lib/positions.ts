// Position states from docs/design/STATES.md (Positions).

import { usd } from "./format";
import type { Position } from "./store";

export type PositionKey = "confirming" | "open" | "closing" | "waiting" | "review" | "ready" | "redeemed" | "ended";

const DAY = 86_400_000;

export function payout(p: Position) {
  return Math.round(p.tokens * p.legs.reduce((s, l) => s + (p.results[l.id]?.state === "yes" ? l.weight : 0), 0) * 100) / 100;
}

export function positionState(p: Position, now: number) {
  const total = p.legs.length;
  const resolved = p.legs.filter((l) => p.results[l.id]?.state !== "open").length;
  const amount = payout(p);
  const voided = p.legs.some((l) => p.results[l.id]?.state === "voided");
  const base = { resolved, total, amount };

  if (p.status === "confirming") return { ...base, key: "confirming" as const, label: "Confirming on Arc" };
  if (p.redeemed) return { ...base, key: "redeemed" as const, label: `Redeemed ${usd(p.redeemed.amount)}` };
  if (voided) return { ...base, key: "review" as const, label: "Gemini voided a leg. This basket is paused for a refund." };
  if (resolved === total) {
    if (amount > 0) return { ...base, key: "ready" as const, label: `Ready · ${usd(amount)}` };
    return { ...base, key: "ended" as const, label: "All legs resolved NO. This basket paid $0.00." };
  }
  const expired = p.legs.some((l) => p.results[l.id]?.state === "open" && l.expires && new Date(l.expires).getTime() <= now);
  if (expired) return { ...base, key: "waiting" as const, label: `${resolved} of ${total} legs resolved · waiting for Gemini` };
  const soonest = p.legs
    .filter((l) => p.results[l.id]?.state === "open" && l.expires)
    .map((l) => new Date(l.expires).getTime())
    .sort((a, b) => a - b)[0];
  if (soonest && soonest - now < 3 * DAY) {
    const mins = Math.max(1, Math.round((soonest - now) / 60_000));
    const when = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} days`;
    return { ...base, key: "closing" as const, label: `A leg resolves in ${when} · ${resolved} of ${total} legs resolved` };
  }
  return { ...base, key: "open" as const, label: `Open · ${resolved} of ${total} legs resolved` };
}
