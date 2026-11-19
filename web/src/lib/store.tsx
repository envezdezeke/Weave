"use client";

// Client state for the demo: wallet balance, positions, vaults and AI drafts.
// Everything here is mocked and kept in localStorage so a refresh does not
// lose a purchase mid-demo. The contracts and operator API replace it later.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { baskets, CRASH_ID, getBasket, hedgeTrade, seedVault, type Basket, type Icon, type Kind, type Vault } from "./data";
import { hex } from "./format";
import { crashWindow, inWindow, windowAt, type Leg } from "./markets";
import { mintPrice } from "./pricing";

export type LegState = "open" | "yes" | "no" | "voided";

export type Position = {
  id: string;
  basketId: string;
  name: string;
  icon: Icon;
  kind?: Kind; // missing on positions saved before worry colors
  tokens: number;
  cost: number; // USDC paid, fee included
  price: number; // mint price per token
  legs: Leg[];
  results: Record<string, { state: LegState; at?: number }>;
  status: "confirming" | "open";
  hash: string;
  at: number;
  windowEnd?: number;
  redeemed?: { amount: number; hash: string; at: number };
  sends?: { to: string; tokens: number; hash: string; at: number }[];
};

type StoredVault = Vault & { windowEnd?: number };

type State = {
  balance: number;
  positions: Position[];
  vaults: Record<string, StoredVault>;
  drafts: Record<string, Basket>;
  wishes: string[];
};

export const WALLET = hex("weave-user-wallet", 40);
const KEY = "weave-demo-v1";
const QUARTER = 15 * 60_000;
const RESOLVE_LAG = 20_000; // Gemini posts a 15-minute result a few seconds after the window

const coin = (seed: string) => parseInt(hex(seed, 8).slice(2), 16) % 2 === 0;

function crashLegs(end: number) {
  return getBasket(CRASH_ID)!.legs.map((l) => inWindow(l, windowAt(end)));
}

function seed(now: number): State {
  const base = Math.floor(now / QUARTER) * QUARTER;
  const recession = getBasket("recession-hedge")!;
  const rPrice = mintPrice(recession.legs);
  const readyEnd = base - QUARTER;
  const endedEnd = base - 3 * QUARTER;
  const crashPrice = mintPrice(getBasket(CRASH_ID)!.legs);
  const crash = (id: string, end: number, tokens: number, btc: LegState, eth: LegState): Position => ({
    id,
    basketId: CRASH_ID,
    name: "BTC/ETH Crash Hedge (15 min)",
    icon: "crash",
    kind: "crypto",
    tokens,
    cost: Math.round(tokens * crashPrice * 100) / 100,
    price: crashPrice,
    legs: crashLegs(end),
    results: { "btc-15m": { state: btc, at: end + RESOLVE_LAG }, "eth-15m": { state: eth, at: end + RESOLVE_LAG } },
    status: "open",
    hash: hex(id, 64),
    at: end - 9 * 60_000,
    windowEnd: end,
  });
  return {
    balance: 40,
    positions: [
      {
        id: "p-recession",
        basketId: recession.id,
        name: recession.name,
        icon: recession.icon,
        kind: recession.kind,
        tokens: 80,
        cost: Math.round(80 * rPrice * 100) / 100,
        price: rPrice,
        legs: recession.legs,
        results: Object.fromEntries(recession.legs.map((l) => [l.id, { state: "open" as const }])),
        status: "open",
        hash: hex("p-recession", 64),
        at: Date.UTC(2026, 10, 18, 15, 12),
      },
      crash("p-crash-ready", readyEnd, 20, "yes", "no"),
      crash("p-crash-ended", endedEnd, 8, "no", "no"),
    ],
    vaults: {},
    drafts: {},
    wishes: ["Layoffs at my company", "My rent goes up 10%", "A hurricane hits Miami"],
  };
}

type BuyInput = { basket: Basket; legs: Leg[]; tokens: number; price: number; cost: number; windowEnd?: number };

