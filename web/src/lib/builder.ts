// AI builder: maps a worry to Gemini legs. In the real app an LLM picks from
// the full Gemini catalog through tool calls; here keyword rules stand in for
// it, and the UI shows the same steps and match rating.

import { CRASH_ID, type Icon, type Kind } from "./data";
import { leg, unpriced, type Leg } from "./markets";
import { mintPrice } from "./pricing";

export type Match = "strong" | "partial" | "none";

export type Option = { name: string; legs: Leg[] };

export const KIND_ICON: Record<Kind, Icon> = { crypto: "crash", economy: "recession", weather: "sun", rates: "rates", energy: "oil" };

export type NearMiss = { title: string; contract: string; ticker: string; slug: string; reason: string };

export type Draft = {
  kind: Kind;
  match: Match;
  options: Option[];
  gap?: string; // what is not hedged
  nearMisses: NearMiss[];
  suggest?: string; // curated basket id
};

export const EXAMPLES = [
  "I might get laid off",
  "Gas keeps rising",
  "A heat wave hits my city",
  "Rates stay high",
  "I'm paid in crypto",
];

export function draftFromWorry(worry: string): Draft {
  const w = worry.toLowerCase();

  if (/laid off|layoff|lay off|fired|job|unemploy|career|income/.test(w)) {
    return {
      kind: "economy",
      match: "partial",
      options: [
        {
          name: "Layoff Hedge",
          legs: [
            leg("unemp-7", 0.4, "Tracks the risk you named: unemployment spiking this year."),
            leg("recession", 0.3, "Layoffs cluster in recessions, so this pays when job risk is highest."),
            leg("spx-6300", 0.3, "A sharp market drop usually comes before hiring freezes."),
          ],
        },
        {
          name: "Job Market Hedge",
          legs: [
            leg("unemp-7", 0.5, "Pays if unemployment goes above 7% in any 2026 report."),
            leg("recession", 0.5, "Pays if the economy shrinks two quarters in a row."),
          ],
        },
      ],
      gap: "No market tracks layoffs at one company. Unemployment above 7% is the closest.",
      nearMisses: [{ ...unpriced[0], reason: "Closer to today's rate, but Gemini shows no prices for it yet." }],
    };
  }

  if (/gas|oil|fuel|commute|drive|petrol|heating|diesel/.test(w)) {
    return {
      kind: "energy",
      match: "partial",
      options: [
        {
          name: "Fuel Cost Hedge",
          legs: [
            leg("wti-84", 0.4, "WTI drives US pump prices."),
            leg("brent-90", 0.3, "Brent sets most global fuel prices."),
            leg("hormuz-no", 0.3, "Gulf shipping disruption keeps oil expensive for longer."),
          ],
        },
        {
          name: "Oil Spike Hedge",
          legs: [
            leg("wti-84", 0.5, "Pays if WTI closes at $84 or above tomorrow."),
            leg("brent-90", 0.5, "Pays if Brent closes at $90 or above tomorrow."),
          ],
        },
      ],
      gap: "No market tracks pump prices directly. WTI oil at $84 or above is the closest, and it resolves tomorrow.",
      nearMisses: [{ ...unpriced[1], reason: "Matches heating costs, but Gemini shows no prices for it yet." }],
    };
  }

  if (/heat|hot|temperature|weather|warm/.test(w)) {
    return {
      kind: "weather",
      match: "partial",
      options: [
        {
          name: "Hot Day Hedge",
          legs: [
            leg("aus-76", 0.6, "Pays if tomorrow's Austin high is 76°F to 77°F, well above normal."),
            leg("mia-84", 0.4, "Pays if Miami reaches 84°F to 85°F tomorrow."),
          ],
        },
      ],
      gap: "Gemini lists next-day highs for a few cities only, so this hedges one hot day tomorrow, not a heat wave.",
      nearMisses: [
        {
          title: "Highest temperature in Austin on November 19, 2026?",
          contract: "78°F or above",
          ticker: "WXHIGH-AUS-2611200459",
          slug: "highest-temperature-in-austin-on-november-19-2026",
          reason: "A hotter day, but nobody is bidding on it, so it could not be sold back.",
        },
      ],
    };
  }

  if (/rate|mortgage|loan|fed|interest|borrow|credit/.test(w)) {
    return {
      kind: "rates",
      match: "strong",
      options: [
        {
          name: "Rate Hike Hedge",
          legs: [
            leg("fed-25", 0.7, "A December hike pushes variable rates up. Most traders expect it, so it costs more."),
            leg("spx-6300", 0.3, "High rates for longer often pull stocks down too."),
          ],
        },
        {
          name: "Surprise Hike Hedge",
          legs: [
            leg("fed-gt25", 0.7, "Only the surprise: a hike bigger than 25bps in December."),
            leg("spx-6300", 0.3, "Big hikes often hit stocks too."),
          ],
        },
      ],
      nearMisses: [],
    };
  }

  if (/crypto|bitcoin|btc|eth|ether|paid in|coin|wallet/.test(w)) {
    return {
      kind: "crypto",
      match: "strong",
      options: [
        {
          name: "Crypto Drop Hedge",
          legs: [
            leg("btc-d-62500", 0.6, "Pays if BTC closes below $62,500 tomorrow at 4 PM CST."),
            leg("eth-d-1760", 0.4, "Pays if ETH closes below $1,760 at the same time."),
          ],
        },
      ],
      nearMisses: [],
      suggest: CRASH_ID,
    };
  }

  if (/recession|economy|downturn|stock|market|crash|s&p|401k|savings/.test(w)) {
    return {
      kind: "economy",
      match: "strong",
      options: [
        {
          name: "Downturn Hedge",
          legs: [
            leg("recession", 0.4, "The broadest signal that things are getting worse."),
            leg("spx-6300", 0.4, "Markets usually fall before the economy does."),
            leg("unemp-7", 0.2, "Covers the hit to household income."),
          ],
        },
      ],
      nearMisses: [],
      suggest: "recession-hedge",
    };
  }

  return {
    kind: "economy",
    match: "none",
    options: [],
    gap: "No Gemini market tracks this, so there is no honest hedge for it yet.",
    nearMisses: [
      {
        title: "Recession this year?",
        contract: "Yes",
        ticker: "RECESSION26",
        slug: "recession-this-year",
        reason: "Only helps if your worry gets worse in a downturn.",
      },
    ],
    suggest: "recession-hedge",
  };
}

