"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BasketCard, ComboLine, HowItPays, LegList } from "@/components/basket";
import { Check, Sparkle, Spinner } from "@/components/icons";
import { Chip, Disclosure, ExtLink, tint } from "@/components/ui";
import { Weave } from "@/components/weave";
import { WorryInput } from "@/components/worry-input";
import { draftFromWorry, KIND_ICON, refine, type Draft, type Option, type Refinement } from "@/lib/builder";
import { contracts, getBasket, type Basket } from "@/lib/data";
import { hex, qty, tokenUsd, usd } from "@/lib/format";
import { geminiUrl } from "@/lib/markets";
import { mintPrice } from "@/lib/pricing";
import { useStore } from "@/lib/store";

const STEPS = [
  { title: "Reading Gemini markets", detail: "1,003 live markets · sports and politics skipped" },
  { title: "Matching your worry", detail: "Ranking markets by how closely they track it" },
  { title: "Weighting legs", detail: "Weights add up to $1.00 max payout" },
  { title: "Checking backing", detail: "Every leg has a Gemini ask to hedge against" },
];

const AI_NOTE = "AI suggestions are not investment advice. You decide what to buy.";

export function Builder() {
  const router = useRouter();
  const q = useSearchParams().get("q") ?? "";

  return (
    <div className="pt-10 sm:pt-14">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 text-xs font-medium text-brand">
          <Sparkle /> AI hedge builder
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">What are you worried about?</h1>
        <p className="mt-2 text-fg-muted">
          Describe it in plain words. We find the Gemini markets that pay if it happens, and say honestly when none do.
        </p>
        <div className="mt-6">
          <WorryInput key={q} initial={q} onSubmit={(t) => router.push(`/build?q=${encodeURIComponent(t)}`)} />
        </div>
      </div>

      {q && <Result key={q} q={q} />}
      <Wishlist />
    </div>
  );
}

