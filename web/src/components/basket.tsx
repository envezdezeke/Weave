"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { contracts, explorer, hedgeCoverage, type Basket } from "@/lib/data";
import { cents, chance, clock, compactUsd, dateTime, day, left, oneIn, pct, qty, tokenUsd, usd } from "@/lib/format";
import { geminiUrl, inWindow, type Leg, type Window } from "@/lib/markets";
import { fairValue, illiquid, lastExpiry, mid, mintPrice, outcomes, payoutFor, quote } from "@/lib/pricing";
import { useCrashWindow, useStore } from "@/lib/store";
import { useLive, withLive } from "@/lib/live";
import { onchain, WEAVE, type OnchainBasket } from "@/lib/chain";
import { ChanceBar } from "./charts";
import { BasketIcon } from "./icons";
import { Address, Card, Chip, ExtLink, KindLabel, LegDot, Row, SideChip, tint, WeightBar } from "./ui";

// Fills rolling legs from the clock. Before mount there is no clock, so
// times render as placeholders and nothing shows a stale window.
export function useLiveBasket(b: Basket) {
  const w = useCrashWindow();
  const live = useLive();
  return useMemo(() => {
    const timed = b.rolling && w ? b.legs.map((l) => inWindow(l, w)) : b.legs;
    const legs = timed.map((l) => withLive(l, live));
    const ends = b.rolling ? (w ? new Date(w.end).toISOString() : "") : lastExpiry(legs);
    return { basket: { ...b, legs }, window: b.rolling ? w : null, now: w?.now ?? null, ends, live: live?.at ?? null };
  }, [b, w, live]);
}

const endsText = (b: Basket, ends: string) => (!ends ? "–" : b.rolling ? clock(ends) : day(ends));

export function Clocks({ w, compact = false }: { w: (Window & { now: number }) | null; compact?: boolean }) {
  if (!w) return <span className="num text-sm text-fg-muted">Buy by –:– · Resolves –:–</span>;
  const open = w.now < w.buyBy;
  return (
    <div className={`num flex flex-wrap gap-x-4 gap-y-1 text-sm ${compact ? "" : "font-medium"}`}>
      <span>
        Buy by {clock(w.buyBy)} · <span className="font-semibold">{open ? `${left(w.buyBy - w.now)} left` : "closed"}</span>
      </span>
      <span className="opacity-70">Resolves {clock(w.end)}</span>
    </div>
  );
}

export function BasketCard({ basket: base }: { basket: Basket }) {
  const store = useStore();
  const { basket, ends, window } = useLiveBasket(base);
  const price = mintPrice(basket.legs);
  const v = store?.vault(basket, window?.end);
  const shown = basket.legs.slice(0, 3);
  return (
    <Link
      href={`/basket/${basket.id}`}
      style={tint(basket.kind)}
      className="group flex flex-col gap-5 rounded-3xl border border-line p-5 transition-colors hover:border-line-heavy"
    >
      <div className="flex items-start gap-3">
        <BasketIcon icon={basket.icon} kind={basket.kind} />
        <div className="min-w-0 flex-1">
          <KindLabel kind={basket.kind} />
          <h3 className="truncate font-semibold tracking-tight">{basket.name}</h3>
          <p className="truncate text-sm text-fg-muted">{basket.tagline}</p>
        </div>
        <Chip tone={basket.badge === "Live" ? "brand" : "neutral"}>{basket.badge}</Chip>
      </div>

      <ThreeNumbers price={price} ends={endsText(basket, ends)} compact />

      <div>
        <WeightBar legs={basket.legs} />
        <ul className="mt-3 space-y-2">
          {shown.map((l, i) => (
            <li key={l.id} className="flex items-center gap-2.5 text-sm">
              <LegDot i={i} />
              <span className="min-w-0 flex-1 truncate">{l.short}</span>
              <span className="w-16 shrink-0">
                <ChanceBar value={mid(l)} />
              </span>
              <span className="num w-10 shrink-0 text-right font-medium">{chance(mid(l))}</span>
            </li>
          ))}
          {basket.legs.length > 3 && <li className="text-xs text-fg-muted">+{basket.legs.length - 3} more</li>}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-fg-muted">
        <span className="num">
          <span className="font-medium text-fg">$5 → up to {usd(Math.floor(5 / price), 0)}</span> · Each leg pays its share
        </span>
        <span className="num">{v ? `${compactUsd(v.balance)} backed` : "–"}</span>
      </div>
    </Link>
  );
}

