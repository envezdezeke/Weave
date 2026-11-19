# Screens

Screen-by-screen spec for the web app.
Rules that apply everywhere (tokens, numbers, vocabulary, disclosures) are in [`DESIGN.md`](DESIGN.md).

## Baskets in scope (decisions Q4, Q5)

- **BTC/ETH crash basket (15 min)**, the live demo: 2-3 BTC/ETH 15-minute downside legs (No on "above" strikes), resolved on camera, with a recorded backup take.
  Name: "BTC/ETH Crash Cover (15 min)", weighted 70% BTC / 30% ETH (decision Q17); see Vocabulary in `DESIGN.md`.
- **Recession Hedge**: priced from production Gemini data, not resolvable before the deadline ("same mechanism, any horizon").
- Plus AI-built baskets.

Team worked example (decision file): 50% BTC-No at 0.30, 30% ETH-No at 0.25, 20% SOL-No at 0.40 -> fair value $0.305, mint price $0.311 with the 2% fee, max $1.00.

## Sample basket used in this doc

The example copy below uses one illustrative basket so the numbers agree across screens.
Its prices are made up for consistency; the app uses live Gemini prices and adds the 2% fee to the mint price.

- **Slowdown Hedge**, 3 legs:
  - Recession declared · YES · weight 40% · 20¢
  - Unemployment above 5% · YES · weight 35% · 20¢
  - Gas above $4 · YES · weight 25% · 40¢
- Price: 0.40 x 0.20 + 0.35 x 0.20 + 0.25 x 0.40 = **$0.25**.
- $50 buys 200 tokens; max payout $200.00.

## Explore

| Action | Spec | Basis |
|---|---|---|
| Keep | Worry input as the hero; button label "Build a basket". | **[E]** Polymarket US hero CTA "Build a Combo" |
| Keep | Featured short-dated basket with a live countdown. | **[E]** short-dated crypto markets are a main category |
| Change | Featured basket is the 15-minute BTC/ETH downside basket (decision Q4), framed for the crypto-paid freelancer: "Paid in crypto? Hedge a drop in the next 15 minutes." It must resolve during the demo window. | **[E]** daily 5 PM ET markets resolve after the Friday noon deadline |
| Change | Two clocks: "Buy by 4:15 PM CST · 1:42 left" and "Resolves 4:15 PM CST". | **[E]** absolute window text; **[I]** two clocks |
| Change | Card headline is dollars: price "$0.25" with "Pays up to $1.00"; legs as compact rows with whole-percent chance bars and "+2 more". | **[E]** Polymarket multi-outcome rows; **[I]** basket headline |
| Add | Stacked weight bar on each card, one segment per leg. | **[I]**, differentiator |
| Add | One payout line per card: "$100 -> up to $400 · Each leg pays its share". | **[E]** Crypto.com OG "$100 -> $142" |
| Add | Card metadata: "$12.4K backed", "Ends Dec 31", status badge ("Live", "New", "AI-built"). | **[E]** Polymarket card metadata |
| Skip | Topic pills: with 2 curated baskets (decision Q5) they add nothing. | |
| Skip | Sparkline polish. | **[I]** low impact |

## Basket detail

Order top to bottom: header, three-number strip, chart, What's inside, How it pays, Backing, Who decides, Good to know.
Right rail (desktop): sticky Buy ticket.
Closest live analogue: Public's Generated Assets page (label, stats, allocation table with "Targets last updated", order panel on the same page) **[E]**.

