// Gemini Prediction Markets legs. Order books, rule wording and settlement
// sources are a snapshot of GET /v1/prediction-markets/events on
// 2026-11-18 at about 4:40 PM CST. The 15-minute BTC/ETH legs roll every
// window, so their symbol and expiry are filled in from the clock.

export type Side = "YES" | "NO";
export type Category = "Crypto" | "Economy" | "Rates" | "Energy" | "Weather";

export type Leg = {
  id: string;
  short: string; // what has to happen for this leg to pay, e.g. "BTC falls"
  title: string; // Gemini event title
  contract: string; // Gemini contract label
  side: Side; // the side the basket holds
  book: { bid: number | null; ask: number | null }; // Gemini YES book
  weight: number; // share of the $1.00 max payout, legs sum to 1
  category: Category;
  expires: string; // ISO; "" for rolling legs until a window is chosen
  ticker: string; // Gemini event ticker
  slug: string;
  symbol: string; // Gemini instrument symbol
  rule: string; // Gemini's rule for YES, in its own wording
  source: string; // settlement source named by Gemini
  why?: string; // AI builder reason
};

export const geminiUrl = (leg: Pick<Leg, "ticker" | "slug">) =>
  `https://www.gemini.com/predictions/${leg.ticker}/${leg.slug}`;

type Def = Omit<Leg, "weight" | "why">;

const ROLLING = { expires: "", ticker: "", slug: "", symbol: "" };

