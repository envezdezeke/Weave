"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BackingCard,
  Clocks,
  ComboLine,
  FairValueLine,
  GoodToKnow,
  HedgeRecord,
  HowItPays,
  LegList,
  OnchainCard,
  ProofCard,
  ThreeNumbers,
  useLiveBasket,
  useOnchainBasket,
  useVault,
  WhoDecides,
} from "@/components/basket";
import { BuyPanel } from "@/components/buy-panel";
import { PriceChart, RANGE_LABEL, type Hover } from "@/components/charts";
import { BasketIcon } from "@/components/icons";
import { Chip, KindLabel, LegDot, tint } from "@/components/ui";
import { Weave } from "@/components/weave";
import { hedgeCoverage, type Basket } from "@/lib/data";
import { arrowPct, clock, day, history, pct, signedUsd, tokenUsd } from "@/lib/format";
import { fairValue, mintPrice } from "@/lib/pricing";

export function BasketView({ basket: base }: { basket: Basket }) {
  const { basket, window, now, ends } = useLiveBasket(base);
  const value = fairValue(basket.legs);
  const price = mintPrice(basket.legs);
  const [hover, setHover] = useState<Hover>(null);
  const [sheet, setSheet] = useState(false);
  const [activeLeg, setActiveLeg] = useState<number | null>(null);
  const mock = useVault(basket, window);
  const ob = useOnchainBasket(basket);
  const v = mock && ob ? { ...mock, supply: ob.supply, balance: ob.reserve } : mock;
  const ai = basket.badge === "AI-built";

  const series = useMemo(
    (): Record<string, number[]> =>
      basket.rolling
        ? { "1H": history(`${basket.id}${window?.end ?? 0}`, value, basket.change, 60) }
        : {
            "1D": history(`${basket.id}d`, value, basket.change * 0.5, 60),
            "1W": history(`${basket.id}w`, value, basket.change, 70),
            "1M": history(`${basket.id}m`, value, basket.change * 2.5, 90),
            ALL: history(`${basket.id}a`, value, basket.change * 4, 140),
          },
    [basket.id, basket.rolling, basket.change, value, window?.end],
  );
  const initial = basket.rolling ? "1H" : "1W";
  const range = hover?.range ?? initial;
  const shown = hover?.value ?? value;
  const start = hover?.start ?? series[initial][0];
  const delta = shown - start;
  const endsLabel = !ends ? "–" : basket.rolling ? clock(ends) : day(ends);

  return (
    <div className="pt-6">
      <Link href={ai ? "/build" : "/"} className="text-sm text-fg-muted hover:text-fg">
        ← {ai ? "Back to builder" : "Explore"}
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="flex items-start gap-3 rounded-3xl border border-line p-5" style={tint(basket.kind, "var(--bg)")}>
            <BasketIcon icon={basket.icon} kind={basket.kind} size={48} />
            <div className="min-w-0">
              <KindLabel kind={basket.kind} />
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{basket.name}</h1>
                <Chip tone={basket.badge === "Live" || ai ? "brand" : "neutral"}>{basket.badge}</Chip>
              </div>
              <p className="text-fg-muted">{ai && basket.worry ? `For: “${basket.worry}”` : basket.tagline}</p>
              {v && v.supply > 0 && (
                <div className="num mt-2 flex flex-wrap gap-2">
                  <a href="#backing">
                    <Chip tone={v.balance >= v.supply ? "positive" : "warning"}>{Math.floor((v.balance / v.supply) * 100)}% reserved</Chip>
                  </a>
                  <a href="#backing">
                    <Chip tone={hedgeCoverage(v.trades) >= 1 ? "neutral" : "warning"}>{Math.floor(hedgeCoverage(v.trades) * 100)}% {ob ? "sandbox hedge (simulated)" : "hedged on Gemini"}</Chip>
                  </a>
                </div>
              )}
            </div>
          </div>

          {basket.rolling && (
            <div className="mt-5 rounded-xl border border-line bg-bg-alt px-4 py-3">
              <Clocks w={window} />
            </div>
          )}

          <div className="mt-6">
            <div className="text-xs text-fg-muted">Expected payout per token</div>
            <div className="num text-5xl font-semibold tracking-tight">{tokenUsd(shown)}</div>
            <div className={`num mt-1 text-sm font-medium ${delta >= 0 ? "text-fg-positive" : "text-fg-negative"}`}>
              {signedUsd(delta, shown < 0.1 ? 3 : 2)} ({arrowPct(start ? delta / start : 0)}){" "}
              <span className="font-normal text-fg-muted">{hover && hover.value !== series[range].at(-1) ? "" : RANGE_LABEL[range]}</span>
            </div>
            <div className="mt-3 max-w-xl">
              <FairValueLine legs={basket.legs} />
            </div>
          </div>

          <div className="mt-5">
            <ThreeNumbers price={price} ends={endsLabel} />
          </div>

          <div className="mt-6">
            <PriceChart series={series} initial={initial} onHover={setHover} caption="Weighted mid of the legs · max payout $1.00" />
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">What&apos;s inside</h2>
            <p className="mt-1 text-sm text-fg-muted">{basket.thesis}</p>
            <div className="mt-4 rounded-2xl border border-line px-4 pb-3 pt-4">
              <Weave legs={basket.legs} height={110} active={activeLeg} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {basket.legs.map((l, i) => (
                  <a
                    key={l.id}
                    href={`#leg-${l.id}`}
                    onMouseEnter={() => setActiveLeg(i)}
                    onMouseLeave={() => setActiveLeg(null)}
                    onFocus={() => setActiveLeg(i)}
                    onBlur={() => setActiveLeg(null)}
                    className="num inline-flex items-center gap-1.5 text-fg-muted hover:text-fg"
                  >
                    <LegDot i={i} /> {l.short} {pct(l.weight)}
                  </a>
                ))}
              </div>
            </div>
            <LegList legs={basket.legs} detail showWhy={ai} onActive={setActiveLeg} />
            <ComboLine />
          </section>

          <section id="how-it-pays" className="mt-10 scroll-mt-28 rounded-2xl border border-line p-5">
            <HowItPays legs={basket.legs} />
          </section>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <BackingCard basket={basket} window={window} now={now} />
            <OnchainCard basket={basket} />
            <ProofCard basket={basket} now={now} />
          </div>
          <div className="mt-4 space-y-4">
            <WhoDecides legs={basket.legs} />
            <HedgeRecord basket={basket} window={window} />
            <GoodToKnow />
          </div>
        </div>

        {/* One ticket: a sticky rail on desktop, a bottom sheet on phones. */}
        <aside
          className={`lg:sticky lg:top-24 lg:block lg:self-start ${sheet ? "fixed inset-0 z-50 flex items-end lg:static" : "hidden"}`}
          aria-label="Buy ticket"
        >
          <button type="button" className="absolute inset-0 bg-black/40 lg:hidden" aria-label="Close" onClick={() => setSheet(false)} />
          <div className="rise relative mx-auto max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-bg-elev-1 p-5 lg:max-h-[calc(100vh-7rem)] lg:rounded-2xl lg:[scrollbar-width:thin] lg:[animation:none]">
            <div className="-mt-1 mb-3 flex items-center justify-between lg:hidden">
              <span className="h-1 w-10 rounded-full bg-line-heavy" aria-hidden />
              <button type="button" onClick={() => setSheet(false)} className="rounded-full px-3 py-1 text-sm text-fg-muted hover:bg-bg-elev-2">
                Close
              </button>
            </div>
            <BuyPanel basket={basket} window={window} ends={ends} now={now} />
          </div>
        </aside>
      </div>

      {!sheet && (
        <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur-md md:bottom-0 lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-xs text-fg-muted">{basket.name}</div>
              <div className="num text-sm font-semibold">Pays up to $1.00</div>
            </div>
            <button type="button" onClick={() => setSheet(true)} className="num shrink-0 rounded-full bg-fg px-6 py-3 text-sm font-semibold text-bg">
              {tokenUsd(price)} · Buy basket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
