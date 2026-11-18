// Basket math from the team pricing model (.planning/research/DECISIONS-GRILLING.md).
// A token pays Σ wᵢ for each leg i that resolves in the basket's favor, so it
// pays at most $1.00. Its fair value is Σ wᵢ · midᵢ whatever the correlation
// between legs; the mint price is the cost to replicate it plus a 2% fee.
// Pure functions, so they can move to packages/core unchanged.

import type { Leg } from "./markets";

export const FEE = 0.02;
export const NETWORK_FEE = 0.01; // Arc gas, paid in USDC
export const MAX_PAYOUT = 1;

const cents = (n: number) => Math.round(n * 100) / 100;

// Bid and ask for the side the basket holds. A NO ask is 1 - YES bid.
export function quote(l: Leg) {
  const { bid, ask } = l.book;
  if (l.side === "YES") return { bid, ask };
  return { bid: ask === null ? null : cents(1 - ask), ask: bid === null ? null : cents(1 - bid) };
}

// No bid means nobody would buy this leg back today.
export const illiquid = (l: Leg) => quote(l).bid === null;

// Mid of the book; a leg with only one side is marked at that side.
export function mid(l: Leg) {
  const { bid, ask } = quote(l);
  if (bid !== null && ask !== null) return (bid + ask) / 2;
  return ask ?? bid ?? 0;
}

export const fairValue = (legs: Leg[]) => legs.reduce((s, l) => s + l.weight * mid(l), 0);

export const mintPrice = (legs: Leg[]) =>
  legs.reduce((s, l) => s + l.weight * (quote(l).ask ?? mid(l)), 0) * (1 + FEE);

export const lastExpiry = (legs: Leg[]) =>
  legs
    .map((l) => l.expires)
    .filter(Boolean)
    .sort()
    .at(-1) ?? "";

export type Outcome = { label: string; ids: string[]; payout: number };

const COUNT = ["", "", "Both", "All three"];

function name(legs: Leg[], hit: Leg[]) {
  if (hit.length === 0) return "Nothing happens";
  if (hit.length === legs.length && legs.length > 1) return COUNT[legs.length] ?? `All ${legs.length}`;
  if (hit.length === 1) return `Only ${lower(hit[0].short)}`;
  return hit.map((l, i) => (i ? lower(l.short) : l.short)).join(" + ");
}

const lower = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

// Every combination of legs resolving in the basket's favor, cheapest first.
// Used for up to 3 legs; larger baskets use per-leg toggles instead.
export function outcomes(legs: Leg[]): Outcome[] {
  const out: Outcome[] = [];
  for (let mask = 0; mask < 1 << legs.length; mask++) {
    const hit = legs.filter((_, i) => mask & (1 << i));
    out.push({ label: name(legs, hit), ids: hit.map((l) => l.id), payout: hit.reduce((s, l) => s + l.weight, 0) });
  }
  return out.sort((a, b) => a.payout - b.payout || a.ids.length - b.ids.length);
}

export const payoutFor = (legs: Leg[], ids: Set<string>) =>
  legs.reduce((s, l) => s + (ids.has(l.id) ? l.weight : 0), 0);

// Decision Q6: size the hedge from the amount at risk and a 10-100% slider.
// Each token pays up to $1.00, so the max payout in dollars is the token count.
export function sizeHedge(atRisk: number, share: number, price: number) {
  const tokens = Math.floor(atRisk * share * 100) / 100;
  return { tokens, maxPayout: tokens * MAX_PAYOUT, cost: cents(tokens * price) };
}

export function sizeFromCost(cost: number, price: number) {
  const tokens = Math.floor((cost / price) * 100) / 100;
  return { tokens, maxPayout: tokens * MAX_PAYOUT, cost: cents(tokens * price) };
}
