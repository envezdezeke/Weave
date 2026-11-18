"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BasketView } from "@/app/basket/[id]/basket-view";
import { useStore } from "@/lib/store";

// Basket detail for an AI-built draft. Drafts live in client state, so this
// page reads them after mount.
export function Review() {
  const id = useSearchParams().get("id") ?? "";
  const store = useStore();
  if (!store) return <div className="mt-10 h-96 animate-pulse rounded-2xl bg-bg-alt" />;
  const basket = store.drafts[id];
  if (!basket) {
    return (
      <div className="pt-16 text-center">
        <h1 className="text-2xl font-semibold">This draft is gone</h1>
        <p className="mt-2 text-fg-muted">Drafts are kept on this device only. Build it again from your worry.</p>
        <Link href="/build" className="mt-6 inline-block rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg">
          Build a hedge
        </Link>
      </div>
    );
  }
  return <BasketView basket={basket} />;
}