function ToolCards({ step }: { step: number }) {
  return (
    <ol className="mt-10 grid max-w-3xl gap-2 sm:grid-cols-2">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li
            key={s.title}
            className={`flex items-start gap-3 rounded-xl border border-line p-3 transition-opacity ${i <= step ? "opacity-100" : "opacity-40"}`}
          >
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${done ? "bg-bg-positive-wash text-fg-positive" : "text-fg-muted"}`}>
              {done ? <Check className="size-3" /> : active ? <Spinner className="size-3.5" /> : <span className="size-2 rounded-full bg-line-heavy" />}
            </span>
            <span>
              <span className="block text-sm font-medium">{s.title}</span>
              <span className="block text-xs text-fg-muted">{s.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const BADGE = {
  strong: { tone: "positive", label: "Strong match", body: "These markets track your worry directly." },
  partial: { tone: "warning", label: "Partial match", body: "These markets track something close to your worry, not the worry itself." },
  none: { tone: "neutral", label: "No market matches this yet", body: "We would rather say so than sell you a weak hedge." },
} as const;

// Keyed by the query, so a new worry restarts the tool-call cards.
function Result({ q }: { q: string }) {
  const [step, setStep] = useState(0);
  const draft = useMemo(() => draftFromWorry(q), [q]);
  const store = useStore();
  const addWish = store?.addWish;

  useEffect(() => {
    const ids = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 500 * (i + 1)));
    return () => ids.forEach(clearTimeout);
  }, []);

  const done = step >= STEPS.length;

  useEffect(() => {
    if (done && draft.match === "none") addWish?.(q);
  }, [done, draft.match, q, addWish]);

  const threads = draft.options[0]?.legs;
  if (!done)
    return (
      <>
        {threads && (
          <div className="mt-10 max-w-3xl">
            <Weave legs={threads} height={90} draw />
            <p className="mt-1 text-xs text-fg-muted">Weaving {threads.length} Gemini markets into one basket…</p>
          </div>
        )}
        <ToolCards step={step} />
      </>
    );
  return (
    <div className="rise">
      <ToolCards step={step} />
      <MatchBadge draft={draft} />
      {draft.match === "none" ? <NoMatch draft={draft} /> : <Options draft={draft} q={q} />}
    </div>
  );
}

function MatchBadge({ draft }: { draft: Draft }) {
  const b = BADGE[draft.match];
  const action =
    draft.match === "none"
      ? { href: "#suggested", label: "See a curated basket" }
      : draft.match === "partial" && draft.options.length > 1
        ? { href: "#options", label: "Compare options" }
        : { href: "#review", label: "Review basket" };
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Chip tone={b.tone} className="px-3 py-1 text-sm">
        {b.label}
      </Chip>
      <span className="text-sm text-fg-muted">{b.body}</span>
      <a href={action.href} className="text-sm font-medium text-brand hover:underline">
        {action.label} →
      </a>
    </div>
  );
}

function GapNote({ draft }: { draft: Draft }) {
  if (!draft.gap && !draft.nearMisses.length) return null;
  return (
    <div className="mt-4 rounded-xl border border-line bg-bg-warning-wash p-4 text-sm">
      {draft.gap && (
        <p>
          <span className="font-semibold text-fg-warning">Not hedged: </span>
          {draft.gap}
        </p>
      )}
      {draft.nearMisses.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-fg-muted">Near misses</div>
          <ul className="mt-1 space-y-1.5">
            {draft.nearMisses.map((n) => (
              <li key={n.ticker + n.contract}>
                <ExtLink href={geminiUrl(n)}>
                  {n.title} · {n.contract}
                </ExtLink>
                <span className="text-fg-muted"> · {n.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function costLine(o: Option, tokens = 10) {
  const price = mintPrice(o.legs);
  const n = o.legs.length;
  const all = n === 2 ? "both events happen" : n === 3 ? "all three events happen" : `all ${n} events happen`;
  return `Costs ${usd(tokens * price)} for ${tokens} tokens. Pays up to ${usd(tokens)} if ${all}.`;
}

function Options({ draft, q }: { draft: Draft; q: string }) {
  const router = useRouter();
  const store = useStore();
  const [index, setIndex] = useState(0);
  const [refined, setRefined] = useState<{ option: Option; note: string } | null>(null);
  const base = draft.options[index];
  const option = refined?.option ?? base;
  const price = mintPrice(option.legs);

  const apply = (r: Refinement) => setRefined(refine(option, r) ?? { option, note: r === "cheaper" ? "This is already the lightest version." : "Every leg already resolves this year." });

  const review = () => {
    if (!store) return;
    const id = `ai-${hex(`${q}${option.name}${option.legs.map((l) => l.id + l.weight).join()}`, 8).slice(2)}`;
    const basket: Basket = {
      id,
      name: option.name,
      tagline: `Built from your worry`,
      pitch: q,
      thesis: `An AI-built basket for “${q}”. Each leg pays its share if it happens. The AI picked and weighted the legs; you decide whether to buy.`,
      icon: KIND_ICON[draft.kind],
      kind: draft.kind,
      badge: "AI-built",
      legs: option.legs,
      change: 0.004,
      token: contracts.basketToken,
      tokenId: 100 + (parseInt(id.slice(3, 7), 16) % 900),
      vault: hex(`vault-${id}`, 40),
      worry: q,
    };
    store.saveDraft(basket);
    router.push(`/build/review?id=${id}`);
  };

  return (
    <div className="mt-6">
      {draft.match === "partial" && draft.options.length > 1 && (
        <div id="options" className="scroll-mt-28">
          <h2 className="text-sm font-semibold text-fg-muted">Options</h2>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {draft.options.map((o, i) => (
              <button
                key={o.name}
                type="button"
                aria-pressed={i === index && !refined}
                onClick={() => {
                  setIndex(i);
                  setRefined(null);
                }}
                className={`rounded-2xl border p-4 text-left transition-colors ${i === index && !refined ? "border-fg" : "border-line hover:border-line-heavy"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{o.name}</span>
                  <span className="num text-sm font-semibold">{tokenUsd(mintPrice(o.legs))}</span>
                </div>
                <Weave legs={o.legs} height={44} className="mt-3" />
                <p className="mt-2 text-xs text-fg-muted">{o.legs.map((l) => l.short).join(" · ")}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div id="review" className="mt-6 grid grid-cols-1 scroll-mt-28 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="text-sm text-fg-muted">Your basket</div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{option.name}</h2>
          <p className="mt-1 text-fg-muted">For: “{q}”</p>
          <p className="num mt-4 font-medium">{costLine(option)}</p>
          {refined && <p className="mt-1 text-sm text-fg-muted">{refined.note}</p>}

          <GapNote draft={draft} />

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["cheaper", "Make it cheaper"],
                ["this-year", "Only events this year"],
              ] as const
            ).map(([r, label]) => (
              <button key={r} type="button" onClick={() => apply(r)} className="rounded-full border border-line px-3 py-1 text-sm hover:border-line-heavy">
                {label}
              </button>
            ))}
            <button
              type="button"
              disabled={draft.options.length < 2}
              onClick={() => {
                setIndex((i) => (i + 1) % draft.options.length);
                setRefined(null);
              }}
              className="rounded-full border border-line px-3 py-1 text-sm hover:border-line-heavy disabled:opacity-40"
            >
              Show another option
            </button>
            {refined && (
              <button type="button" onClick={() => setRefined(null)} className="rounded-full px-3 py-1 text-sm text-fg-muted hover:text-fg">
                Undo
              </button>
            )}
          </div>

          <section className="mt-8">
            <h3 className="font-semibold">Why these markets</h3>
            <div className="mt-3">
              <Weave legs={option.legs} height={96} />
            </div>
            <LegList legs={option.legs} showWhy />
            <ComboLine />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line p-5" style={tint(draft.kind)}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">Cost per token</span>
              <span className="num text-2xl font-semibold">{tokenUsd(price)}</span>
            </div>
            <p className="num mt-1 text-xs text-fg-muted">Pays up to $1.00 · Most you can lose {tokenUsd(price)}</p>
            <button type="button" onClick={review} className="mt-5 w-full rounded-full bg-fg py-3.5 text-sm font-semibold text-bg hover:opacity-90">
              Review basket
            </button>
            <p className="mt-2 text-center text-xs text-fg-muted">The AI never buys on its own.</p>
            <Disclosure className="mt-1 text-center" />
            <div className="mt-4 border-t border-line pt-4">
              <HowItPays legs={option.legs} />
            </div>
          </div>
          <p className="px-1 text-xs text-fg-muted">{AI_NOTE}</p>
        </aside>
      </div>

      {draft.suggest && (
        <div className="mt-10 max-w-xl">
          <h3 className="text-sm font-semibold text-fg-muted">Also ready to buy</h3>
          <div className="mt-2">
            <BasketCard basket={getBasket(draft.suggest)!} />
          </div>
        </div>
      )}
    </div>
  );
}

