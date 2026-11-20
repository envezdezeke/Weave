// Mirrors each onchain mint on the Gemini SANDBOX (never production): for a mint
// of N tokens, buy round(N x weight) NO contracts per leg. A failed hedge never
// blocks a mint; it is logged and recorded as unhedged (decision Q13).
//
// Env: GEMINI_SANDBOX_KEY, GEMINI_SANDBOX_SECRET (Trader role, sandbox account).

import { createHmac } from "node:crypto";
import { appendFileSync } from "node:fs";

const SANDBOX = "https://api.sandbox.gemini.com"; // hard-coded: sandbox only
const KEY = process.env.GEMINI_SANDBOX_KEY ?? "";
const SECRET = process.env.GEMINI_SANDBOX_SECRET ?? "";
export const hedgeEnabled = KEY !== "" && SECRET !== "";

type Contract = { label: string; instrumentSymbol: string; prices?: { bestBid?: string | null; bestAsk?: string | null } };
type Event = { ticker: string; contracts: Contract[] };

export type HedgeFill = { symbol: string; qty: number; price: number | null; orderId: string | null; error?: string };

let nonce = Date.now() * 1000;

async function privatePost(path: string, body: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify({ request: path, nonce: String(++nonce), ...body })).toString("base64");
  const signature = createHmac("sha384", SECRET).update(payload).digest("hex");
  const r = await fetch(`${SANDBOX}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": "0",
      "X-GEMINI-APIKEY": KEY,
      "X-GEMINI-PAYLOAD": payload,
      "X-GEMINI-SIGNATURE": signature,
      "Cache-Control": "no-cache",
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 200)}`);
  return JSON.parse(text) as Record<string, unknown>;
}

const strikeOf = (label: string) => Number(label.replace(/[^0-9.]/g, ""));

// Sandbox ladders can differ from production: use the same symbol if listed,
// otherwise the nearest strike in the same hourly event.
async function sandboxContract(ticker: string, symbol: string, label: string) {
  const r = await fetch(`${SANDBOX}/v1/prediction-markets/events/${ticker}`);
  if (!r.ok) throw new Error(`sandbox event ${ticker}: ${r.status}`);
  const e = (await r.json()) as Event;
  const same = e.contracts.find((c) => c.instrumentSymbol === symbol);
  if (same) return same;
  const k = strikeOf(label);
  return [...e.contracts].sort((a, b) => Math.abs(strikeOf(a.label) - k) - Math.abs(strikeOf(b.label) - k))[0];
}

export async function hedgeMint(
  mint: { id: bigint; tokens: number; tx: string },
  legs: { symbol: string; ticker: string; label: string }[],
  weights: number[],
): Promise<HedgeFill[]> {
  const fills: HedgeFill[] = [];
  for (const [i, l] of legs.entries()) {
    const qty = Math.max(1, Math.round(mint.tokens * (weights[i] / 10_000)));
    try {
      const c = await sandboxContract(l.ticker, l.symbol, l.label);
      const yesBid = c.prices?.bestBid;
      if (yesBid == null || yesBid === "") throw new Error("no sandbox NO ask");
      const price = Math.min(0.99, Math.round((1 - Number(yesBid)) * 100) / 100);
      const res = await privatePost("/v1/prediction-markets/order", {
        symbol: c.instrumentSymbol,
        orderType: "limit",
        side: "buy",
        outcome: "no",
        quantity: String(qty),
        price: price.toFixed(2),
        timeInForce: "immediate-or-cancel",
      });
      fills.push({ symbol: c.instrumentSymbol, qty, price, orderId: String(res.orderId ?? res.order_id ?? res.id ?? "") });
    } catch (e) {
      fills.push({ symbol: l.symbol, qty, price: null, orderId: null, error: (e as Error).message });
    }
  }
  appendFileSync(new URL("./hedges.jsonl", import.meta.url), JSON.stringify({ at: new Date().toISOString(), basket: String(mint.id), ...mint, id: undefined, fills }) + "\n");
  return fills;
}
