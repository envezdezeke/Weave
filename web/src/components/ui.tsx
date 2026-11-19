"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { explorer, type Kind } from "@/lib/data";
import { pct, short } from "@/lib/format";
import type { Leg } from "@/lib/markets";
import { CopyIcon, ExternalIcon } from "./icons";

export const KIND_LABEL: Record<Kind, string> = {
  crypto: "Crypto",
  economy: "Economy",
  weather: "Weather",
  rates: "Rates",
  energy: "Energy",
};

// Soft wash from the worry's tint into the card color, top-left to bottom-right.
export const tint = (kind: Kind, to = "var(--bg-elev-1)") => ({
  background: `linear-gradient(155deg, var(--tint-${kind}), ${to} 62%)`,
});

export function KindLabel({ kind }: { kind: Kind }) {
  return (
    <span className="text-xs font-medium" style={{ color: `var(--ink-${kind})` }}>
      {KIND_LABEL[kind]}
    </span>
  );
}

export const LEG_COLORS = ["bg-leg-1", "bg-leg-2", "bg-leg-3", "bg-leg-4"];

// One colored segment per leg, sized by weight. Tapping a segment scrolls to
// that leg when `link` is set.
export function WeightBar({ legs, link = false, className = "" }: { legs: Leg[]; link?: boolean; className?: string }) {
  return (
    <div className={`flex h-2 w-full gap-0.5 overflow-hidden rounded-full ${className}`} role="img" aria-label={`Weights: ${legs.map((l) => `${l.short} ${pct(l.weight)}`).join(", ")}`}>
      {legs.map((l, i) =>
        link ? (
          <a
            key={l.id}
            href={`#leg-${l.id}`}
            title={`${l.short} · ${pct(l.weight)}`}
            className={`${LEG_COLORS[i % 4]} h-full transition-opacity hover:opacity-80`}
            style={{ width: `${l.weight * 100}%` }}
          />
        ) : (
          <span key={l.id} className={`${LEG_COLORS[i % 4]} h-full`} style={{ width: `${l.weight * 100}%` }} />
        ),
      )}
    </div>
  );
}

export function LegDot({ i }: { i: number }) {
  return <span className={`inline-block size-2 shrink-0 rounded-full ${LEG_COLORS[i % 4]}`} aria-hidden />;
}

// Layer 2 of the disclosures: beside every buy button and AI result.
export function Disclosure({ className = "" }: { className?: string }) {
  return <p className={`text-xs text-fg-muted ${className}`}>Testnet demo. Legs that resolve NO pay $0. Not investment advice.</p>;
}

type Tone = "neutral" | "positive" | "negative" | "warning" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-bg-elev-2 text-fg-muted",
  positive: "bg-bg-positive-wash text-fg-positive",
  negative: "bg-bg-negative-wash text-fg-negative",
  warning: "bg-bg-warning-wash text-fg-warning",
  brand: "bg-brand-wash text-brand",
};

export function Chip({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function SideChip({ side }: { side: "YES" | "NO" }) {
  return (
    <span className="rounded-md border border-line-heavy px-1.5 py-px text-[11px] font-semibold tracking-wide text-fg" title={`This basket holds the ${side} side`}>
      {side}
    </span>
  );
}

export function ExtLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 font-medium text-brand hover:underline ${className}`}>
      {children}
      <ExternalIcon className="shrink-0" />
    </a>
  );
}

function useCopied() {
  const [copied, setCopied] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return [
    copied,
    (text: string) => {
      navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(true);
      clearTimeout(t.current);
      t.current = setTimeout(() => setCopied(false), 1500);
    },
  ] as const;
}

// 0x12ab…9f3c with copy and explorer buttons.
export function Address({ value, kind = "address" }: { value: string; kind?: "address" | "tx" }) {
  const [copied, copy] = useCopied();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[13px]" title={value}>
        {short(value)}
      </span>
      <button
        type="button"
        onClick={() => copy(value)}
        className="grid size-6 place-items-center rounded-md text-fg-muted hover:bg-bg-elev-2 hover:text-fg"
        aria-label={copied ? "Copied" : `Copy ${kind === "tx" ? "transaction hash" : "address"}`}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? <span className="text-[10px] font-semibold">✓</span> : <CopyIcon />}
      </button>
      <a
        href={kind === "tx" ? explorer.tx(value) : explorer.address(value)}
        target="_blank"
        rel="noreferrer"
        className="grid size-6 place-items-center rounded-md text-fg-muted hover:bg-bg-elev-2 hover:text-fg"
        aria-label="View on Arc explorer"
        title="View on Arc explorer"
      >
        <ExternalIcon />
      </a>
    </span>
  );
}

export function Row({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-fg-muted">{label}</span>
      <span className={`num text-right ${strong ? "font-semibold text-fg" : ""}`}>{value}</span>
    </div>
  );
}

// Bottom sheet on phones, centered dialog on larger screens.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="rise relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-bg p-5 sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm text-fg-muted hover:bg-bg-elev-2 hover:text-fg">
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-2xl border border-line bg-bg-elev-1 p-5 ${className}`}>
      {children}
    </section>
  );
}
