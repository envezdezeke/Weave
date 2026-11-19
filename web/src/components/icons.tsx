import type { Icon, Kind } from "@/lib/data";

// Three strands woven over and under: one basket, several events.
export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect width="26" height="26" rx="8" className="fill-fg" />
      <path d="M6 9.5c3.5 0 4.5 7 7 7s3.5-7 7-7" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-bg" />
      <path d="M6 16.5c3.5 0 4.5-7 7-7s3.5 7 7 7" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-brand" />
    </svg>
  );
}

const paths: Record<Icon, string> = {
  crash: "M4 6l5 5 3-3 6 7M18 11v4h-4",
  recession: "M4 17h14M6 17V9M10 17V6M14 17v-5M18 17v-3",
  rates: "M5 17L17 5M7.5 8a1.5 1.5 0 1 0 0-.01M14.5 15a1.5 1.5 0 1 0 0-.01",
  oil: "M11 3s-5 6.2-5 10a5 5 0 0 0 10 0c0-3.8-5-10-5-10Z",
  sun: "M11 7.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M5 17l1.4-1.4M15.6 6.4L17 5",
  spark: "M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8L11 3Z",
};

export function BasketIcon({ icon, kind = "crypto", size = 40 }: { icon: Icon; kind?: Kind; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{ width: size, height: size, background: `var(--tint-${kind})`, color: `var(--ink-${kind})` }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d={paths[icon]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        d="M8 1.5l1.4 3.9a2 2 0 0 0 1.2 1.2L14.5 8l-3.9 1.4a2 2 0 0 0-1.2 1.2L8 14.5l-1.4-3.9a2 2 0 0 0-1.2-1.2L1.5 8l3.9-1.4a2 2 0 0 0 1.2-1.2L8 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Check({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cross({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${className}`} aria-hidden />;
}

export function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 3.5v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ExternalIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M6.5 3.5h-3v9h9v-3M9.5 3.5h3v3M12.5 3.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 22 22" fill="none" className={className} aria-hidden>
      <path d={paths.sun} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function TabIcon({ name }: { name: "explore" | "build" | "portfolio" | "account" }) {
  const d = {
    explore: "M3 10.5L11 4l8 6.5V18a1 1 0 0 1-1 1h-4v-5h-6v5H4a1 1 0 0 1-1-1v-7.5Z",
    build: paths.spark,
    portfolio: "M4 17V11M9 17V7M14 17v-4M19 17V5",
    account: "M11 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 19c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5",
  }[name];
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
