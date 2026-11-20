// AI builder: an LLM on Groq picks Gemini legs for a worry from the market
// list, then its output is validated (known legs only, weights sum to 1, honest
// "none" allowed). One repair retry with the errors; otherwise the keyword
// rules in lib/builder answer, and the response says which path was used.

import { NextResponse } from "next/server";
import { draftFromWorry, type Draft, type Match } from "@/lib/builder";
import { catalog, leg, type LegId } from "@/lib/markets";

const GROQ = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const KINDS = ["crypto", "economy", "weather", "rates", "energy"] as const;
const MATCHES: Match[] = ["strong", "partial", "none"];

const MARKETS = Object.values(catalog)
  .map((m) => {
    const ask = m.side === "NO" ? (m.book.bid == null ? null : 1 - m.book.bid) : m.book.ask;
    return `- id=${m.id} | pays if: ${m.short} | Gemini: "${m.title}" / ${m.side} on "${m.contract}" | ask ${ask ?? "none"} | ${m.expires ? `expires ${m.expires.slice(0, 10)}` : "rolls hourly"} | ${m.category}`;
  })
  .join("\n");

const SYSTEM = `You build hedges from real Gemini prediction markets. A basket is 1-4 legs from the list below with weights summing to 1; each token pays the sum of weights of legs that happen (max $1). Weight legs by how much each one tracks the user's stated exposure.
Rules:
- Use ONLY ids from the list. Never invent markets. No sports or politics.
- If no market tracks the worry, return match "none" with empty options and explain the gap honestly. A weak hedge is worse than none.
- "partial" when legs are proxies, and say in "gap" what is not covered.
- Each leg gets a one-sentence "why" in plain English. Never use the words bet, insurance or trustless.
- Give 1-2 options.
Markets:
${MARKETS}

Reply with JSON only:
{"kind":"crypto|economy|weather|rates|energy","match":"strong|partial|none","options":[{"name":"...","legs":[{"id":"...","weight":0.5,"why":"..."}]}],"gap":"... or omit"}`;

type Raw = { kind?: string; match?: string; options?: { name?: string; legs?: { id?: string; weight?: number; why?: string }[] }[]; gap?: string };

function validate(r: Raw): { draft?: Draft; errors: string[] } {
  const errors: string[] = [];
  if (!KINDS.includes(r.kind as never)) errors.push(`kind must be one of ${KINDS.join(", ")}`);
  if (!MATCHES.includes(r.match as Match)) errors.push("match must be strong, partial or none");
  const options = (r.options ?? []).map((o, i) => {
    const legs = o.legs ?? [];
    if (!o.name) errors.push(`option ${i} needs a name`);
    if (legs.length < 1 || legs.length > 4) errors.push(`option ${i} needs 1-4 legs`);
    const ids = new Set<string>();
    for (const l of legs) {
      if (!l.id || !(l.id in catalog)) errors.push(`unknown market id "${l.id}"`);
      if (ids.has(l.id ?? "")) errors.push(`duplicate id "${l.id}"`);
      ids.add(l.id ?? "");
      if (!(typeof l.weight === "number" && l.weight > 0)) errors.push(`weight for ${l.id} must be > 0`);
    }
    const sum = legs.reduce((s, l) => s + (l.weight ?? 0), 0);
    if (Math.abs(sum - 1) > 0.02) errors.push(`option ${i} weights sum to ${sum.toFixed(2)}, must be 1`);
    return { name: o.name ?? "", legs };
  });
  if (r.match === "none" && options.length) errors.push('match "none" must have no options');
  if (r.match !== "none" && !options.length) errors.push("give at least one option or use match none");
  if (errors.length) return { errors };
  const draft: Draft = {
    kind: r.kind as Draft["kind"],
    match: r.match as Match,
    gap: r.gap || undefined,
    nearMisses: [],
    options: options.map((o) => {
      const legs = o.legs.map((l) => leg(l.id as LegId, Math.round(l.weight! * 100) / 100, l.why));
      legs[legs.length - 1].weight = Math.round((1 - legs.slice(0, -1).reduce((s, l) => s + l.weight, 0)) * 100) / 100;
      return { name: o.name, legs };
    }),
  };
  if (draft.options.some((o) => o.legs.some((l) => l.id === "btc-1h" || l.id === "eth-1h"))) draft.suggest = "crash-1h";
  return { draft, errors };
}

async function ask(messages: { role: string; content: string }[], key: string): Promise<Raw> {
  const res = await fetch(GROQ, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, response_format: { type: "json_object" } }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`groq ${res.status}`);
  const j = await res.json();
  return JSON.parse(j.choices[0].message.content);
}

export async function POST(req: Request) {
  const { worry } = (await req.json().catch(() => ({}))) as { worry?: string };
  const q = String(worry ?? "").slice(0, 500);
  const key = process.env.GROQ_API_KEY;
  if (!key || !q) return NextResponse.json({ draft: draftFromWorry(q), source: "rules" });
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: q },
  ];
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await ask(messages, key);
      const { draft, errors } = validate(raw);
      if (draft) return NextResponse.json({ draft, source: "llm", model: MODEL, repaired: attempt > 0 });
      messages.push({ role: "assistant", content: JSON.stringify(raw) }, { role: "user", content: `Invalid: ${errors.join("; ")}. Fix and reply with JSON only.` });
    }
  } catch (e) {
    console.error("builder llm failed:", (e as Error).message);
  }
  return NextResponse.json({ draft: draftFromWorry(q), source: "rules" });
}
