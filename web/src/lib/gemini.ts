// Server-side reads of Gemini's public Prediction Markets API (no key).
// The app calls these through /api/live so the browser never hits Gemini
// directly and every reader shares one cached copy.

const API = "https://api.gemini.com/v1/prediction-markets";

export type Book = { bid: number | null; ask: number | null };

export type CrashLeg = {
  asset: "BTC" | "ETH";
  strike: number;
  label: string; // "$63,200 or above"
  ticker: string;
  slug: string;
  symbol: string;
  expires: string;
  book: Book; // YES book of "$X or above"
};

export type Live = {
  at: string;
  basket?: import("./chain").OnchainBasket | null; // open Crash Cover basket onchain
  books: Record<string, Book>; // by instrument symbol
  crash: CrashLeg[];
};

type Contract = {
  label: string;
  instrumentSymbol: string;
  prices?: { bestBid?: string | null; bestAsk?: string | null };
  resolutionSide?: string | null;
};
type Event = { ticker: string; slug: string; expiryDate: string; contracts: Contract[] };

const num = (v: string | null | undefined) => (v == null || v === "" ? null : Number(v));
const book = (c: Contract): Book => ({ bid: num(c.prices?.bestBid), ask: num(c.prices?.bestAsk) });

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { next: { revalidate: 15 } });
  if (!r.ok) throw new Error(`Gemini ${path}: ${r.status}`);
  return r.json() as Promise<T>;
}

export const getEvent = (ticker: string) => get<Event>(`/events/${ticker}`);

// Hourly ladder events look like BTC2611190500 with a "price-today-at" slug
// (dailies share the ticker shape but use "price-on-<date>").
const HOURLY = /^(BTC|ETH)\d{10}$/;

// Picks the strike "just below spot": the "$X or above" contract whose YES
// mid is closest to 0.75 among those with both a bid and an ask, so NO costs
// about a quarter and pays only on a real drop through a set price.
export function pickStrike(e: Event, asset: "BTC" | "ETH"): CrashLeg | null {
  let best: { c: Contract; d: number } | null = null;
  for (const c of e.contracts) {
    const b = book(c);
    if (b.bid === null || b.ask === null || !/or above/i.test(c.label)) continue;
    const d = Math.abs((b.bid + b.ask) / 2 - 0.75);
    if (!best || d < best.d) best = { c, d };
  }
  return best ? toLeg(e, best.c, asset) : null;
}

function toLeg(e: Event, c: Contract, asset: "BTC" | "ETH"): CrashLeg {
  return {
    asset,
    strike: Number(c.label.replace(/[^0-9.]/g, "")),
    label: c.label,
    ticker: e.ticker,
    slug: e.slug,
    symbol: c.instrumentSymbol,
    expires: e.expiryDate,
    book: book(c),
  };
}

// The legs of a basket already open onchain: same contracts, fresh books.
export async function pinnedLegs(legs: { symbol: string; ticker: string }[]): Promise<CrashLeg[]> {
  const out: CrashLeg[] = [];
  for (const l of legs) {
    const e = await getEvent(l.ticker);
    const c = e.contracts.find((x) => x.instrumentSymbol === l.symbol);
    if (c) out.push(toLeg(e, c, l.ticker.startsWith("BTC") ? "BTC" : "ETH"));
  }
  return out;
}

// The nearest hourly event per asset that still has more than `cutoffMs` to run.
export async function crashLegs(now = Date.now(), cutoffMs = 5 * 60_000): Promise<CrashLeg[]> {
  const res = await get<{ data?: Event[] } | Event[]>(`/events?status=active&category=crypto&limit=500`);
  const events = Array.isArray(res) ? res : (res.data ?? []);
  const out: CrashLeg[] = [];
  for (const asset of ["BTC", "ETH"] as const) {
    const e = events
      .filter((x) => HOURLY.test(x.ticker) && x.ticker.startsWith(asset) && x.slug.includes("price-today-at"))
      .filter((x) => Date.parse(x.expiryDate) - now > cutoffMs)
      .sort((a, b) => Date.parse(a.expiryDate) - Date.parse(b.expiryDate))[0];
    const leg = e && pickStrike(e, asset);
    if (leg) out.push(leg);
  }
  return out;
}

export async function live(tickers: string[], pinned?: { symbol: string; ticker: string }[]): Promise<Live> {
  const [crash, ...events] = await Promise.all([
    pinned ? pinnedLegs(pinned) : crashLegs(),
    ...tickers.map((t) => getEvent(t).catch(() => null)),
  ]);
  const books: Record<string, Book> = {};
  for (const e of events as (Event | null)[]) {
    for (const c of e?.contracts ?? []) books[c.instrumentSymbol] = book(c);
  }
  return { at: new Date().toISOString(), books, crash: crash as CrashLeg[] };
}
