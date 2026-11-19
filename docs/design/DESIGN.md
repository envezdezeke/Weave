# Design system

How Weave should look and read.
Team decisions in `../../.planning/research/DECISIONS-GRILLING.md` override this doc where they differ.
Screen details are in [`SCREENS.md`](SCREENS.md) and state machines in [`STATES.md`](STATES.md).

## The one job of the design

Every multi-leg product on the market is all-or-nothing.
Kalshi combos, Polymarket US combos, Robinhood combos, and Gemini's Combo Builder (live on gemini.com since at least Nov 18, 2026) pay only if every leg resolves YES.
Judges who know these will assume a basket works the same way.
So the main design job is to make "each leg pays its share" obvious on every screen that touches money.

The line to use everywhere it fits:

```
Combos pay only if every leg resolves YES. Baskets pay for each leg that does.
```

A basket's fair value is the weighted sum of its leg prices, which is the market's expected payout per token; this holds whatever the correlation between legs.
The mint price adds the ask spread and a 2% fee (decision Q8), so show both numbers honestly.
Say so:

```
The market expects this basket to pay about $0.25 per token on average. You pay $0.26 including the 2% fee.
```

Never show a probability that assumes the legs are independent (for example "chance any leg hits"); BTC and ETH legs move together.
Show scenarios instead.

## Look different from the incumbents

Kalshi, Gemini Predictions and Polymarket were checked live on Nov 18, 2026.
They share one look **[E, first-hand]**:

- Dark theme by default, near-black canvas, dark gray rounded cards, one bright accent (Kalshi mint green, Gemini cyan, Polymarket blue).
- A sports or live-game hero carousel at the top of the home page.
- Dense grids of one-market cards with an outlined "90%" pill and a payout multiplier like "1.09x".
- A right-hand ticket with Yes/No segmented buttons, a "Dollars" input, and one big button.
- An AI news layer: Kalshi "AI Digest ... Not advice", Gemini "Contract Intelligence", Polymarket "Breaking News".
- Kalshi uses a condensed display font; Gemini shows "Bid" when there is no ask and "No contracts available / Place a limit order" on thin markets.

Weave should be recognizably different within one second **[I]**:

| Incumbent pattern | Weave instead |
|---|---|
| Dark, dense trading-floor look | Light theme pinned by default (do not follow the OS setting), generous spacing, fewer cards per row; dark mode stays available as a toggle |
| Sports or live-game hero carousel | The worry input is the hero; the featured item is a basket with a "how it pays" preview |
| "90%" pill plus "1.09x" multiplier | Dollars first: "Pay $5, get up to $82" and per leg "pays $0.40"; percent only as a small "chance" label |
| One market per card | One basket per card with a stacked weight bar, one colored segment per leg |
| Mint or cyan accent | A distinct brand hue for basket visuals; green and red only for gains and losses; primary buttons in ink (near-black) |
| "Bid", limit orders, Yes/No toggle | One price and one button; no side toggle, because each leg's side is fixed by the basket |
| AI news feed | AI explains your basket: one reason per leg and an honest match rating |
| Combo Builder ("Pick 2+ markets") | "Build a hedge" from a worry |
| Condensed headline type | Geist at regular width, large tabular numbers |
| One fixed time zone (EST or CT) | Local time with the zone shown, and separate "Buy by" and "Resolves by" times |

Keep two patterns users already know **[E]**:

- Gemini's quick-amount chips, scaled to faucet-sized demos: "+$1 / +$5 / +$10 / Max".
- Gemini's "Important information" callout that names the settlement source.

## Tokens

Use Coinbase CDS role names as Tailwind CSS variables, since CDS is the only official token system found **[E for structure, I for names]**:

`fg`, `fg-muted`, `fg-positive`, `fg-negative`, `fg-warning`, `bg`, `bg-alt`, `bg-elev-1`, `bg-elev-2`, `bg-positive-wash`, `bg-negative-wash`, `bg-warning-wash`, `line`, `line-heavy`, plus `brand` and `brand-wash` for the basket visuals.

