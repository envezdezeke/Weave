"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PriceChart, RANGE_LABEL, type Hover } from "@/components/charts";
import { BasketIcon, Check, Spinner } from "@/components/icons";
import { Chip, ExtLink, Row, Sheet, tint } from "@/components/ui";
import { explorer } from "@/lib/data";
import { arrowPct, clock, dateTime, history, qty, short, signedUsd, usd } from "@/lib/format";
import { geminiUrl, type Leg } from "@/lib/markets";
import { payout, positionState } from "@/lib/positions";
import { mid } from "@/lib/pricing";
import { findBasket, useNow, useStore, type LegState, type Position } from "@/lib/store";

const LEG_CHIP: Record<LegState, { tone: "neutral" | "positive" | "warning"; label: string }> = {
  open: { tone: "neutral", label: "Open" },
  yes: { tone: "positive", label: "Resolved YES" },
  no: { tone: "neutral", label: "Resolved NO" },
  voided: { tone: "warning", label: "Voided" },
};

// Resolved legs at 0 or their weight, open legs at the market mid.
function mark(p: Position) {
  if (p.redeemed) return 0;
  return p.tokens * p.legs.reduce((s, l) => {
    const r = p.results[l.id]?.state ?? "open";
    return s + l.weight * (r === "yes" ? 1 : r === "open" ? mid(l) : 0);
  }, 0);
}

export default function Portfolio() {
  const store = useStore();
  const now = useNow();
  const [hover, setHover] = useState<Hover>(null);
  const [toast, setToast] = useState<{ text: string; hash: string } | null>(null);
  const [sending, setSending] = useState<Position | null>(null);

  const positions = useMemo(() => store?.positions ?? [], [store?.positions]);
  const held = positions.filter((p) => !p.redeemed && p.tokens > 0);
  const invested = held.reduce((s, p) => s + mark(p), 0);
  const cash = store?.balance ?? 0;
  const total = cash + invested;
  const ready = now ? held.filter((p) => positionState(p, now).key === "ready") : [];
  const readyAmount = ready.reduce((s, p) => s + payout(p), 0);

  const series = useMemo<Record<string, number[]>>(
    () => ({
      "1D": history("pf-d", total, 0.9, 60),
      "1W": history("pf-w", total, 2.4, 70),
      "1M": history("pf-m", total, 4.1, 90),
      ALL: history("pf-a", total, 6.5, 140),
    }),
    [total],
  );

  if (!store || now === null) return <div className="mt-10 h-96 animate-pulse rounded-2xl bg-bg-alt" />;

  const shown = hover?.value ?? total;
  const start = hover?.start ?? series["1W"][0];
  const range = hover?.range ?? "1W";

  const flash = (text: string, hash: string) => {
    setToast({ text, hash });
    setTimeout(() => setToast(null), 5000);
  };

  return (
    <div className="pt-8">
      <div className="flex flex-wrap gap-2">
        <Chip className="num px-3 py-1 text-sm">
          Cash <span className="font-semibold text-fg">{usd(cash)}</span>
        </Chip>
        <Chip className="num px-3 py-1 text-sm">
          Portfolio <span className="font-semibold text-fg">{usd(invested)}</span>
        </Chip>
      </div>

      {ready.length > 0 && (
        <a
          href={`#pos-${ready[0].id}`}
          className="num mt-4 flex items-center justify-between gap-3 rounded-2xl bg-bg-positive-wash px-4 py-3 text-sm font-medium text-fg-positive"
        >
          <span>
            {ready.length} basket{ready.length > 1 ? "s" : ""} ready to redeem · {usd(readyAmount)}
          </span>
          <span aria-hidden>↓</span>
        </a>
      )}

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="text-sm text-fg-muted">Total value</div>
          <div className="num mt-1 text-5xl font-semibold tracking-tight">{usd(shown)}</div>
          <div className={`num mt-1 text-sm font-medium ${shown - start >= 0 ? "text-fg-positive" : "text-fg-negative"}`}>
            {signedUsd(shown - start)} ({arrowPct((shown - start) / start)}) <span className="font-normal text-fg-muted">{RANGE_LABEL[range]}</span>
          </div>
          <div className="mt-6">
            <PriceChart series={series} initial="1W" onHover={setHover} caption="Cash plus basket value" />
          </div>

          <h2 className="mt-10 text-lg font-semibold">Positions</h2>
          {positions.length === 0 && <p className="mt-2 text-sm text-fg-muted">No baskets yet. Buy one from Explore.</p>}
          <ul className="mt-3 space-y-3">
            {positions.map((p) => (
              <PositionCard
                key={p.id}
                p={p}
                now={now}
                onRedeemed={(amount, hash) => flash(`Redeemed ${usd(amount)} USDC to your wallet`, hash)}
                onSend={() => setSending(p)}
              />
            ))}
          </ul>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line p-5">
            <div className="text-sm text-fg-muted">Cash</div>
            <div className="num mt-1 text-2xl font-semibold">{usd(cash)}</div>
            <div className="mt-3 text-sm">
              <Row label="In baskets" value={usd(invested)} />
              <Row label="Network" value="Arc Testnet" />
            </div>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-full border border-line py-2.5 text-center text-sm font-semibold hover:bg-bg-elev-2"
            >
              Get test USDC
            </a>
          </div>
          <div className="rounded-2xl bg-bg-alt p-5 text-sm text-fg-muted">
            <div className="font-semibold text-fg">How redemption works</div>
            <p className="mt-2">
              When Gemini settles a market, the operator posts the result to the resolver contract on Arc. Each leg that
              resolves YES pays its weight in USDC from the vault. Redeem appears once every leg has resolved.
            </p>
          </div>
        </aside>
      </div>

      <SendSheet p={sending} onClose={() => setSending(null)} />

      {toast && (
        <div role="status" className="rise fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit max-w-[92vw] items-center gap-3 rounded-full bg-fg px-5 py-3 text-sm font-medium text-bg md:bottom-6">
          <Check className="text-fg-positive" /> {toast.text}
          <a href={explorer.tx(toast.hash)} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2 opacity-80">
            {short(toast.hash)}
          </a>
        </div>
      )}
    </div>
  );
}