| Action | Spec | Basis |
|---|---|---|
| Keep | Big price, single-line chart with crosshair, range chips "1D 1W 1M ALL". | **[E]** Polymarket, Robinhood |
| Change | Dotted baseline at the range-start price; change label "+$0.03 (+13.64%) past week". | **[E]** Robinhood names its baseline |
| Change | Replace the stats row with three named numbers: "Cost $0.25 · Pays up to $1.00 · Ends Dec 31, 2026", subline "Most you can lose: $0.25 per token." | **[E]** Innovator named numbers, OptionStrat max loss |
| Change | Leg rows show what each pays: "Recession declared · YES · 20% chance · weight 40% · pays $0.40", with a YES/NO direction chip (hedge legs are often NO). | **[E]** Gemini legs carry a direction |
| Add | Stacked weight bar above the legs; tapping a segment scrolls to that leg. | **[E]** Robinhood Strategies tap-through |
| Add | Directly under the legs: "Combos pay only if every leg resolves YES. Baskets pay for each leg that does." | **[E]** combos are all-or-nothing |
| Add | "How it pays" table. Up to 3 legs: named rows ("Nothing happens $0.00 · Only gas $0.25 · Only unemployment $0.35 · Only recession $0.40 · Recession + unemployment $0.75 · All three $1.00"). More than 3 legs: per-leg "Mark as happens" toggles and a live "You'd receive $0.75 per token". | **[E]** OptionStrat P/L table, Innovator scenarios |
| Change | Backing card as a reserve ratio: "Fully reserved · 100% · $12,400 USDC held for 12,400 tokens x $1.00 max payout · As of block 4,812,331 · Verify on Arc ->". Read the numbers from the contract when it exists. | **[E]** Circle transparency page, Kraken proof of reserves |
| Add | Limits line on the backing card: "Payouts depend on Gemini settling each contract." Only say "No admin can move reserves" if the contract enforces it; otherwise name the admin role. | **[E]** Kraken limitations list, Morpho roles |
| Add | "Who decides" per leg, in Gemini's rule wording: "Resolves YES if ... Otherwise, it resolves to No. Decided by Gemini Predictions using [source]. We never decide outcomes." Link the live Gemini market. Include the settlement source like Gemini's "Important information" callout. | **[E]** Gemini rules and callout |
| Change | Rename "Risks" to "Good to know"; lead with basis risk: "This pays when the listed events happen, not when you have a loss. Your real costs may be higher or lower." Then "Weights are fixed at creation and never rebalance." | **[E]** Descartes basis-risk framing |
| Keep | Onchain addresses card, moved under Backing, addresses truncated with copy and explorer buttons. | **[I]** |
| Remove | The prototype's "Chance any leg hits" stat and any icon array: both assume independent legs, which the team's pricing model rules out. | Decision file, pricing model |
| Add | Solvency gauge beside Backing: "Vault balance ÷ max liability" as a percent, plus "Hedge coverage %" from the Gemini sandbox hedge record (decisions Q8, Q13). | Decision file |
| Add | Hedge record: per-trade Gemini sandbox order ID, fill price vs production price, and "Unhedged, retrying" when a fill fails (decisions Q2, Q7, Q13). | Decision file |
| Add | Composability beat: "Send" on a position does a standard ERC-1155 transfer with an explorer link (decision Q9). | Decision file |

## Buy ticket

Decision Q6 changes the input: the user enters the amount at risk and picks how much of it to hedge (10-100%); the app computes tokens, cost and max payout ("hedge $500 of a $2,000 loss for $38").
The rows below still apply to everything after that input.

| Action | Spec | Basis |
|---|---|---|
| Change | Input: "How much could you lose?" (dollars) plus a slider "Hedge 25% of it" (10-100%). Output: "Max payout $500.00 · Costs $38.00 · 1,220 tokens". Keep a small "Enter cost instead" link for the faucet-sized demo. | Decision Q6 |
| Change | Presets sized for faucet funds: "+$1 · +$5 · +$10 · Max". Show "= 20 tokens" live under the input. | **[E]** Gemini quick chips, Robinhood dollar orders |
| Change | Scenarios scaled to the user's dollars. For $50: "If all three resolve YES: $200.00 · Recession + unemployment: $150.00 · Only recession: $80.00 · Only gas: $50.00 · None: $0.00". Title: "If every event resolves YES" (not "if every market hits"). | **[I]** |
| Change | Review as a receipt: "You pay $50.00 (includes 2% fee) · You receive 200 tokens · Max payout $200.00 · Most you can lose $50.00 · Network fee $0.01 · Ends Dec 31, 2026 · Held until it resolves". | **[E]** Kalshi review fields; decisions Q8, Q12 |
| Add | Above the button: "Once confirmed on Arc, this purchase is final. You can redeem after legs resolve." | **[E]** Kalshi combos "can't be canceled or reversed" |
| Add | Beside the button: "Testnet demo. Legs that resolve NO pay $0. Not investment advice." | **[E]** Gemini disclaimer |
| Change | Button: "Buy basket · $50.00". | **[I]** |
| Change | Pending and result follow [`STATES.md`](STATES.md) (Submitting, Confirming, Slow, Done, Failed). | **[E]** MetaMask toasts, stuck-pending reports |
| Change | Success: "Done. You own 200 Slowdown Hedge tokens." plus a Receipt row: amount, price, fee, time with zone, "0x12ab…9f3c · View on Arc explorer". | **[E]** MetaMask detail view |
| Add | Desktop sticky right rail; mobile bottom sheet. | **[E]** Public side panel |
| Skip | Slide-to-confirm on web. | **[I]** accessibility cost |

