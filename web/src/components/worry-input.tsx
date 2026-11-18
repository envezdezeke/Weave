"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EXAMPLES } from "@/lib/builder";
import { Sparkle } from "./icons";

export function WorryInput({ initial = "", onSubmit }: { initial?: string; onSubmit?: (q: string) => void }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  const go = (text: string) => {
    const t = text.trim();
    if (!t) return;
    if (onSubmit) onSubmit(t);
    else router.push(`/build?q=${encodeURIComponent(t)}`);
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex items-center gap-2 rounded-full border border-line-heavy bg-bg p-1.5 pl-5 focus-within:border-fg"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What are you worried about?"
          aria-label="What are you worried about?"
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-fg-muted/70"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          <Sparkle />
          <span>
            Build<span className="hidden sm:inline"> a basket</span>
          </span>
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              setQ(e);
              go(e);
            }}
            className="rounded-full border border-line px-3 py-1 text-sm text-fg-muted transition-colors hover:border-line-heavy hover:text-fg"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