type Store = State & {
  ready: boolean;
  vault: (b: Basket, windowEnd?: number) => StoredVault;
  submitBuy: (p: BuyInput) => { id: string; hash: string };
  confirmBuy: (id: string, opts?: { hedgeFails?: boolean }) => void;
  failBuy: (id: string) => void;
  redeem: (id: string) => { amount: number; hash: string };
  send: (id: string, to: string, tokens: number) => string;
  saveDraft: (b: Basket) => string;
  addWish: (w: string) => void;
  reset: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load after mount: the server has no clock or storage for this demo.
  useEffect(() => {
    let loaded: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = JSON.parse(raw) as State;
    } catch {}
    if (loaded) loaded = { ...loaded, positions: loaded.positions.filter((p) => p.status !== "confirming") };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
    setState(loaded ?? seed(Date.now()));
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Mock resolver: a 15-minute leg resolves shortly after its window ends.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setState((s) => {
        if (!s) return s;
        let changed = false;
        const positions = s.positions.map((p) => {
          if (!p.windowEnd || p.status !== "open" || now < p.windowEnd + RESOLVE_LAG) return p;
          if (Object.values(p.results).every((r) => r.state !== "open")) return p;
          changed = true;
          const results = Object.fromEntries(
            p.legs.map((l) => [l.id, { state: (coin(`${p.windowEnd}${l.id}`) ? "yes" : "no") as LegState, at: p.windowEnd! + RESOLVE_LAG }]),
          );
          return { ...p, results };
        });
        return changed ? { ...s, positions } : s;
      });
    }, 1000);
    const pending = timers.current;
    return () => {
      clearInterval(id);
      pending.forEach(clearTimeout);
    };
  }, []);

  const update = useCallback((fn: (s: State) => State) => setState((s) => (s ? fn(s) : s)), []);

  const vault = useCallback(
    (b: Basket, windowEnd?: number): StoredVault => {
      const v = state?.vaults[b.id];
      if (v && v.windowEnd === windowEnd) return v;
      if (b.badge === "AI-built") return { supply: 0, balance: 0, trades: [], windowEnd };
      return { ...seedVault(b, windowEnd ? windowEnd - 14 * 60_000 : undefined), windowEnd };
    },
    [state],
  );

  const store = useMemo<Store | null>(() => {
    if (!state) return null;
    return {
      ...state,
      ready: true,
      vault,
      submitBuy: ({ basket, legs, tokens, price, cost, windowEnd }) => {
        const id = `p-${Date.now().toString(36)}`;
        const position: Position = {
          id,
          basketId: basket.id,
          name: basket.name,
          icon: basket.icon,
          kind: basket.kind,
          tokens,
          cost,
          price,
          legs,
          results: Object.fromEntries(legs.map((l) => [l.id, { state: "open" as const }])),
          status: "confirming",
          hash: hex(`${id}${cost}`, 64),
          at: Date.now(),
          windowEnd,
        };
        update((s) => ({ ...s, positions: [position, ...s.positions] }));
        return { id, hash: position.hash };
      },
      confirmBuy: (id, opts) => {
        update((s) => {
          const p = s.positions.find((x) => x.id === id);
          if (!p) return s;
          const b = getBasket(p.basketId) ?? s.drafts[p.basketId];
          const v = b ? vault(b, p.windowEnd) : { supply: 0, balance: 0, trades: [] };
          const failed = opts?.hedgeFails ? [p.legs[p.legs.length - 1].id] : [];
          const trade = b ? hedgeTrade({ ...b, legs: p.legs }, p.tokens, Date.now(), id, failed) : null;
          return {
            ...s,
            balance: Math.round((s.balance - p.cost - 0.01) * 100) / 100,
            positions: s.positions.map((x) => (x.id === id ? { ...x, status: "open" } : x)),
            vaults: {
              ...s.vaults,
              [p.basketId]: {
                ...v,
                windowEnd: p.windowEnd,
                supply: v.supply + p.tokens,
                balance: Math.round((v.balance + p.cost) * 100) / 100,
                trades: trade ? [trade, ...v.trades] : v.trades,
              },
            },
          };
        });
        // Decision Q13: an unhedged trade retries; the reserve still backs the payout.
        if (opts?.hedgeFails) {
          timers.current.push(
            setTimeout(() => {
              update((s) => {
                const p = s.positions.find((x) => x.id === id);
                const b = p && (getBasket(p.basketId) ?? s.drafts[p.basketId]);
                const v = s.vaults[p?.basketId ?? ""];
                if (!p || !b || !v) return s;
                const trade = hedgeTrade({ ...b, legs: p.legs }, p.tokens, Date.now(), `${id}-retry`);
                return {
                  ...s,
                  vaults: { ...s.vaults, [p.basketId]: { ...v, trades: v.trades.map((t) => (t.id === id ? { ...trade, id } : t)) } },
                };
              });
            }, 12_000),
          );
        }
      },
      failBuy: (id) => update((s) => ({ ...s, positions: s.positions.filter((p) => p.id !== id) })),
      redeem: (id) => {
        const p = state.positions.find((x) => x.id === id);
        if (!p || p.redeemed) return { amount: 0, hash: "" };
        const amount = Math.round(p.tokens * p.legs.reduce((sum, l) => sum + (p.results[l.id]?.state === "yes" ? l.weight : 0), 0) * 100) / 100;
        const hash = hex(`redeem${id}`, 64);
        update((s) => ({
          ...s,
          balance: Math.round((s.balance + amount) * 100) / 100,
          positions: s.positions.map((x) => (x.id === id ? { ...x, redeemed: { amount, hash, at: Date.now() } } : x)),
        }));
        return { amount, hash };
      },
      send: (id, to, tokens) => {
        const hash = hex(`send${id}${to}${tokens}${Date.now()}`, 64);
        update((s) => ({
          ...s,
          balance: Math.round((s.balance - 0.01) * 100) / 100,
          positions: s.positions.map((x) =>
            x.id === id
              ? {
                  ...x,
                  tokens: Math.round((x.tokens - tokens) * 100) / 100,
                  cost: Math.round(x.cost * ((x.tokens - tokens) / x.tokens) * 100) / 100,
                  sends: [{ to, tokens, hash, at: Date.now() }, ...(x.sends ?? [])],
                }
              : x,
          ),
        }));
        return hash;
      },
      saveDraft: (b) => {
        const id = b.id;
        update((s) => ({ ...s, drafts: { ...s.drafts, [id]: b } }));
        return id;
      },
      addWish: (w) => update((s) => (s.wishes.includes(w) ? s : { ...s, wishes: [w, ...s.wishes].slice(0, 6) })),
      reset: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {}
        setState(seed(Date.now()));
      },
    };
  }, [state, update, vault]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

// Null until the client has loaded state; render a placeholder until then.
export function useStore() {
  return useContext(StoreContext);
}

export function findBasket(id: string, drafts: Record<string, Basket> = {}) {
  return baskets.find((b) => b.id === id) ?? drafts[id];
}

// Live clock for countdowns and 15-minute windows; null on the server.
export function useNow(every = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}

export function useCrashWindow() {
  const now = useNow();
  return now === null ? null : { now, ...crashWindow(now) };
}
