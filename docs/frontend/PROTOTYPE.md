# Web prototype

A clickable prototype of Weave with mock onchain state, first built on Nov 18, 2026 and brought in line with [`CHANGE_PLAN.md`](CHANGE_PLAN.md) the same day.
It is meant to become the real frontend once the contracts and operator service exist.

## Run it

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build
```

Stack: Next.js 16 (App Router, Cache Components and Partial Prefetching on), React 19, Tailwind CSS 4, TypeScript, Geist font.
No other dependencies; charts are hand-written SVG.
Next 16 differs from older versions: read `web/AGENTS.md` and `web/node_modules/next/dist/docs/` before changing routing or data fetching.

## File map

| Path | What it does |
|---|---|
| `web/src/app/layout.tsx` | Root layout: theme script (light pinned by default), test-mode bar, nav, footer disclosure, `StoreProvider` |
| `web/src/app/globals.css` | CDS-style role tokens (`fg`, `bg-alt`, `brand`, `leg-1..4`, ...) for light and `[data-theme="dark"]` |
| `web/src/app/page.tsx` | Explore: worry hero, featured 15-minute basket, two curated cards, combo line and three steps |
| `web/src/app/basket/[id]/basket-view.tsx` | Basket detail: clocks, expected payout, three-number strip, chart, legs, How it pays, Backing, Onchain, Who decides, Hedge record, Good to know, buy rail or mobile sheet |
| `web/src/app/build/builder.tsx` | AI builder: tool-call cards, match badge, options, refine chips, gap note, near misses, "Markets we wish existed" |
| `web/src/app/build/review/` | Basket detail for an AI-built draft ("AI-built" badge) |
| `web/src/app/portfolio/page.tsx` | Portfolio: Cash and Portfolio chips, redeem banner, position states, per-leg chips and evidence, Redeem, Send (ERC-1155) |
| `web/src/components/buy-panel.tsx` | Buy ticket: amount at risk plus 10-100% slider, "Enter cost instead" with +$1/+$5/+$10/Max, scenarios, receipt review, transaction states |
| `web/src/components/basket.tsx` | Shared basket pieces: card, three numbers, leg list, How it pays, backing and solvency gauges, who decides, hedge record |
| `web/src/components/featured.tsx` | Featured 15-minute basket with Buy by and Resolves clocks |
| `web/src/components/nav.tsx` | Header, theme toggle, Account sheet, mobile tab bar, test-mode bar |
| `web/src/components/ui.tsx` | Weight bar, chips, address with copy and explorer, sheet, disclosure line |
| `web/src/components/charts.tsx` | `PriceChart` (crosshair by pointer or arrow keys, range chips), `ChanceBar` |
| `web/src/lib/markets.ts` | Gemini legs (books, rule wording, sources, links) and the 15-minute window logic |
| `web/src/lib/pricing.ts` | Team pricing model: quote, mid, illiquid, fair value, mint price (+2%), outcomes, hedge sizing; pure, ready for `packages/core` |
| `web/src/lib/data.ts` | The two curated baskets, mock contracts, vault and hedge-record seeds, hedge coverage |
| `web/src/lib/builder.ts` | Keyword stand-in for the LLM builder: match level, options, gaps, near misses, refinements |
| `web/src/lib/store.tsx` | Client state in localStorage: balance, positions, vaults, drafts, wishes; buy, confirm, fail, redeem, send; mock 15-minute resolver |
| `web/src/lib/positions.ts` | Position states from `STATES.md` |
| `web/src/lib/format.ts` | Money, chance ("<1%", "about 1 in N"), arrows, Central-time clocks with zone, hashes |

## What is real and what is mocked

- Real: every leg is a live Gemini market, with books, rule wording and settlement sources from `GET /v1/prediction-markets/events` on Nov 18, 2026 at about 4:40 PM CST, and links to `gemini.com/predictions/{ticker}/{slug}`.
- Real: the 15-minute legs follow Gemini's `BTC15M`/`ETH15M` series (Up/Down against the window's opening price); the basket holds NO on "Up", and the window, symbol and slug roll with the clock.
- Mocked: prices do not update live, price history, the AI builder (keyword rules, no LLM), transactions and hashes, wallet balance, vault balances and block number, hedge fills and order IDs, contract addresses (except Arc testnet USDC), and the resolver.
  The mock resolver settles a 15-minute position 20 seconds after its window ends, with a seeded coin flip.
- The Account sheet has "Reset demo data" to return to the seed state.

## Demo switches

Append these to a basket URL to show states a normal run never reaches:

- `?tx=slow`: the buy stays in Confirming past 60 seconds, shows Slow, then completes.
- `?tx=fail`: the buy is dropped and ends in Failed ("No money moved").
- `?hedge=fail`: the buy succeeds, its last leg shows "Unhedged, retrying" in the Hedge record, and it fills about 12 seconds later.

## Wiring left for the real build

- Read vault balance, supply and block from the vault contract instead of `seedVault` in `data.ts`.
- Replace `submitBuy`/`confirmBuy`/`redeem`/`send` in `store.tsx` with contract calls (25+ gwei `maxFeePerGas` on Arc).
- Fetch live Gemini prices for the legs, and the hedge record from the operator API.
- Move `lib/pricing.ts` and the `Leg` type into `packages/core` once it exists.
- Confirm the contract's admin roles, then update the limits line on the Backing card.

## Verification so far

- Type-check, lint and production build pass.
- Clicked through in Chrome on Nov 18, 2026: buy (Done, Failed and Slow paths), redeem, send, AI builder (partial, strong and no-match worries, refine, review), light and dark, 1440 px, 1000 px, and 390 px (in a 390 px frame).
- Buy and redeem were not exercised at 390 px end to end.