- Use wash tints for status chips and banners so color is never the only signal.
- Use hairlines and tints instead of shadows.
- In dark mode, use a lighter, less saturated green, not the light-mode hex.
- Pick `brand` so it is clearly not Kalshi mint or Gemini cyan, and check WCAG AA: 4.5:1 for text, 3:1 for icons, strokes and chart lines.
- Leg segment colors in the weight bar come from a small fixed palette (4-5 hues) that is distinct from `fg-positive` and `fg-negative`.
- Font: Geist (already in the app).
  Body weight 450-500, numbers 500-600, avoid 700.

## Number formatting

| Item | Rule | Example |
|---|---|---|
| Every changing number | `font-variant-numeric: tabular-nums` | |
| Basket price | USDC, 2 decimals; 3 decimals under $0.10 | $0.25, $0.062 |
| Leg chance | Whole percent first, cents second | 20% chance · 20¢ |
| Tiny chance | "<1%", never "0%" | <1% |
| Plain-language chance | Add "about 1 in N" on detail pages | 20% chance (about 1 in 5) |
| Weights | One precision everywhere | 40%, not 40.0% beside 35% |
| Signed changes | Sign plus arrow, true minus sign, 2 decimals for percent | ▲ +13.64% · ▼ −2.10% |
| Large amounts | Abbreviate in lists, full value in receipts | $12.4K backed · $12,400.00 |
| Timestamps | Always show the time zone; CST for the Austin demo | Nov 20, 12:00 PM CST |
| Hashes and addresses | 6 + 4 characters, with copy and explorer buttons | 0x12ab…9f3c |
| Never | Multipliers or odds framed as winnings | 4.00x, +400 |

## Vocabulary

| Use | Avoid |
|---|---|
| hedge, basket, event, leg, pays, max payout, cost, resolves YES/NO, decided by, fully reserved, % chance, redeem | insurance, policy, premium, claim, coverage, covered, insured |
| price, chance, resolves | bet, wager, odds, win, lose your stake, jackpot, "hits" |
| "protection" sparingly | "cover", "Good cover", "You are covered" |

Settled on Nov 18, 2026: the demo basket is named "BTC/ETH Crash Cover (15 min)", as the team's north-star checklist calls it.
That name is the only exception to the Avoid column; elsewhere keep "hedge" ("Hedge 25% of it", "hedge $500 of a $2,000 loss") and "Hedged on Gemini" for hedge coverage.

Explain the product in the order parametric products use (trigger, pre-agreed payment, speed), without their insurance words:

```
1. Each event is decided by Gemini · 2. Its share is paid into your basket automatically · 3. Redeem in one tap
```

## Disclosures (three layers)

1. A slim neutral top bar (not red or yellow):
   ```
   Test mode · Arc Testnet · test USDC has no real value · Get test USDC
   ```
2. One line beside every buy button and AI result:
   ```
   Testnet demo. Legs that resolve NO pay $0. Not investment advice.
   ```
3. A footer (the middle sentence is Gemini's own disclaimer):
   ```
   Testnet demo on Arc. Basket legs reference Gemini Predictions markets. Trading involves risk, including possible loss of your entire position. Not investment advice.
   ```

The Backing and "Who decides" cards are the content-level trust signals and belong above the fold on desktop.

## Keep crypto out of sight

- The header shows a dollar balance ("$48.20 USDC"), never a 0x address.
- Address, network and explorer link live in an Account sheet.
- Arc uses USDC for gas, so no second token ever appears.
- If the server holds the keys (Circle developer-controlled wallets), the README must say the app custodies testnet keys.

## Mobile, motion, accessibility

- Mobile: sticky bottom bar on Basket detail ("$0.25 · Buy basket"), bottom-sheet Buy ticket, tab bar (Explore, Build, Portfolio, Account).
- Motion: roll digits on price changes (200-300 ms), crossfade the chart on range change, draw a check on Done; instant under `prefers-reduced-motion: reduce`.
- Accessibility: arrows and signs on top of green and red; chart lines at 3:1 contrast in both themes; keyboard crosshair (arrow keys); scenario toggles with real `aria-pressed`.
