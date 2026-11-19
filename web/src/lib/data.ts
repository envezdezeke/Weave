// Curated baskets (decision Q5: two plus the AI builder) and mock onchain
// state. Vault, hedge and contract values are mocks until the contracts and
// operator service exist; legs and prices come from ./markets.

import { hex } from "./format";
import { leg, type Leg } from "./markets";

export type Icon = "crash" | "recession" | "rates" | "oil" | "sun" | "spark";

// The kind of risk a basket hedges; drives its tint (decision: worry colors).
export type Kind = "crypto" | "economy" | "weather" | "rates" | "energy";

export type HedgeFill = {
  legId: string;
  short: string;
  qty: number; // leg shares bought on the Gemini sandbox
  prodPrice: number; // production ask used to price the mint
  fillPrice: number | null; // sandbox fill, null while unfilled
  orderId: string | null;
};

export type HedgeTrade = { id: string; at: number; tokens: number; fills: HedgeFill[] };

export type Vault = {
  supply: number; // tokens outstanding
  balance: number; // USDC held by the vault
  trades: HedgeTrade[];
};

export type Basket = {
  id: string;
  name: string;
  tagline: string;
  pitch: string; // one line for the persona
  thesis: string;
  icon: Icon;
  kind: Kind;
  badge: "Live" | "New" | "AI-built";
  rolling?: boolean; // 15-minute legs that roll every window
  legs: Leg[];
  change: number; // price change over the chart range, dollars
  token: string; // ERC-1155 contract
  tokenId: number;
  vault: string;
  worry?: string; // AI-built only
};

export const contracts = {
  chain: "Arc Testnet",
  chainId: 5042002,
  explorer: "https://explorer.testnet.arc.io",
  basketToken: hex("weave-1155", 40),
  usdc: "0x3600000000000000000000000000000000000000",
  resolver: hex("weave-resolver", 40),
  operator: hex("weave-operator", 40),
  block: 4_812_331,
};

export const explorer = {
  address: (a: string) => `${contracts.explorer}/address/${a}`,
  tx: (h: string) => `${contracts.explorer}/tx/${h}`,
};

export const CRASH_ID = "crash-15m";

export const baskets: Basket[] = [
  {
    id: CRASH_ID,
    name: "BTC/ETH Crash Cover (15 min)",
    tagline: "Pays if BTC or ETH falls in the next 15 minutes",
    pitch: "Paid in crypto? Hedge a drop in the next 15 minutes.",
    thesis:
      "Two of Gemini's 15-minute crypto markets, held on the NO side of “price goes up”. Each leg pays its share if that coin ends the window lower than it started. A new window opens every quarter hour, so you can watch a basket resolve and pay out in one sitting.",
    icon: "crash",
    kind: "crypto",
    badge: "Live",
    rolling: true,
    legs: [leg("btc-15m", 0.7), leg("eth-15m", 0.3)], // decision Q17: demo persona is paid 70% BTC, 30% ETH
    change: -0.012,
    token: contracts.basketToken,
    tokenId: 1,
    vault: hex("vault-crash", 40),
  },
  {
    id: "recession-hedge",
    name: "Recession Hedge",
    tagline: "Pays if the economy turns this year",
    pitch: "Same mechanism, any horizon.",
    thesis:
      "Three unlikely economic events in one token. Each costs a few cents on its own, so the basket is cheap, and each pays its share if it happens.",
    icon: "recession",
    kind: "economy",
    badge: "New",
    legs: [leg("recession", 0.35), leg("spx-6300", 0.35), leg("unemp-7", 0.3)],
    change: 0.006,
    token: contracts.basketToken,
    tokenId: 2,
    vault: hex("vault-recession", 40),
  },
];

export const getBasket = (id: string) => baskets.find((b) => b.id === id);

const fills = (b: Basket, tokens: number, seed: string, failed: string[] = []): HedgeFill[] =>
  b.legs.map((l, i) => {
    const prod = l.side === "YES" ? (l.book.ask ?? 0) : 1 - (l.book.bid ?? 0);
    const miss = failed.includes(l.id);
    return {
      legId: l.id,
      short: l.short,
      qty: Math.round(tokens * l.weight * 100) / 100,
      prodPrice: prod,
      fillPrice: miss ? null : Math.round((prod + (i % 2 ? 0.01 : 0)) * 100) / 100,
      orderId: miss ? null : String(73_400_000_000 + (parseInt(hex(seed + l.id, 8).slice(2), 16) % 99_999_999)),
    };
  });

export function hedgeTrade(b: Basket, tokens: number, at: number, seed: string, failed: string[] = []): HedgeTrade {
  return { id: seed, at, tokens, fills: fills(b, tokens, seed, failed) };
}

// Vaults hold $1.00 per token outstanding plus the operator reserve and fees.
export function seedVault(b: Basket, t0 = Date.UTC(2026, 10, 18, 15, 0)): Vault {
  if (b.id === CRASH_ID) {
    return {
      supply: 32,
      balance: 34.6,
      trades: [hedgeTrade(b, 12, t0 + 60_000, "c2"), hedgeTrade(b, 20, t0, "c1")],
    };
  }
  return {
    supply: 96,
    balance: 101.4,
    trades: [
      hedgeTrade(b, 6, t0 - 3600_000, "r3", ["unemp-7"]),
      hedgeTrade(b, 10, t0 - 2 * 3600_000, "r2"),
      hedgeTrade(b, 80, t0 - 3 * 3600_000, "r1"),
    ],
  };
}

// Share of leg shares the operator holds on the Gemini sandbox (decision Q13).
export function hedgeCoverage(trades: HedgeTrade[]) {
  let need = 0;
  let have = 0;
  for (const t of trades)
    for (const f of t.fills) {
      need += f.qty;
      if (f.fillPrice !== null) have += f.qty;
    }
  return need ? have / need : 1;
}