## AI builder

Blanket (built on Kalshi, Aug 2026) already does worry -> contracts with reasons, basis-risk notes and near misses, but moves no money.
Line for judges: "Blanket finds markets; Weave also buys, holds and redeems them."

| Action | Spec | Basis |
|---|---|---|
| Keep | Prompt "What are you worried about?" with example chips: "I might get laid off", "Gas keeps rising", "A heat wave hits my city", "Rates stay high". | **[E]** Blanket, Composer suggested paths |
| Change | Progress as tool-call cards that tick from spinner to check: "Reading Gemini markets · Matching your worry · Weighting legs · Checking backing". | **[E]** generative UI tool cards |
| Add | Match badge, not a score: "Strong match" / "Partial match" / "No market matches this yet", each with one action. | **[E]** Google PAIR guidance |
| Change | Per-leg reason stays; the market title links to the live Gemini market, with resolution source and close date as a footnote. | **[E]** PAIR "what" plus "why" |
| Change | The gap note names what is not hedged ("No market tracks your rent directly. Gas above $4 is the closest.") and shows near misses. | **[E]** Blanket near misses |
| Add | "Markets we wish existed" panel fed by worries with no match. | **[E]** Blanket "Markets Kalshi should make" |
| Add | Cost line: "Costs $12.50 for 50 tokens. Pays up to $50.00 if all three events happen." | **[E]** Blanket cost-vs-payout |
| Add | "Review basket" opens Basket detail with an "AI-built" label; the AI never buys on its own. | **[E]** Composer review step, Public drafts |
| Add | Refine chips: "Make it cheaper · Only events this year · Show another option". For Partial match, show 2-3 alternatives side by side. | **[E]** PAIR N-best alternatives |
| Add | "AI suggestions are not investment advice. You decide what to buy." | **[E]** Public Alpha disclaimer |
| Add | For a no-match worry, also suggest a curated basket, and keep one such query in the video (decision Q14). | Decision file |

## Portfolio

| Action | Spec | Basis |
|---|---|---|
| Keep | Total value chart, positions list, toast. | |
| Add | Header chips: "Cash $48.20" and "Portfolio $230.00". | **[E]** Polymarket US |
| Change | Redeem button shows the amount: "Redeem $80.00". Banner when anything is ready: "1 basket ready to redeem · $80.00". | **[E]** Polymarket claim banner and button |
| Add | Per-leg status chips: "Open · Resolved YES · Resolved NO · Voided", plus "2 of 3 legs resolved". | **[E]** Kalshi per-leg marker, Gemini settled states |
| Add | Evidence per leg: "Resolved YES on Dec 31 by Gemini Predictions (source: NBER) ->". | **[E]** Polymarket rules name the source |
| Add | Expected wait per state, only after measuring it in the Gemini sandbox: "Waiting for Gemini to settle, usually within hours". | **[E]** Kalshi states 1-12 h |
| Change | Position states follow [`STATES.md`](STATES.md). | |
| Stretch | Partial redeem: "Redeem $80.00 now (recession leg). $70.00 more if unemployment resolves YES." | **[I]** |
