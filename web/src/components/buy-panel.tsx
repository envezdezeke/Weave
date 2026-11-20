"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { explorer, type Basket } from "@/lib/data";
import { clock, dateTime, day, qty, short, tokenUsd, usd } from "@/lib/format";
import type { Window } from "@/lib/markets";
import { FEE, mintPrice, mintable, NETWORK_FEE, outcomes, quote, sizeFromCost, sizeHedge } from "@/lib/pricing";
import { useStore } from "@/lib/store";
import { buy as chainBuy, onchain } from "@/lib/chain";
import { useLive } from "@/lib/live";
import { Check, Spinner } from "./icons";
import { Disclosure, ExtLink, Row } from "./ui";

type Step = "edit" | "review" | "submitting" | "confirming" | "slow" | "done" | "failed";

const PRESETS = [1, 5, 10];
const SLOW_AFTER = 60_000;

// Demo switches for the states a judge would otherwise never see:
// ?tx=slow, ?tx=fail, ?hedge=fail.
function sim() {
  const q = new URLSearchParams(window.location.search);
  return { tx: q.get("tx"), hedge: q.get("hedge") };
}

export function BuyPanel({ basket, window: w, ends, now }: { basket: Basket; window: Window | null; ends: string; now: number | null }) {
  const store = useStore();
  const [mode, setMode] = useState<"risk" | "cost">("risk");
  const [atRisk, setAtRisk] = useState("100");
  const [share, setShare] = useState(25);
  const [spend, setSpend] = useState("5");
  const [step, setStep] = useState<Step>("edit");
  const [receipt, setReceipt] = useState<{ tokens: number; cost: number; price: number; hash: string; at: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Onchain mode: Crash Cover buys the basket the operator has open on Arc, at
  // its posted price, in whole tokens (each pays up to $1).
  const live = useLive();
  const ob = onchain && basket.rolling ? (live?.basket ?? null) : null;
  const chainMode = onchain && !!basket.rolling;
  const fresh = !!ob && !ob.settled && !!now && now < ob.closeTime && now - ob.priceAt < 120_000;
  const price = ob && fresh ? ob.price : mintPrice(basket.legs);
  const raw = mode === "risk" ? sizeHedge(Number(atRisk) || 0, share / 100, price) : sizeFromCost(Number(spend) || 0, price);
  const whole = Math.floor(raw.tokens);
  const sized = chainMode ? { ...raw, tokens: whole, maxPayout: whole, cost: Math.round(whole * price * 1e6) / 1e6 } : raw;
  const balance = chainMode ? Infinity : (store?.balance ?? 0);
  const total = sized.cost + NETWORK_FEE;
  const windowShut = !!basket.rolling && (!w || !now || now >= w.buyBy);
  const closed = !mintable(basket.legs) || windowShut || (chainMode && !fresh);
  const [error, setError] = useState<string | null>(null);
  const noAsk = basket.legs.some((l) => quote(l).ask === null);
  const endsLabel = !ends ? "–" : basket.rolling ? dateTime(ends) : day(ends);

  const problem = !store
    ? "Loading wallet…"
    : noAsk
      ? "A leg has no ask on Gemini"
      : chainMode && !fresh && !windowShut
        ? "Waiting for the operator to price this hour"
        : closed
        ? "This window has closed"
        : sized.tokens < (chainMode ? 1 : 0.01)
          ? chainMode ? "Enter an amount (at least 1 whole token)" : "Enter an amount"
          : total > balance
            ? "Not enough USDC"
            : null;

  const confirmOnchain = () => {
    if (!store || !ob) return;
    setError(null);
    setStep("submitting");
    const order = { tokens: sized.tokens, cost: sized.cost, price };
    // 2% slippage room over the posted price; the contract refuses anything above it.
    chainBuy(ob.id, sized.tokens, sized.cost * 1.02, () => setStep("confirming"))
      .then((hash) => {
        const { id } = store.submitBuy({ basket, legs: basket.legs, ...order, windowEnd: w?.end, hash, chainId: ob.id });
        store.confirmBuy(id);
        setReceipt({ ...order, hash, at: Date.now() });
        setStep("done");
      })
      .catch((e: Error) => {
        setError(e.message.split("\n")[0]);
        setStep("failed");
      });
  };

  const confirm = () => {
    if (!store || problem) return;
    if (chainMode) return confirmOnchain();
    const s = sim();
    const { id, hash } = store.submitBuy({ basket, legs: basket.legs, tokens: sized.tokens, price, cost: sized.cost, windowEnd: w?.end });
    const order = { tokens: sized.tokens, cost: sized.cost, price, hash, at: 0 };
    setReceipt(order);
    setStep("submitting");
    const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    later(900, () => setStep("confirming"));
    if (s.tx === "fail") {
      later(3200, () => {
        store.failBuy(id);
        setStep("failed");
      });
      return;
    }
    const confirmIn = s.tx === "slow" ? SLOW_AFTER + 15_000 : 2600;
    if (s.tx === "slow") later(900 + SLOW_AFTER, () => setStep("slow"));
    later(900 + confirmIn, () => {
      store.confirmBuy(id, { hedgeFails: s.hedge === "fail" });
      setReceipt({ ...order, at: Date.now() });
      setStep("done");
    });
  };

  if (step === "done" && receipt) {
    const fee = receipt.cost - receipt.cost / (1 + FEE);
    const hash = receipt.hash;
    return (
      <div className="rise">
        <div className="flex flex-col items-center pt-2 text-center">
          <span className="draw grid size-12 place-items-center rounded-full bg-bg-positive-wash text-fg-positive">
            <Check className="size-6" />
          </span>
          <h3 className="mt-4 text-lg font-semibold">Done. You own {qty(receipt.tokens)} {basket.name} tokens.</h3>
          <p className="num mt-1 text-sm text-fg-muted">Pays up to {usd(receipt.tokens)} if every event resolves YES.</p>
        </div>
        <div className="mt-5 rounded-xl bg-bg-alt p-3 text-sm">
          <div className="mb-1 text-xs font-semibold text-fg-muted">Receipt</div>
          <Row label="Amount" value={usd(receipt.cost)} />
          <Row label="Price" value={`${tokenUsd(receipt.price)} per token`} />
          <Row label="Fee (included)" value={usd(fee)} />
          <Row label="Network fee" value={usd(NETWORK_FEE)} />
          <Row label="Time" value={dateTime(receipt.at)} />
          <Row
            label="Transaction"
            value={
              <ExtLink href={explorer.tx(hash)} className="whitespace-nowrap">
                <span className="font-mono">{short(hash)}</span>
              </ExtLink>
            }
          />
        </div>
        <p className="mt-2 text-center text-xs">
          <ExtLink href={explorer.tx(hash)}>View on Arc explorer</ExtLink>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setStep("edit")} className="rounded-full border border-line py-3 text-sm font-semibold hover:bg-bg-elev-2">
            Buy more
          </button>
          <Link href="/portfolio" className="rounded-full bg-fg py-3 text-center text-sm font-semibold text-bg hover:opacity-90">
            Portfolio
          </Link>
        </div>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="rise py-2 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-bg-negative-wash text-xl font-semibold text-fg-negative" aria-hidden>
          !
        </span>
        <h3 className="mt-4 text-lg font-semibold">Didn&apos;t go through. No money moved.</h3>
        <p className="mt-1 text-sm text-fg-muted">{error ?? "Arc dropped this transaction before it confirmed. Try again."}</p>
        <button type="button" onClick={() => setStep("review")} className="mt-5 w-full rounded-full bg-fg py-3.5 text-sm font-semibold text-bg hover:opacity-90">
          Try again
        </button>
      </div>
    );
  }

  const pending = step === "submitting" || step === "confirming" || step === "slow";

  if (step !== "edit") {
    return (
      <div className="rise">
        <h3 className="font-semibold">Review order</h3>
        <div className="mt-4 rounded-xl border border-line p-3 text-sm">
          <Row label="You pay" value={<>{usd(sized.cost)} <span className="font-normal text-fg-muted">(includes 2% fee)</span></>} strong />
          <Row label="You receive" value={`${qty(sized.tokens)} tokens`} />
          <Row label="Max payout" value={usd(sized.maxPayout)} />
          <Row label="Most you can lose" value={usd(sized.cost)} />
          <Row label="Network fee" value={`${usd(NETWORK_FEE)} in USDC`} />
          <Row label="Ends" value={endsLabel} />
          <Row label="Held until it resolves" value="No early sale" />
        </div>
        <p className="mt-4 text-xs text-fg-muted">Once confirmed on Arc, this purchase is final. You can redeem after legs resolve.</p>

        {pending ? (
          <div className="mt-4 rounded-xl bg-bg-alt p-4 text-sm" role="status" aria-live="polite">
            <div className="flex items-center gap-2 font-medium">
              <Spinner />
              {step === "submitting" && "Placing your order…"}
              {step === "confirming" && "Confirming on Arc. Usually a few seconds."}
              {step === "slow" && "Taking longer than usual."}
            </div>
            {step === "slow" && (
              <div className="mt-2">
                <ExtLink href={explorer.tx(receipt?.hash ?? "")}>View on Arc explorer</ExtLink>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => setStep("edit")} className="rounded-full border border-line px-5 py-3.5 text-sm font-semibold hover:bg-bg-elev-2">
              Back
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!!problem}
              className="num rounded-full bg-fg py-3.5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-40"
            >
              {problem ?? `Buy basket · ${usd(sized.cost)}`}
            </button>
          </div>
        )}
        <Disclosure className="mt-3 text-center" />
      </div>
    );
  }

  const rows = basket.legs.length <= 3 ? outcomes(basket.legs).reverse() : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Buy basket</h3>
        <span className="num text-sm text-fg-muted">{tokenUsd(price)} per token</span>
      </div>

      {mode === "risk" ? (
        <>
          <label className="mt-5 block text-sm font-medium" htmlFor="at-risk">
            How much could you lose?
          </label>
          <MoneyInput id="at-risk" value={atRisk} onChange={setAtRisk} />
          <div className="mt-4 flex items-center justify-between text-sm">
            <label htmlFor="share" className="font-medium">
              Hedge {share}% of it
            </label>
            <span className="num text-fg-muted">{usd((Number(atRisk) || 0) * (share / 100))}</span>
          </div>
          <input
            id="share"
            type="range"
            min={10}
            max={100}
            step={5}
            value={share}
            onChange={(e) => setShare(Number(e.target.value))}
            aria-valuetext={`${share}%`}
            className="mt-2 w-full accent-[var(--fg)]"
          />
          <div className="num mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-center">
            {[
              ["Max payout", usd(sized.maxPayout)],
              ["Costs", usd(sized.cost)],
              ["Tokens", qty(sized.tokens)],
            ].map(([k, v]) => (
              <div key={k} className="bg-bg-elev-1 px-2 py-2">
                <div className="text-xs text-fg-muted">{k}</div>
                <div className="font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setMode("cost")} className="mt-2 text-xs font-medium text-brand hover:underline">
            Enter cost instead
          </button>
        </>
      ) : (
        <>
          <label className="mt-5 block text-sm font-medium" htmlFor="spend">
            How much to spend?
          </label>
          <MoneyInput id="spend" value={spend} onChange={setSpend} />
          <p className="num mt-1.5 text-sm text-fg-muted">= {qty(sized.tokens)} tokens · pays up to {usd(sized.maxPayout)}</p>
          <div className="mt-2 flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSpend(String(Math.round(((Number(spend) || 0) + p) * 100) / 100))}
                className="num flex-1 rounded-full border border-line py-1.5 text-sm font-medium hover:border-line-heavy"
              >
                +${p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSpend(String(Math.max(0, Math.floor((balance - NETWORK_FEE) * 100) / 100)))}
              className="flex-1 rounded-full border border-line py-1.5 text-sm font-medium hover:border-line-heavy"
            >
              Max
            </button>
          </div>
          <button type="button" onClick={() => setMode("risk")} className="mt-2 text-xs font-medium text-brand hover:underline">
            Size it from what you could lose
          </button>
        </>
      )}

      <div className="mt-5 rounded-xl bg-bg-alt p-4">
        <div className="text-xs text-fg-muted">If every event resolves YES</div>
        <div className="num mt-0.5 text-3xl font-semibold tracking-tight">{usd(sized.maxPayout)}</div>
        {rows.length > 0 && (
          <div className="num mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
            {[...rows.slice(1, rows.length > 4 ? 4 : -1), rows[rows.length - 1]].map((o) => (
              <div key={o.label} className="flex justify-between gap-3 text-fg-muted">
                <span className="truncate">{o.label === "Nothing happens" ? "None" : o.label}</span>
                <span className="shrink-0 font-medium text-fg">{usd(o.payout * sized.tokens)}</span>
              </div>
            ))}
            {rows.length > 4 && (
              <a href="#how-it-pays" className="block pt-1 font-medium text-brand hover:underline">
                Every scenario in How it pays
              </a>
            )}
          </div>
        )}
      </div>

      {basket.rolling && w && (
        <p className="num mt-3 text-xs text-fg-muted">
          Buy by {clock(w.buyBy)} · Resolves {clock(w.end)}
        </p>
      )}

      <button
        type="button"
        disabled={!!problem}
        onClick={() => setStep("review")}
        className="mt-4 w-full rounded-full bg-fg py-3.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {problem ?? "Review order"}
      </button>
      <p className="num mt-2 text-center text-xs text-fg-muted">{store ? `${usd(balance)} USDC available` : " "}</p>
      <Disclosure className="mt-1 text-center" />
    </div>
  );
}

function MoneyInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-1.5 flex items-center rounded-xl border border-line bg-bg px-4 focus-within:border-fg">
      <span className="text-2xl font-semibold text-fg-muted">$</span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
        className="num w-full min-w-0 bg-transparent py-3 pl-1 text-2xl font-semibold outline-none"
      />
      <span className="text-sm text-fg-muted">USDC</span>
    </div>
  );
}