export const catalog = {
  "btc-15m": {
    id: "btc-15m",
    short: "BTC falls",
    title: "BTC price, 15-minute window",
    contract: "Up",
    side: "NO",
    book: { bid: 0.5, ask: 0.51 },
    category: "Crypto",
    ...ROLLING,
    rule: "Resolves YES if the price of Bitcoin (BTC) at the end of the window is greater than or equal to its price at the start. Otherwise, it resolves to No. If no eligible trade occurs during the contract window, it resolves on the most recent traded price before it.",
    source: "Lukka LS-LRRR-XBTUSD index",
  },
  "eth-15m": {
    id: "eth-15m",
    short: "ETH falls",
    title: "ETH price, 15-minute window",
    contract: "Up",
    side: "NO",
    book: { bid: 0.5, ask: 0.51 },
    category: "Crypto",
    ...ROLLING,
    rule: "Resolves YES if the price of Ether (ETH) at the end of the window is greater than or equal to its price at the start. Otherwise, it resolves to No. If no eligible trade occurs during the contract window, it resolves on the most recent traded price before it.",
    source: "Lukka LS-LRRR-ETHUSD index",
  },
  recession: {
    id: "recession",
    short: "Recession",
    title: "Recession this year?",
    contract: "Yes",
    side: "YES",
    book: { bid: null, ask: 0.04 },
    category: "Economy",
    expires: "2027-02-01T04:59:00.000Z",
    ticker: "RECESSION26",
    slug: "recession-this-year",
    symbol: "GEMI-RECESSION26-2026",
    rule: "If there are two consecutive quarters of negative U.S. GDP growth in 2025 or 2026, according to the Bureau of Economic Analysis, then the market resolves to Yes. Otherwise, it resolves to No.",
    source: "Bureau of Economic Analysis",
  },
  "spx-6300": {
    id: "spx-6300",
    short: "S&P below 6,300",
    title: "How low will the S&P get this year?",
    contract: "6,300 or below",
    side: "YES",
    book: { bid: 0.09, ask: 0.11 },
    category: "Economy",
    expires: "2026-12-31T21:00:00.000Z",
    ticker: "SPXLOW26",
    slug: "how-low-will-the-sp-get-this-year",
    symbol: "GEMI-SPXLOW26-SPXLE6300",
    rule: "If the value of the S&P 500 index at any point starting Jan 1, 2026 and ending before Jan 1, 2027 is below 6,300, then the market resolves to Yes. Otherwise, it resolves to No.",
    source: "Google Finance (S&P 500 index)",
  },
  "unemp-7": {
    id: "unemp-7",
    short: "Unemployment above 7%",
    title: "How high will unemployment get in 2026?",
    contract: "Above 7%",
    side: "YES",
    book: { bid: 0.01, ask: 0.03 },
    category: "Economy",
    expires: "2027-01-08T13:30:00.000Z",
    ticker: "UNEMP2026",
    slug: "how-high-will-unemployment-get-in-2026",
    symbol: "GEMI-UNEMP2026-GT7",
    rule: "If any seasonally adjusted unemployment rate reported by the Bureau of Labor Statistics in an Employment Situation Report for a reference month in 2026 is above 7%, then the market resolves to Yes. Otherwise, it resolves to No.",
    source: "Bureau of Labor Statistics",
  },
  "fed-25": {
    id: "fed-25",
    short: "Fed hikes 25bps",
    title: "Fed decision in December?",
    contract: "Hike 25bps",
    side: "YES",
    book: { bid: 0.88, ask: 0.93 },
    category: "Rates",
    expires: "2026-12-11T05:00:00.000Z",
    ticker: "FED261211",
    slug: "fed-decision-in-december",
    symbol: "GEMI-FED261211-HIKE25",
    rule: "If the Federal Reserve increases rates by 25bps on December 9, 2026, then the market resolves to Yes. Otherwise, it resolves to No. Only one bucket in this market can resolve to Yes.",
    source: "Federal Reserve",
  },
  "fed-gt25": {
    id: "fed-gt25",
    short: "Fed hikes more than 25bps",
    title: "Fed decision in December?",
    contract: "Hike >25bps",
    side: "YES",
    book: { bid: 0.04, ask: 0.09 },
    category: "Rates",
    expires: "2026-12-11T05:00:00.000Z",
    ticker: "FED261211",
    slug: "fed-decision-in-december",
    symbol: "GEMI-FED261211-HIKEGT25",
    rule: "If the Federal Reserve increases rates by more than 25bps on December 9, 2026, then the market resolves to Yes. Otherwise, it resolves to No. Only one bucket in this market can resolve to Yes.",
    source: "Federal Reserve",
  },
  "wti-84": {
    id: "wti-84",
    short: "WTI oil at $84 or above",
    title: "Oil (WTI) price on November 19?",
    contract: "$84 or above",
    side: "YES",
    book: { bid: 0.12, ask: 0.16 },
    category: "Energy",
    expires: "2026-11-19T22:00:00.000Z",
    ticker: "WTI2611192200",
    slug: "oil-wti-price-on-november-19",
    symbol: "GEMI-WTI2611192200-HI84",
    rule: "If the price of Oil (WTI) is $84 or above on November 19, 2026 at 5pm ET, this market will resolve to Yes. Otherwise, it will resolve to No.",
    source: "Kaiko KK_RFR_WTIUSDC index",
  },
  "brent-90": {
    id: "brent-90",
    short: "Brent oil at $90 or above",
    title: "Oil (Brent) price on November 19?",
    contract: "$90 or above",
    side: "YES",
    book: { bid: 0.2, ask: 0.25 },
    category: "Energy",
    expires: "2026-11-19T22:00:00.000Z",
    ticker: "BRENT2611192200",
    slug: "oil-brent-price-on-november-19",
    symbol: "GEMI-BRENT2611192200-HI90",
    rule: "If the price of Oil (Brent) is $90 or above on November 19, 2026 at 5pm ET, this market will resolve to Yes. Otherwise, it will resolve to No.",
    source: "Kaiko KK_RFR_BRENTOILUSDC index",
  },
  "hormuz-no": {
    id: "hormuz-no",
    short: "Hormuz stays disrupted",
    title: "When will traffic at the Strait of Hormuz return to normal?",
    contract: "Before January 01, 2027",
    side: "NO",
    book: { bid: 0.02, ask: 0.05 },
    category: "Energy",
    expires: "2027-01-02T04:00:00.000Z",
    ticker: "HORMUZNORMAL",
    slug: "when-will-traffic-at-the-strait-of-hormuz-return-to-normal",
    symbol: "GEMI-HORMUZNORMAL-JAN01",
    rule: "If the 7-day moving average of transit calls through the Strait of Hormuz as reported by the IMF PortWatch is above 60 before Jan 1, 2027, then the market resolves to Yes. Otherwise, it resolves to No.",
    source: "IMF PortWatch",
  },
  "aus-76": {
    id: "aus-76",
    short: "Austin hits 76-77°F",
    title: "Highest temperature in Austin on November 19, 2026?",
    contract: "76°F to 77°F",
    side: "YES",
    book: { bid: 0.07, ask: 0.11 },
    category: "Weather",
    expires: "2026-11-20T04:59:59.000Z",
    ticker: "WXHIGH-AUS-2611200459",
    slug: "highest-temperature-in-austin-on-november-19-2026",
    symbol: "GEMI-WXHIGH-AUS-2611200459-76TO77",
    rule: "Resolves Yes if the highest temperature recorded at Austin-Bergstrom International Airport on November 19, 2026, as reported in the first published NWS Climatological Report (Daily), is 76°F to 77°F. Otherwise, it resolves to No.",
    source: "National Weather Service",
  },
  "aus-78": {
    id: "aus-78",
    short: "Austin hits 78°F or above",
    title: "Highest temperature in Austin on November 19, 2026?",
    contract: "78°F or above",
    side: "YES",
    book: { bid: null, ask: 0.01 },
    category: "Weather",
    expires: "2026-11-20T04:59:59.000Z",
    ticker: "WXHIGH-AUS-2611200459",
    slug: "highest-temperature-in-austin-on-november-19-2026",
    symbol: "GEMI-WXHIGH-AUS-2611200459-HI78",
    rule: "Resolves Yes if the highest temperature recorded at Austin-Bergstrom International Airport on November 19, 2026, as reported in the first published NWS Climatological Report (Daily), is 78°F or above. Otherwise, it resolves to No.",
    source: "National Weather Service",
  },
  "mia-84": {
    id: "mia-84",
    short: "Miami hits 84-85°F",
    title: "Highest temperature in Miami on November 19, 2026?",
    contract: "84°F to 85°F",
    side: "YES",
    book: { bid: 0.12, ask: 0.14 },
    category: "Weather",
    expires: "2026-11-20T04:59:59.000Z",
    ticker: "WXHIGH-MIA-2611200459",
    slug: "highest-temperature-in-miami-on-november-19-2026",
    symbol: "GEMI-WXHIGH-MIA-2611200459-84TO85",
    rule: "Resolves Yes if the highest temperature recorded at Miami International Airport on November 19, 2026, as reported in the first published NWS Climatological Report (Daily), is 84°F to 85°F. Otherwise, it resolves to No.",
    source: "National Weather Service",
  },
  "btc-d-62500": {
    id: "btc-d-62500",
    short: "BTC below $62,500 tomorrow",
    title: "BTC price on November 19",
    contract: "$62,500 or above",
    side: "NO",
    book: { bid: 0.5, ask: 0.53 },
    category: "Crypto",
    expires: "2026-11-19T22:00:00.000Z",
    ticker: "BTC2611192200",
    slug: "btc-price-on-november-19",
    symbol: "GEMI-BTC2611192200-HI62500",
    rule: "If the price of Bitcoin (BTC) is $62,500 or above on November 19, 2026 at 5pm ET, this market will resolve to Yes. Otherwise, it will resolve to No.",
    source: "Lukka LS-LRRR-XBTUSD index",
  },
  "eth-d-1760": {
    id: "eth-d-1760",
    short: "ETH below $1,760 tomorrow",
    title: "ETH price on November 19",
    contract: "$1,760 or above",
    side: "NO",
    book: { bid: 0.5, ask: 0.55 },
    category: "Crypto",
    expires: "2026-11-19T22:00:00.000Z",
    ticker: "ETH2611192200",
    slug: "eth-price-on-november-19",
    symbol: "GEMI-ETH2611192200-HI1760",
    rule: "If the price of Ether (ETH) is $1,760 or above on November 19, 2026 at 5pm ET, this market will resolve to Yes. Otherwise, it will resolve to No.",
    source: "Lukka LS-LRRR-ETHUSD index",
  },
} satisfies Record<string, Def>;