function Evidence({ l, state, at }: { l: Leg; state: LegState; at?: number }) {
  if (state === "open") return null;
  const gemini = l.side === "NO" ? ` · Gemini “${l.contract}” resolved ${state === "yes" ? "NO" : "YES"}` : "";
  return (
    <p className="text-xs text-fg-muted">
      Resolved {state === "yes" ? "YES" : state === "no" ? "NO" : "void"}
      {at ? ` on ${dateTime(at)}` : ""} by Gemini Predictions (source: {l.source}){gemini} ·{" "}
      <ExtLink href={geminiUrl(l)}>Evidence</ExtLink>
    </p>
  );
}

function PositionCard({ p, now, onRedeemed, onSend }: { p: Position; now: number; onRedeemed: (a: number, h: string) => void; onSend: () => void }) {
  const store = useStore();
  const [redeeming, setRedeeming] = useState<"idle" | "submitting" | "confirming">("idle");
  const s = positionState(p, now);
  const b = findBasket(p.basketId, store?.drafts);
  const value = s.key === "ready" ? s.amount : mark(p);
  const pnl = (s.key === "redeemed" ? (p.redeemed?.amount ?? 0) : value) - p.cost;
  const tone = s.key === "ready" ? "positive" : s.key === "confirming" || s.key === "closing" || s.key === "waiting" ? "brand" : s.key === "review" ? "warning" : "neutral";
  const canSend = p.status === "open" && !p.redeemed && p.tokens > 0 && s.key !== "ended";
  const href = b ? (b.badge === "AI-built" ? `/build/review?id=${b.id}` : `/basket/${b.id}`) : null;
  const kind = p.kind ?? b?.kind ?? "crypto";

  // The resolve moment: when Gemini settles the last leg while you watch, the
  // legs flip one by one, the payout counts up, and a stamp lands.
  const [reveal, setReveal] = useState<number | null>(null);
  const [counter, setCounter] = useState<number | null>(null);
  const [stamped, setStamped] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevResolved = useRef(s.resolved);
  const total = s.total;
  const amount = s.amount;

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      later(0, () => setStamped(true));
      return;
    }
    setStamped(false);
    setReveal(0);
    for (let i = 1; i <= total; i++) later(i * 750, () => setReveal(i));
    const start = total * 750 + 250;
    const frames = 18;
    for (let f = 1; f <= frames; f++) later(start + f * 40, () => setCounter((amount * f) / frames));
    later(start + frames * 40 + 150, () => {
      setReveal(null);
      setCounter(null);
      setStamped(true);
    });
  }, [total, amount]);

  useEffect(() => {
    if (s.resolved > prevResolved.current && s.resolved === total) timers.current.push(setTimeout(play, 0));
    prevResolved.current = s.resolved;
  }, [s.resolved, total, play]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const redeem = () => {
    setRedeeming("submitting");
    setTimeout(() => setRedeeming("confirming"), 700);
    setTimeout(() => {
      const r = store?.redeem(p.id);
      setRedeeming("idle");
      if (r) onRedeemed(r.amount, r.hash);
    }, 2200);
  };

  return (
    <li id={`pos-${p.id}`} className="scroll-mt-28 rounded-3xl border border-line p-4" style={tint(kind)}>
      <div className="flex items-start gap-3">
        <BasketIcon icon={p.icon} kind={kind} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {href ? (
              <Link href={href} className="font-medium hover:underline">
                {p.name}
              </Link>
            ) : (
              <span className="font-medium">{p.name}</span>
            )}
            {reveal !== null ? (
              <Chip tone="brand">Gemini is settling…</Chip>
            ) : stamped && (s.key === "ready" || s.key === "ended") ? (
              <span
                className={`stamp num inline-block rounded-md border-2 px-2 py-0.5 text-xs font-semibold ${
                  s.key === "ready" ? "border-fg-positive text-fg-positive" : "border-line-heavy text-fg-muted"
                }`}
              >
                {s.key === "ready" ? `Settled · ${usd(s.amount)} to redeem` : "Settled · $0.00"}
              </span>
            ) : (
              <Chip tone={tone}>
                {s.key === "confirming" && <Spinner className="size-3" />}
                {s.label}
              </Chip>
            )}
          </div>
          <div className="num mt-0.5 text-sm text-fg-muted">
            {qty(p.tokens)} tokens · paid {usd(p.cost)}
            {p.windowEnd ? ` · window ends ${clock(p.windowEnd)}` : ""}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num font-semibold">
            {counter !== null ? usd(counter) : reveal !== null ? usd(0) : usd(s.key === "redeemed" ? (p.redeemed?.amount ?? 0) : value)}
          </div>
          {s.key !== "confirming" && reveal === null && counter === null && (
            <div className={`num text-sm ${pnl >= 0 ? "text-fg-positive" : "text-fg-negative"}`}>
              {pnl >= 0 ? "▲" : "▼"} {signedUsd(pnl)}
            </div>
          )}
        </div>
      </div>

      {p.windowEnd && (
        <div className="mt-3 flex gap-1" aria-hidden>
          {p.legs.map((l, i) => {
            const done = reveal !== null ? i < reveal : p.results[l.id]?.state !== "open";
            return <span key={l.id} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${done ? "bg-fg" : "bg-bg-elev-2"}`} />;
          })}
        </div>
      )}
      <ul className="mt-3 space-y-2 border-t border-line pt-3">
        {p.legs.map((l, i) => {
          const actual = p.results[l.id] ?? { state: "open" as const };
          const hidden = reveal !== null && i >= reveal;
          const r = hidden ? { state: "open" as const, at: undefined } : actual;
          const waiting = r.state === "open" && (hidden || (!!l.expires && new Date(l.expires).getTime() <= now));
          const chip = waiting ? { tone: "brand" as const, label: "Waiting for Gemini" } : LEG_CHIP[r.state];
          return (
            <li key={l.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {l.short} <span className="num text-fg-muted">· weight {Math.round(l.weight * 100)}% · pays {usd(l.weight * p.tokens)}</span>
                </span>
                <Chip tone={chip.tone} className={hidden || waiting ? "" : reveal !== null ? "rise" : ""}>
                  {waiting && <span className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />}
                  {chip.label}
                </Chip>
              </div>
              <Evidence l={l} state={r.state} at={r.at} />
            </li>
          );
        })}
      </ul>

      {p.sends?.map((x) => (
        <p key={x.hash} className="num mt-2 text-xs text-fg-muted">
          Sent {qty(x.tokens)} tokens to <span className="font-mono">{short(x.to)}</span> on {dateTime(x.at)} ·{" "}
          <ExtLink href={explorer.tx(x.hash)}>View on Arc explorer</ExtLink>
        </p>
      ))}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {s.key === "ready" && (
          <button
            type="button"
            onClick={redeem}
            disabled={redeeming !== "idle"}
            className="num flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-70"
          >
            {redeeming === "idle" ? (
              `Redeem ${usd(s.amount)}`
            ) : (
              <>
                <Spinner /> {redeeming === "submitting" ? "Placing your redeem…" : "Confirming on Arc…"}
              </>
            )}
          </button>
        )}
        {canSend && (
          <button type="button" onClick={onSend} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-bg-elev-2">
            Send
          </button>
        )}
        {p.windowEnd && s.resolved === s.total && s.key !== "confirming" && (
          <button type="button" onClick={play} className="text-xs font-medium text-fg-muted hover:text-fg">
            Replay settlement
          </button>
        )}
        <span className="ml-auto text-xs text-fg-muted">
          {p.redeemed ? (
            <ExtLink href={explorer.tx(p.redeemed.hash)}>Redeem receipt</ExtLink>
          ) : (
            p.status === "open" && <ExtLink href={explorer.tx(p.hash)}>Buy receipt</ExtLink>
          )}
        </span>
      </div>
    </li>
  );
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// Decision Q9: a plain ERC-1155 transfer proves the token is composable.
function SendSheet({ p, onClose }: { p: Position | null; onClose: () => void }) {
  return (
    <Sheet open={!!p} onClose={onClose} title="Send basket tokens">
      {p && <SendForm key={p.id} p={p} onClose={onClose} />}
    </Sheet>
  );
}

function SendForm({ p, onClose }: { p: Position; onClose: () => void }) {
  const store = useStore();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState(String(p.tokens));
  const [step, setStep] = useState<"edit" | "confirming" | "done">("edit");
  const [hash, setHash] = useState("");
  const n = Number(amount) || 0;
  const valid = ADDRESS.test(to.trim()) && n > 0 && n <= p.tokens;

  if (step === "done") {
    return (
      <div className="rise text-center">
        <span className="draw mx-auto grid size-12 place-items-center rounded-full bg-bg-positive-wash text-fg-positive">
          <Check className="size-6" />
        </span>
        <p className="mt-3 font-semibold">Sent {qty(n)} tokens.</p>
        <p className="mt-1 text-sm text-fg-muted">A standard ERC-1155 transfer. The recipient can redeem them like you would.</p>
        <p className="mt-3 text-sm">
          <ExtLink href={explorer.tx(hash)}>
            <span className="font-mono">{short(hash)}</span> · View on Arc explorer
          </ExtLink>
        </p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-fg py-3 text-sm font-semibold text-bg">
          Done
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || !store) return;
        setStep("confirming");
        setTimeout(() => {
          setHash(store.send(p.id, to.trim(), n));
          setStep("done");
        }, 1800);
      }}
    >
      <p className="text-sm text-fg-muted">
        {p.name} · you hold <span className="num font-medium text-fg">{qty(p.tokens)}</span> tokens
      </p>
      <label htmlFor="send-to" className="mt-4 block text-sm font-medium">
        Recipient address on Arc
      </label>
      <input
        id="send-to"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="0x…"
        autoComplete="off"
        spellCheck={false}
        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 font-mono text-sm outline-none focus:border-fg"
      />
      {to && !ADDRESS.test(to.trim()) && <p className="mt-1 text-xs text-fg-negative">Enter a 0x address with 40 hex characters.</p>}
      <label htmlFor="send-amount" className="mt-4 block text-sm font-medium">
        Tokens
      </label>
      <input
        id="send-amount"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        className="num mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-fg"
      />
      <p className="mt-3 text-xs text-fg-muted">Transfers on Arc are final. Network fee {usd(0.01)} in USDC.</p>
      <button
        type="submit"
        disabled={!valid || step !== "edit"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-fg py-3 text-sm font-semibold text-bg disabled:opacity-40"
      >
        {step === "confirming" ? (
          <>
            <Spinner /> Confirming on Arc…
          </>
        ) : (
          `Send ${qty(n)} tokens`
        )}
      </button>
    </form>
  );
}
