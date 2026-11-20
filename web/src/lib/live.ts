"use client";

// Live Gemini books for the browser. One poll of /api/live is shared by every
// component; until it answers (or if Gemini is down) legs keep their snapshot
// values and are marked as such.

import { useEffect, useState } from "react";
import type { CrashLeg, Live } from "./gemini";
import type { Leg } from "./markets";

const POLL_MS = 20_000;
let current: Live | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const subs = new Set<(l: Live | null) => void>();

async function poll() {
  try {
    const r = await fetch("/api/live", { cache: "no-store" });
    if (!r.ok) return;
    current = (await r.json()) as Live;
    subs.forEach((f) => f(current));
  } catch {}
}

export function useLive() {
  const [l, setL] = useState<Live | null>(current);
  useEffect(() => {
    subs.add(setL);
    if (!timer) {
      poll();
      timer = setInterval(poll, POLL_MS);
    }
    return () => {
      subs.delete(setL);
      if (subs.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return l;
}

const ASSET: Record<string, "BTC" | "ETH"> = { "btc-1h": "BTC", "eth-1h": "ETH" };
const COIN = { BTC: "Bitcoin (BTC)", ETH: "Ether (ETH)" };

function crashLeg(l: Leg, c: CrashLeg): Leg {
  const price = c.label.replace(/ or above/i, "");
  return {
    ...l,
    short: `${c.asset} drops below ${price}`,
    contract: c.label,
    book: c.book,
    ticker: c.ticker,
    slug: c.slug,
    symbol: c.symbol,
    expires: c.expires,
    rule: `Resolves YES if the price of ${COIN[c.asset]} at expiry is ${c.label}. Otherwise, it resolves to No.`,
  };
}

// Overlays live books (and, for Crash Cover, the live hourly strike) on a leg.
export function withLive(l: Leg, live: Live | null): Leg {
  if (!live) return l;
  const asset = ASSET[l.id];
  if (asset) {
    const c = live.crash.find((x) => x.asset === asset);
    return c ? crashLeg(l, c) : l;
  }
  const b = live.books[l.symbol];
  return b ? { ...l, book: b } : l;
}