export type LegId = keyof typeof catalog;

export function leg(id: LegId, weight: number, why?: string): Leg {
  return { ...(catalog[id] as Def), weight, why };
}

// Markets the builder can point to but not buy (no order book on Gemini).
export const unpriced = [
  {
    title: "U.S. Unemployment in November 2026?",
    contract: "Above 4.03%",
    ticker: "UNEMPMON2612041400",
    slug: "us-unemployment-in-november-2026",
  },
  {
    title: "Natural Gas price on November 19?",
    contract: "$3.80 or above",
    ticker: "NGAS2611192200",
    slug: "natural-gas-price-on-november-19",
  },
];

// --- 15-minute windows -----------------------------------------------------

const WINDOW_MS = 15 * 60_000;
const CUTOFF_MS = 2 * 60_000; // buying closes 2 minutes before the window ends

export type Window = { start: number; end: number; buyBy: number };

// The window a buyer can still get into: the current quarter hour, or the
// next one during the last two minutes. Never later than that.
export function crashWindow(now: number): Window {
  let start = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  if (now >= start + WINDOW_MS - CUTOFF_MS) start += WINDOW_MS;
  return { start, end: start + WINDOW_MS, buyBy: start + WINDOW_MS - CUTOFF_MS };
}

export function windowAt(end: number): Window {
  return { start: end - WINDOW_MS, end, buyBy: end - CUTOFF_MS };
}

const pad = (n: number) => String(n).padStart(2, "0");

// Gemini tickers use the UTC expiry, e.g. BTC15M2611182315.
function stamp(ms: number) {
  const d = new Date(ms);
  return `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

// Gemini slugs use the Eastern clock time, e.g. "btc-price-today-at-615pm-est".
function etClock(ms: number) {
  const s = new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return s.replace(/[: ]/g, "").toLowerCase().replace(/00(am|pm)$/, "$1");
}

export function inWindow(l: Leg, w: Window): Leg {
  if (l.id !== "btc-15m" && l.id !== "eth-15m") return l;
  const asset = l.id === "btc-15m" ? "BTC" : "ETH";
  const ticker = `${asset}15M${stamp(w.end)}`;
  return {
    ...l,
    expires: new Date(w.end).toISOString(),
    ticker,
    slug: `${asset.toLowerCase()}-price-today-at-${etClock(w.end)}-est`,
    symbol: `GEMI-${ticker}-UP`,
  };
}