function NoMatch({ draft }: { draft: Draft }) {
  const suggested = draft.suggest ? getBasket(draft.suggest) : undefined;
  return (
    <div className="mt-4 max-w-3xl">
      <GapNote draft={draft} />
      {suggested && (
        <div id="suggested" className="mt-6 scroll-mt-28">
          <h3 className="text-sm font-semibold text-fg-muted">A curated basket that may still help</h3>
          <div className="mt-2 max-w-xl">
            <BasketCard basket={suggested} />
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-fg-muted">{AI_NOTE}</p>
      <Disclosure />
    </div>
  );
}

function Wishlist() {
  const store = useStore();
  if (!store?.wishes.length) return null;
  return (
    <section className="mt-16 max-w-3xl rounded-2xl bg-bg-alt p-5">
      <h2 className="font-semibold">Markets we wish existed</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Worries with no good Gemini market yet. We share these with Gemini as demand for new contracts.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {store.wishes.map((w) => (
          <li key={w}>
            <Link href={`/build?q=${encodeURIComponent(w)}`} className="inline-block rounded-full border border-line bg-bg px-3 py-1 text-sm hover:border-line-heavy">
              {w}
            </Link>
          </li>
        ))}
      </ul>
      <p className="num mt-3 text-xs text-fg-muted">{qty(store.wishes.length)} worries so far</p>
    </section>
  );
}