// "Cost · Pays up to · Ends" plus the max loss, on cards and the detail page.
export function ThreeNumbers({ price, ends, compact = false }: { price: number; ends: string; compact?: boolean }) {
  const cell = compact ? "text-base sm:text-lg" : "text-base sm:text-2xl";
  return (
    <div>
      <dl className={`grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line`}>
        {[
          ["Cost", tokenUsd(price)],
          ["Pays up to", usd(1)],
          ["Ends", ends],
        ].map(([k, v]) => (
          <div key={k} className="bg-bg-elev-1 px-3 py-2.5">
            <dt className="text-xs text-fg-muted">{k}</dt>
            <dd className={`num mt-0.5 truncate font-semibold tracking-tight ${cell}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="num mt-2 text-xs text-fg-muted">Most you can lose: {tokenUsd(price)} per token.</p>
    </div>
  );
}

export function LegList({
  legs,
  showWhy = false,
  detail = false,
  onActive,
}: {
  legs: Leg[];
  showWhy?: boolean;
  detail?: boolean;
  onActive?: (i: number | null) => void;
}) {
  return (
    <ul className="divide-y divide-line">
      {legs.map((l, i) => {
        const m = mid(l);
        const q = quote(l);
        return (
          <li
            key={l.id}
            id={`leg-${l.id}`}
            className="scroll-mt-28 py-4"
            onMouseEnter={() => onActive?.(i)}
            onMouseLeave={() => onActive?.(null)}
            onFocus={() => onActive?.(i)}
            onBlur={() => onActive?.(null)}
          >
            <div className="flex items-start gap-3">
              <span className="mt-1.5">
                <LegDot i={i} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{l.short}</span>
                  <SideChip side={l.side} />
                  {illiquid(l) && <Chip tone="warning">No bid · illiquid</Chip>}
                </div>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {l.side} {l.contract === "Yes" ? "in" : <>on “{l.contract}” in</>} <ExtLink href={geminiUrl(l)}>{l.title}</ExtLink>
                </p>
                {showWhy && l.why && <p className="mt-2 text-sm">{l.why}</p>}
                {showWhy && (
                  <p className="mt-1 text-xs text-fg-muted">
                    Decided by {l.source} · {l.expires ? `closes ${dateTime(l.expires)}` : "closes at window end"}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="num text-lg font-semibold">{chance(m)}</div>
                <div className="num text-xs text-fg-muted">
                  chance · {cents(m)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 pl-5">
              <ChanceBar value={m} />
              <span className="num shrink-0 text-xs text-fg-muted">
                weight {pct(l.weight)} · <span className="font-medium text-fg">pays {usd(l.weight)}</span>
              </span>
            </div>
            {detail && (
              <p className="num mt-1 pl-5 text-xs text-fg-muted">
                {chance(m)} chance ({oneIn(m)}) · Gemini {l.side} bid {q.bid === null ? "none" : cents(q.bid)} · ask{" "}
                {q.ask === null ? "none" : cents(q.ask)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export const COMBO_LINE = "Combos pay only if every leg resolves YES. Baskets pay for each leg that does.";

export function ComboLine() {
  return (
    <p className="mt-3 rounded-xl bg-brand-wash px-4 py-3 text-sm font-medium text-brand">{COMBO_LINE}</p>
  );
}

// The what-if switchboard: tap the events that happen and watch the payout
// fill, next to what the same legs would pay as an all-or-nothing combo.
// Every scenario is still listed underneath for up to 3 legs.
export function HowItPays({
  legs,
  scale = 1,
  title = "How it pays",
  unit = "per token",
  compact = false,
}: {
  legs: Leg[];
  scale?: number;
  title?: string;
  unit?: string;
  compact?: boolean;
}) {
  const [on, setOn] = useState<Set<string>>(() => new Set(legs.slice(0, 1).map((l) => l.id)));
  const value = payoutFor(legs, on) * scale;
  const all = on.size === legs.length;
  const toggle = (id: string) =>
    setOn((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-fg-muted">Tap what happens</span>
      </div>
      <div className="mt-3 grid gap-2">
        {legs.map((l, i) => {
          const pressed = on.has(l.id);
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(l.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                pressed ? "border-fg bg-bg-alt" : "border-line hover:border-line-heavy"
              }`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-md border text-[11px] ${pressed ? "border-fg bg-fg text-bg" : "border-line-heavy"}`}
                aria-hidden
              >
                {pressed ? "✓" : ""}
              </span>
              <LegDot i={i} />
              <span className="min-w-0 flex-1 truncate">{l.short}</span>
              <span className="num shrink-0 text-xs text-fg-muted">pays {usd(l.weight * scale)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-bg-elev-2" aria-hidden>
        {legs.map((l, i) => (
          <span
            key={l.id}
            className={`${["bg-leg-1", "bg-leg-2", "bg-leg-3", "bg-leg-4"][i % 4]} h-full transition-[width] duration-300 motion-reduce:transition-none`}
            style={{ width: on.has(l.id) ? `${l.weight * 100}%` : 0 }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3" aria-live="polite">
        <span className="text-sm text-fg-muted">Weave pays you</span>
        <span className="num text-3xl font-semibold tracking-tight">
          {usd(value)} <span className="text-sm font-normal text-fg-muted">{unit}</span>
        </span>
      </div>
      <p className="num mt-1 text-right text-xs text-fg-muted">
        {all ? "A combo of the same legs would pay too, only because every leg happened." : "The same legs as a combo would pay $0.00: combos need every leg."}
      </p>
      {!compact && legs.length <= 3 && (
        <details className="mt-4 border-t border-line pt-3 text-sm">
          <summary className="cursor-pointer text-fg-muted hover:text-fg">Every scenario</summary>
          <table className="num mt-2 w-full">
            <tbody className="divide-y divide-line">
              {outcomes(legs).map((o) => (
                <tr key={o.label}>
                  <td className="py-1.5 pr-4">{o.label}</td>
                  <td className="py-1.5 text-right font-semibold">{usd(o.payout * scale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-fg-muted">Scenarios, not chances: legs can move together.</p>
        </details>
      )}
    </div>
  );
}

function Gauge({ value, label }: { value: number; label: string }) {
  const full = value >= 1;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-fg-muted">
        <span>{label}</span>
        <span className={`num text-sm font-semibold ${full ? "text-fg" : "text-fg-warning"}`}>{Math.floor(value * 100)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-elev-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
        <div className={`h-full rounded-full ${full ? "bg-fg" : "bg-fg-warning"}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}

export function useVault(b: Basket, window: Window | null) {
  const store = useStore();
  return store?.vault(b, window?.end) ?? null;
}

// The newest Crash Cover basket onchain, for the rolling basket only.
export function useOnchainBasket(b: Basket): OnchainBasket | null {
  const live = useLive();
  return onchain && b.rolling ? (live?.basket ?? null) : null;
}

// Reserve ratio, solvency gauge and hedge coverage (decisions Q8, Q13).
export function BackingCard({ basket, window, now }: { basket: Basket; window: Window | null; now: number | null }) {
  const mock = useVault(basket, window);
  const ob = useOnchainBasket(basket);
  const block = now ? contracts.block + Math.floor((now - Date.UTC(2026, 10, 18, 22)) / 2000) : null;
  if (!mock) return <Card className="h-56 animate-pulse">{null}</Card>;
  // Onchain: reserve vs supply x $1. The hedge record stays a sandbox simulation.
  const v = ob ? { ...mock, supply: ob.supply, balance: ob.reserve } : mock;
  const ratio = v.supply ? v.balance / v.supply : 1;
  const hedged = hedgeCoverage(mock.trades);
  return (
    <Card id="backing">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Backing</h2>
        {v.supply ? (
          <Chip tone={ratio >= 1 ? "positive" : "warning"}>{ratio >= 1 ? "Fully reserved" : "Under-reserved"}</Chip>
        ) : (
          <Chip>No tokens yet</Chip>
        )}
      </div>
      {v.supply ? (
        <>
          <div className="num mt-3 text-4xl font-semibold tracking-tight">{Math.floor(ratio * 100)}%</div>
          <p className="num mt-1 text-sm text-fg-muted">
            {usd(v.balance)} USDC held for {qty(v.supply)} tokens × {usd(1)} max payout
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-fg-muted">The vault opens with the first buy and always holds {usd(1)} for every token.</p>
      )}
      <div className="mt-5 space-y-4">
        <Gauge value={ratio} label="Vault balance ÷ max liability" />
        <Gauge value={hedged} label={ob ? "Sandbox hedge (simulated)" : "Hedged on Gemini (sandbox)"} />
      </div>
      <p className="num mt-4 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
        <span>{ob ? `Basket #${ob.id}, read from Arc` : `As of block ${block ? qty(block) : "–"}`}</span>
        <span aria-hidden>·</span>
        <ExtLink href={explorer.address(basket.vault)}>Verify on Arc</ExtLink>
      </p>
      <p className="mt-3 border-t border-line pt-3 text-xs text-fg-muted">
        Payouts depend on Gemini settling each contract. An operator role posts results onchain and manages the
        reserve.
      </p>
    </Card>
  );
}

export function OnchainCard({ basket }: { basket: Basket }) {
  const ob = useOnchainBasket(basket);
  return (
    <Card>
      <h2 className="font-semibold">Onchain</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Settled in USDC on {contracts.chain}. Gas is paid in USDC too. Basket tokens are ERC-1155, so any wallet can hold
        or send them.
      </p>
      <div className="mt-3 text-sm">
        <Row label="Basket token" value={<Address value={basket.token} />} />
        <Row label="Token ID" value={ob ? ob.id : basket.tokenId} />
        <Row label="Vault" value={<Address value={basket.vault} />} />
        <Row label="Resolver" value={<Address value={contracts.resolver} />} />
        <Row label="USDC" value={<Address value={contracts.usdc} />} />
      </div>
    </Card>
  );
}

const RESULT = ["Open", "Hit", "Miss"];

// Onchain proof for the live Crash Cover: contract, basket id, posted price, Gemini symbols, results.
export function ProofCard({ basket, now }: { basket: Basket; now: number | null }) {
  const ob = useOnchainBasket(basket);
  if (!ob) return null;
  const ago = now && ob.priceAt ? Math.max(0, Math.round((now - ob.priceAt) / 1000)) : null;
  return (
    <Card id="proof">
      <h2 className="font-semibold">Proof</h2>
      <div className="mt-3 text-sm">
        <Row label="Vault contract" value={<ExtLink href={explorer.address(WEAVE)}>{`${WEAVE.slice(0, 6)}…${WEAVE.slice(-4)}`}</ExtLink>} />
        <Row label="Basket ID" value={`#${ob.id}`} />
        <Row label="Posted price" value={`${tokenUsd(ob.price)}${ago === null ? "" : ` · ${ago}s ago`}`} />
        {ob.meta.legs.map((l, i) => (
          <Row
            key={l.symbol}
            label={<span className="font-mono text-xs">{l.symbol}</span>}
            value={ob.settled ? RESULT[ob.results[i]] ?? "–" : l.label}
          />
        ))}
      </div>
    </Card>
  );
}

export function WhoDecides({ legs }: { legs: Leg[] }) {
  return (
    <Card id="who-decides">
      <h2 className="font-semibold">Who decides</h2>
      <p className="mt-1 text-sm text-fg-muted">Gemini Predictions decides every leg. We never decide outcomes.</p>
      <ul className="mt-3 space-y-4">
        {legs.map((l, i) => (
          <li key={l.id} className="text-sm">
            <div className="flex items-center gap-2 font-medium">
              <LegDot i={i} /> {l.short}
              <span className="font-normal text-fg-muted">
                · holds {l.side}{l.contract === "Yes" ? "" : ` on “${l.contract}”`}
              </span>
            </div>
            <p className="mt-1 text-fg-muted">{l.rule}</p>
            <div className="mt-2 rounded-xl border border-line bg-bg-alt px-3 py-2 text-xs">
              <span className="font-semibold">Important information</span>
              <span className="text-fg-muted">
                {" "}
                · Decided by Gemini Predictions using {l.source}.{l.expires ? ` Closes ${dateTime(l.expires)}.` : ""}{" "}
              </span>
              <ExtLink href={geminiUrl(l)}>Live market on Gemini</ExtLink>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Per-trade Gemini sandbox fills against the production price (decisions Q2, Q7, Q13).
export function HedgeRecord({ basket, window }: { basket: Basket; window: Window | null }) {
  const v = useVault(basket, window);
  if (!v) return null;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Hedge record</h2>
        <span className="num text-xs text-fg-muted">Gemini sandbox · {v.trades.length} trades</span>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        For every token sold, the operator buys each leg on the Gemini sandbox, so the payout is matched exactly. Prices
        come from production; fills come from the sandbox.
      </p>
      {v.trades.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">No trades yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="num w-full min-w-[480px] text-left text-xs">
            <thead className="whitespace-nowrap text-fg-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">Trade</th>
                <th className="py-2 pr-3 font-medium">Leg</th>
                <th className="py-2 pr-3 font-medium">Sandbox order</th>
                <th className="py-2 pr-3 text-right font-medium">Fill vs prod</th>
                <th className="py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {v.trades.slice(0, 4).flatMap((t) =>
                t.fills.map((f, i) => (
                  <tr key={`${t.id}${f.legId}`} className={i === t.fills.length - 1 ? "border-b border-line" : ""}>
                    <td className="py-1.5 pr-3 align-top whitespace-nowrap text-fg-muted">{i === 0 ? `${qty(t.tokens)} tokens · ${clock(t.at)}` : ""}</td>
                    <td className="py-1.5 pr-3">
                      {f.short} <span className="whitespace-nowrap text-fg-muted">× {qty(f.qty)}</span>
                    </td>
                    <td className="py-1.5 pr-3 font-mono">{f.orderId ?? "–"}</td>
                    <td className="py-1.5 pr-3 text-right">
                      {f.fillPrice === null ? "–" : `${cents(f.fillPrice)} vs ${cents(f.prodPrice)}`}
                      {f.fillPrice !== null && f.fillPrice !== f.prodPrice && (
                        <span className="text-fg-muted"> ({f.fillPrice > f.prodPrice ? "+" : "−"}{cents(Math.abs(f.fillPrice - f.prodPrice))})</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right">
                      {f.fillPrice === null ? <Chip tone="warning">Unhedged, retrying</Chip> : <Chip tone="positive">Hedged</Chip>}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-fg-muted">If a fill fails, the purchase still stands: the reserve always backs the payout.</p>
    </Card>
  );
}

export function GoodToKnow() {
  return (
    <section className="rounded-2xl bg-bg-alt p-5 text-sm text-fg-muted">
      <h2 className="font-semibold text-fg">Good to know</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>
          This pays when the listed events happen, not when you have a loss. Your real costs may be higher or lower.
        </li>
        <li>Weights are fixed at creation and never rebalance.</li>
        <li>You hold until the legs resolve. There is no early sale in this version.</li>
        <li>Gemini decides each leg. The operator posts each result onchain, so you trust it to post them correctly.</li>
        <li>Testnet demo: Arc Testnet USDC and Gemini sandbox orders. No real money.</li>
      </ul>
    </section>
  );
}

export function FairValueLine({ legs }: { legs: Leg[] }) {
  return (
    <p className="num text-sm text-fg-muted">
      The market expects this basket to pay about <span className="font-medium text-fg">{tokenUsd(fairValue(legs))}</span> per token on
      average. You pay <span className="font-medium text-fg">{tokenUsd(mintPrice(legs))}</span> including the 2% fee.
    </p>
  );
}
