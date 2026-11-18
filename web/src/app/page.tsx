import Link from "next/link";
import { BasketCard, COMBO_LINE } from "@/components/basket";
import { FeaturedBasket } from "@/components/featured";
import { Sparkle } from "@/components/icons";
import { WorryInput } from "@/components/worry-input";
import { baskets, CRASH_ID, getBasket } from "@/lib/data";

const steps = [
  { n: "1", title: "Each event is decided by Gemini", body: "Every leg is a live Gemini Predictions market with its own rule and source." },
  { n: "2", title: "Its share is paid into your basket automatically", body: "A leg that resolves YES pays its weight in USDC. The others pay nothing." },
  { n: "3", title: "Redeem in one tap", body: "Once the legs resolve, redeem to your wallet on Arc." },
];

export default function Home() {
  return (
    <div className="pt-10 sm:pt-16">
      <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 text-xs font-medium text-brand">
            <Sparkle /> Built on Gemini Predictions and Arc
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Weave your worries into one hedge.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-fg-muted">
            Name a risk. Weave bundles the Gemini markets that track it into one token that pays for each event that
            happens.
          </p>
          <div className="mt-8 max-w-xl">
            <WorryInput />
          </div>
        </div>
        <FeaturedBasket basket={getBasket(CRASH_ID)!} />
      </section>

      <section className="mt-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Curated baskets</h2>
            <p className="mt-1 text-fg-muted">Hand-built from live Gemini markets.</p>
          </div>
          <Link href="/build" className="hidden text-sm font-medium text-brand hover:underline sm:block">
            Build your own →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {baskets.map((b) => (
            <BasketCard key={b.id} basket={b} />
          ))}
        </div>
      </section>

      <section className="mt-20 rounded-3xl bg-bg-alt p-6 sm:p-8">
        <p className="max-w-3xl text-xl font-semibold tracking-tight text-balance">{COMBO_LINE}</p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="num grid size-8 place-items-center rounded-full bg-bg text-sm font-semibold">{s.n}</span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
