# Positioning

Where Weave (formerly Event Baskets) sits against the prediction-market industry as of Nov 18, 2026, what not to claim, and how to frame the legal risk.
Tagline: "Weave your worries into one hedge."
Team decisions (`../../.planning/research/DECISIONS-GRILLING.md`) win where they differ.

## The gap

No prediction-market company sells a fixed-weight basket that pays out per leg that resolves YES.
Every multi-leg product is an all-or-nothing combo (parlay): Kalshi, Polymarket US, Robinhood, DraftKings, and Gemini's Combo Builder.
Combos are about half or more of notional volume at Kalshi (58% in Sept 2026) and Polymarket US (58.2% in Oct 2026), so people clearly buy multi-leg products, but nobody offers one shaped like a hedge.

| Gap Weave fills | Evidence | How to show it in the demo |
|---|---|---|
| Pro-rata payoff | All competitor multi-leg products pay only if every leg wins | One basket with 2 of 3 legs YES paying their share, beside the same legs as a combo paying $0 |
| Worry to an owned position in one step | Blanket suggests Kalshi markets but executes nothing; Kalshi x S&P indices are announced with no product or date | Type a worry, get a basket, buy it with test USDC |
| A USDC basket token on Arc | Kalshi's onchain tokens are single markets on Solana; Polymarket redeems in pUSD; every Arc prediction project is a single market | One token per basket, bought and redeemed in USDC |
| Honest backing | PolyBaskets and Senthos do not say whether they hold real positions | Backing card, "Who decides" per leg, README trust assumptions |
| Hedging-first, non-sports legs | Sports drive most volume and nearly all litigation; weather is the most traded category at IBKR ForecastEx | Economy, energy, weather and crypto legs only |
| Distribution for Gemini | Gemini earns about $0.8M a quarter from predictions and says it wants distribution partners and AI-agent access | Every leg maps to a Gemini instrument symbol |
| What Arc asked for | Arc's Cannes 2026 prize brief asked for "institutional hedging markets" | Lead with hedging, not "AI agent" (97% of HackMoney Arc entries had agents) |

## Do not claim

| Claim | Why not |
|---|---|
| "First prediction-market basket" or "first event index" | PolyBaskets exists; Senthos and Cumulant demoed baskets in 2026; Kalshi and S&P announced indices |
| "First AI that turns worries into hedges" | Blanket does this for Kalshi; claim execution and ownership instead |
| "Kalshi positions can't leave Kalshi" | Kalshi markets trade as SPL tokens on Solana via DFlow |
| "Kalshi can't do small tickets" | Kalshi contracts cost cents; the edge is a diversified basket, not size |
| "Gemini settles in USDC" or "Gemini has onchain positions" | Not documented; no Gemini onchain product exists |
| "Gemini combos are not live" | The web Combo Builder was live on Nov 18, 2026 |
| "Insurance" or "guaranteed protection" | Basis risk and resolution disputes; say "hedge" and show basis risk |
| "No Gemini account needed" or "no KYC" | Team decision Q3: never pitch this. |
| "Legal for US retail" or "works anywhere" | No guidance covers tokens wrapping regulated event contracts |
| Single-number market stats | Use ranges: Kalshi sports share 70-87%; Kalshi valued at $40B in its October round, reportedly in talks at $65B |

## Regulatory framing

- The CFTC has one commissioner (Michael Selig); its event-contract proposal's comment period closed Nov 18, 2026.
- Three federal appeals courts (Ninth, Sixth, Fourth) have let states regulate sports contracts; a Louisiana court blocked Kalshi, Polymarket and others on Nov 13.
- New York's AG is suing Gemini Titan (Apr 21, 2026), and the CFTC sued New York (Apr 24).
- Nothing lets a non-registered issuer or smart contract sell US retail a token whose value comes from regulated event contracts.

Safe framing for the submission, README and pitch:

- Testnet prototype using Gemini's public data and sandbox; no real money.
- Legs are economy, energy, weather and crypto only, never sports or politics.
- A real launch would run through a registered partner (Gemini's exchange and clearinghouse plus a futures broker), not a permissionless token sold to US retail.
- The README states backing, oracle or operator trust, and basis risk in plain words (the DeFi track requires it anyway).

## Pitch lines

```
1. Every prediction market sells parlays: all your legs win or you get nothing. A hedge should do the opposite. Weave pays you for each worry that comes true.
2. Kalshi and S&P say event indices are coming "one day". Blanket shows people want worry-to-hedge, but it stops at suggestions. We close the loop: describe a worry, own a basket, redeem in USDC.
3. Gemini earns under $1M a quarter from predictions and says it wants distribution and AI-agent access. Weave is that distribution layer, on Arc, where USDC is the gas and the collateral.
4. We built it for discrete, named risks - a rate hike, a fuel spike, a heat wave - not for sports.
```

## Judge Q&A

| Question | Answer |
|---|---|
| "Isn't Kalshi doing this with S&P?" | Those are S&P-designed benchmark indices with no product or date. Ours are user-built, pay per leg, and run on testnet today. |
| "Isn't this Blanket?" | Blanket recommends Kalshi markets and moves no money. We execute the basket and give the user a token they own and can redeem. |
| "Isn't this a parlay?" | The opposite. A parlay pays only if every leg hits, so pricing it needs the joint probability, which depends on correlation; that is why combos have their own order book. A basket pays each leg's weight, so its fair value is just the weighted sum of leg prices and the operator can replicate it exactly by buying each leg. |
| "Can I sell before it resolves?" | v1 holds to expiry. The token is a standard ERC-1155, so a secondary market can form; "sell back to the vault at mid minus 2%" is first on the roadmap. |
| "Are the Gemini contracts really in the basket?" | Not onchain: Gemini contracts are offchain. Prices come from Gemini's API, sandbox orders back the demo, and resolution is posted onchain. The README states that trust assumption. |
| "Is this legal?" | It is a testnet prototype with no real money and non-sports legs. A real launch would run through Gemini's exchange and clearinghouse with a futures broker. |
| "Who actually hedges with event contracts?" | Weather is the most traded category at IBKR's ForecastEx, and businesses already hedge on Kalshi. Our users have one specific, discrete risk. |
| "What about basis risk?" | The builder says how each contract differs from the user's real exposure and flags when no good leg exists. |
