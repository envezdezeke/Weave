"use client";

import Link from "next/link";
import type { Basket } from "@/lib/data";
import { chance, tokenUsd, usd } from "@/lib/format";
import { mid, mintPrice, outcomes } from "@/lib/pricing";
import { Clocks, useLiveBasket } from "./basket";
import { ChanceBar } from "./charts";
import { BasketIcon } from "./icons";
import { Chip, LegDot, tint } from "./ui";
import { Weave } from "./weave";

export function FeaturedBasket({ basket: base }: { basket: Basket }) {
  const { basket, window } = useLiveBasket(base);
  const price = mintPrice(basket.legs);
  const rows = outcomes(basket.legs).reverse();

  return (
    <Link
      href={`/basket/${basket.id}`}
      style={tint(basket.kind)}
      className="group block rounded-3xl border border-line p-6 transition-colors hover:border-line-heavy sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <Chip tone="brand">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
          </span>
          Live · resolves every hour
        </Chip>
      </div>
      <p className="mt-5 text-lg font-semibold tracking-tight">{basket.pitch}</p>
      <div className="mt-4 flex items-center gap-3">
        <BasketIcon icon={basket.icon} kind={basket.kind} />
        <div className="min-w-0">
          <div className="font-semibold">{basket.name}</div>
          <div className="truncate text-sm text-fg-muted">{basket.tagline}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-bg/70 px-4 py-3">
        <Clocks w={window} compact />
      </div>

      <Weave legs={basket.legs} height={72} className="mt-5" />
      <div className="mt-3 space-y-2.5">
        {basket.legs.map((l, i) => (
          <div key={l.id} className="flex items-center gap-3 text-sm">
            <LegDot i={i} />
            <span className="w-24 shrink-0">{l.short}</span>
            <ChanceBar value={mid(l)} />
            <span className="num shrink-0 whitespace-nowrap text-right text-fg-muted">
              <span className="font-medium text-fg">{chance(mid(l))}</span> · pays {usd(l.weight)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="text-xs font-medium text-fg-muted">How it pays, per token</div>
        <div className="num mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          {rows.map((o) => (
            <div key={o.label} className="flex justify-between gap-2 sm:block">
              <div className="truncate text-xs text-fg-muted">{o.label === "Nothing happens" ? "Neither" : o.label}</div>
              <div className="font-semibold">{usd(o.payout)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
        <div>
          <div className="text-xs text-fg-muted">Cost per token</div>
          <div className="num text-3xl font-semibold tracking-tight">{tokenUsd(price)}</div>
          <div className="num text-xs text-fg-muted">Pays up to $1.00 · Most you can lose {tokenUsd(price)}</div>
        </div>
        <span className="shrink-0 rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity group-hover:opacity-90">
          View basket
        </span>
      </div>
    </Link>
  );
}
