# Frontend change plan

Ordered work to bring `web/` in line with the research and the team decisions in `../../.planning/research/DECISIONS-GRILLING.md`.
Per decision Q11, Cayden owns this work; the frontend meets Ezekiel's contracts at the operator API through shared types in `packages/core`.
Specs and exact copy live in [`../design/SCREENS.md`](../design/SCREENS.md), [`../design/DESIGN.md`](../design/DESIGN.md) and [`../design/STATES.md`](../design/STATES.md).
Hours are rough estimates on the existing prototype.

Work top to bottom.
Phase A fixes things that are wrong; Phase B is the highest judging impact per hour; Phase C is the rest.

## Phase A: correctness (about 2 h)

- [x] **A0. Rename to Weave.**
  App name, page title, logo text and copy; tagline "Weave your worries into one hedge."
- [x] **A1. Demo basket resolves inside the demo window (Q4).**
  Replace "Crypto Today" (5 PM ET daily legs) with the BTC/ETH 15-minute downside basket: 2-3 legs, No on "above" strikes.
  Countdown targets the next quarter hour and resets.
  Done when: the featured card never shows a time after the current 15-minute window.
- [x] **A2. Two curated baskets only (Q5).**
  Keep the crash basket and Recession Hedge; remove Oil Shock, Higher for Longer and Washington Wildcards from the catalog (keep their legs available to the AI builder if useful).
  Done when: no basket contains sports or politics legs.
- [x] **A2b. Pricing (Q8).**
  Mint price = Σ weight x ask x 1.02 (No ask for No legs); NAV = Σ weight x mid; flag legs with no bid as illiquid.
  Replace the 1% `SPREAD` in `web/src/lib/data.ts`.
  Remove "Chance any leg hits" (it assumes independent legs).
- [x] **A3. Faucet-sized amounts.**
  Starting balance about $40 test USDC; presets "+$1 · +$5 · +$10 · Max"; seed positions and vault numbers scaled to match (about 100 tokens max per basket).
- [x] **A4. Vocabulary sweep.**
  Apply the Use/Avoid table in `DESIGN.md`; change "if every market hits" to "If every event resolves YES"; no "covered", "odds", "win".
- [x] **A5. Time zones.**
  Every timestamp shows its zone; separate "Buy by" and "Resolves" times.

## Phase B: top judging impact (about 7-9 h)

- [x] **B1. Combo contrast and "How it pays"** (Detail, Buy; 1-2 h).
  Add "Combos pay only if every leg resolves YES. Baskets pay for each leg that does." under the legs.
  Add the "How it pays" table (named rows up to 3 legs, toggles above 3).
- [x] **B2. Dollar-scaled scenarios and receipt review** (Buy; 1-2 h).
  Scenarios use the typed amount; review shows You pay, tokens, Max payout, Most you can lose, Network fee, Ends; finality line and disclosure line above the button.
- [x] **B3. Three-number strip** (Detail, Explore; 1 h).
  "Cost · Pays up to · Ends" plus "Most you can lose: $X per token"; same numbers on cards.
- [x] **B4. Backing card as a reserve ratio** (Detail; 2-3 h).
  "Fully reserved · 100% · $X USDC held for N tokens x $1.00 · As of block … · Verify on Arc ->", plus the limits line.
  Mock values now; wire to the vault contract later.
- [x] **B4b. Solvency gauge and hedge coverage** (Detail, header; 1-2 h; Q8, Q13).
  Vault balance ÷ max liability as a percent, and hedge coverage % from the sandbox hedge record.
- [x] **B4c. Hedge sizing input** (Buy; 1-2 h; Q6).
  "How much could you lose?" plus a 10-100% slider; computes tokens, cost and max payout.
- [x] **B5. Look different from the incumbents** (all screens; 1-2 h).
  Pin light theme by default with a dark toggle; change the brand accent away from mint and cyan; primary buttons in ink; green and red only for gains and losses; add the stacked weight bar to cards and detail.

## Phase C: full flows (about 8-10 h)

- [x] **C1. Transaction state machine** (Buy, Portfolio; 2-3 h).
  Submitting, Confirming, Slow (about 60 s), Done, Failed per `STATES.md`; receipt with truncated hash and explorer link.
- [x] **C2. AI builder upgrade** (Builder; 3-4 h).
  Tool-call progress cards, match badge, links to Gemini markets, honest "not hedged" note with near misses, cost line, "Review basket" step, refine chips, AI disclaimer.
- [x] **C3. "Who decides" per leg** (Detail; 1-2 h).
  Gemini rule wording, settlement source callout, link to the live market.
- [x] **C4. Portfolio states and evidence** (Portfolio; 2 h).
  Position states, per-leg chips, "2 of 3 legs resolved", "Redeem $X" with banner, resolution evidence links, Cash and Portfolio chips.
- [x] **C5. Three-layer disclosures** (all; 30 min).
  Test-mode bar, line beside each buy and AI result, footer.
- [x] **C5b. Hedge record and composability** (Detail, Portfolio; 1-2 h; Q2, Q7, Q9, Q13).
  Sandbox order IDs and price gap per trade, "Unhedged, retrying" state, and a "Send" action doing an ERC-1155 transfer with an explorer link.
- [x] **C6. Formatting pass** (all; 1 h).
  Arrows on signed changes, "<1%", one weight precision, "about 1 in N" on detail.

## Open question for the team

- [ ] Settle the "Cover" naming conflict (see `../design/DESIGN.md`, Vocabulary) before writing final copy.
  Until then the app uses the vocabulary-safe names: "BTC/ETH Crash Hedge (15 min)", "Hedge 25% of it", and "Hedged on Gemini" for hedge coverage.

## Cut list if time runs short

Sparkline polish, partial redeem, motion polish.
None of them changes what a judge understands in a 2-3 minute video.

## Before recording the video

- [ ] Click through buy and redeem in a real browser, light and dark, desktop and 390 px.
- [ ] Show "price = expected payout" and the "How it pays" table to 2-3 people outside the team and check they understand it.
- [ ] Spend 15 minutes in the logged-in Gemini Predictions app to compare its order review and portfolio screens.
