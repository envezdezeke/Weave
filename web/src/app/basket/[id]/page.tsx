import { notFound } from "next/navigation";
import { Suspense } from "react";
import { baskets, getBasket } from "@/lib/data";
import { BasketView } from "./basket-view";

export function generateStaticParams() {
  return baskets.map((b) => ({ id: b.id }));
}

// Params are awaited inside Suspense so unlisted ids get a static shell
// (Partial Prefetching) and then a 404.
export default function BasketPage({ params }: PageProps<"/basket/[id]">) {
  return (
    <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-2xl bg-bg-alt" />}>
      <Basket params={params} />
    </Suspense>
  );
}

async function Basket({ params }: { params: PageProps<"/basket/[id]">["params"] }) {
  const { id } = await params;
  const basket = getBasket(id);
  if (!basket) notFound();
  return <BasketView basket={basket} />;
}
