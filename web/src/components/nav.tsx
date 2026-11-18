"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { contracts } from "@/lib/data";
import { usd } from "@/lib/format";
import { useStore, WALLET } from "@/lib/store";
import { Logo, MoonIcon, SunIcon, TabIcon } from "./icons";
import { Address, ExtLink, Row, Sheet } from "./ui";

const links = [
  { href: "/", label: "Explore", icon: "explore" },
  { href: "/build", label: "Build a hedge", icon: "build" },
  { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
] as const;

const FAUCET = "https://faucet.circle.com";

// Layer 1 of the disclosures: slim and neutral, not an alarm.
export function TestBar() {
  return (
    <div className="border-b border-line bg-bg-alt text-xs text-fg-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 px-4 py-1.5 sm:px-6">
        <span className="font-medium text-fg">Test mode</span>
        <span aria-hidden>·</span>
        <span>Arc Testnet</span>
        <span aria-hidden>·</span>
        <span>test USDC has no real value</span>
        <span aria-hidden>·</span>
        <a href={FAUCET} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
          Get test USDC
        </a>
      </div>
    </div>
  );
}

// Theme lives on <html data-theme>; the inline script in layout.tsx applies
// a saved choice before paint. Light is the default whatever the OS says.
function subscribe(cb: () => void) {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme ?? "light",
    () => "light",
  );
  const set = (t: "light" | "dark") => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {}
  };
  return [theme, set] as const;
}

function ThemeToggle() {
  const [theme, set] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => set(dark ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-full text-fg-muted hover:bg-bg-elev-2 hover:text-fg"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function Balance({ onClick }: { onClick: () => void }) {
  const store = useStore();
  return (
    <button
      type="button"
      onClick={onClick}
      className="num rounded-full border border-line px-3.5 py-1.5 text-sm font-medium hover:border-line-heavy"
      aria-label="Account"
    >
      {store ? usd(store.balance) : "$–.––"} <span className="text-fg-muted">USDC</span>
    </button>
  );
}

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [theme, set] = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title="Account">
      <div className="rounded-2xl bg-bg-alt p-4">
        <div className="text-xs text-fg-muted">Cash</div>
        <div className="num mt-0.5 text-3xl font-semibold tracking-tight">{store ? usd(store.balance) : "–"}</div>
        <div className="text-xs text-fg-muted">test USDC on {contracts.chain}</div>
      </div>
      <div className="mt-4 text-sm">
        <Row label="Wallet" value={<Address value={WALLET} />} />
        <Row label="Network" value={`${contracts.chain} · chain ${contracts.chainId}`} />
        <Row label="Gas" value="Paid in USDC" />
        <Row
          label="Theme"
          value={
            <span className="inline-flex rounded-full border border-line p-0.5">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => set(t)}
                  className={`rounded-full px-3 py-0.5 text-xs font-medium capitalize ${theme === t ? "bg-fg text-bg" : "text-fg-muted"}`}
                >
                  {t}
                </button>
              ))}
            </span>
          }
        />
      </div>
      <a
        href={FAUCET}
        target="_blank"
        rel="noreferrer"
        className="mt-5 block rounded-full bg-fg py-3 text-center text-sm font-semibold text-bg hover:opacity-90"
      >
        Get test USDC
      </a>
      <p className="mt-3 text-xs text-fg-muted">
        The Circle faucet gives 20 test USDC per request. Test USDC has no real value.{" "}
        <ExtLink href={`${contracts.explorer}/address/${WALLET}`}>Wallet on Arc explorer</ExtLink>
      </p>
      <button
        type="button"
        onClick={() => {
          store?.reset();
          onClose();
        }}
        className="mt-4 w-full rounded-full border border-line py-2.5 text-sm font-medium text-fg-muted hover:bg-bg-elev-2 hover:text-fg"
      >
        Reset demo data
      </button>
    </Sheet>
  );
}

export function Nav() {
  const path = usePathname();
  const [account, setAccount] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/basket") : path.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
            <Logo />
            <span>Weave</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active(l.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active(l.href) ? "bg-bg-elev-2 font-medium text-fg" : "text-fg-muted hover:text-fg"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Balance onClick={() => setAccount(true)} />
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md md:hidden" aria-label="Main">
        <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(l.href) ? "text-fg" : "text-fg-muted"}`}
            >
              <TabIcon name={l.icon} />
              {l.label === "Build a hedge" ? "Build" : l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setAccount(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-fg-muted"
          >
            <TabIcon name="account" />
            Account
          </button>
        </div>
      </nav>

      <AccountSheet open={account} onClose={() => setAccount(false)} />
    </>
  );
}