export type Refinement = "cheaper" | "this-year";

const END_2026 = "2027-01-01T06:00:00.000Z";

const reweight = (legs: Leg[]) => {
  const total = legs.reduce((s, l) => s + l.weight, 0);
  const out = legs.map((l) => ({ ...l, weight: Math.round((l.weight / total) * 100) / 100 }));
  out[out.length - 1].weight = Math.round((1 - out.slice(0, -1).reduce((s, l) => s + l.weight, 0)) * 100) / 100;
  return out;
};

// Returns null when the refinement would not change anything.
export function refine(o: Option, r: Refinement): { option: Option; note: string } | null {
  if (r === "cheaper") {
    if (o.legs.length < 2) return null;
    const priciest = [...o.legs].sort((a, b) => mintPrice([{ ...b, weight: 1 }]) - mintPrice([{ ...a, weight: 1 }]))[0];
    const legs = reweight(o.legs.filter((l) => l !== priciest));
    return {
      option: { name: `${o.name} (lighter)`, legs },
      note: `Dropped “${priciest.short}”, the most expensive leg.`,
    };
  }
  const legs = o.legs.filter((l) => l.expires && l.expires < END_2026);
  if (legs.length === o.legs.length) return null;
  if (!legs.length) return null;
  return {
    option: { name: `${o.name} (2026 only)`, legs: reweight(legs) },
    note: `Kept ${legs.length} of ${o.legs.length} legs that resolve this year.`,
  };
}
