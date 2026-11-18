# Grilling Decisions (2026-11-18)

These decisions came out of the /grilling session. All were accepted by the user.

| # | Decision | Detail |
|---|---|---|
| Q1 | Hero user | Small business or individual with one specific risk. Demo persona: a crypto-paid freelancer or merchant afraid of a BTC/ETH drop. A café hedging weather is the second example. DeFi treasuries and DAOs go under "next". |
| Q2 | What backs a token | Both. An onchain USDC reserve guarantees the payout, and a Gemini sandbox hedge (promoted to core) offsets operator risk, with real order IDs. If the sandbox spike fails, say honestly: "priced by Gemini, settled by our vault". |
| Q3 | Why not buy on Gemini directly | Lead with a one-click multi-leg hedge (AI picks and weights) and a pro-rata payoff (not an all-or-nothing combo). Composable onchain token as support. Never pitch "no Gemini account / no KYC". Tagline: **"Weave your worries into one hedge."** |
| Q4 | Demo basket | "BTC/ETH Crash Cover (15 min)": 2-3 BTC/ETH 15-minute downside legs (No on "above" strikes), resolved live, plus a recorded backup take. Voiceover: "same mechanism, any horizon", then cut to a priced, unresolved Recession Hedge. |
| Q5 | Scope trims | Circle wallets time-boxed to 90 min, then MetaMask. Posted price with a staleness check instead of EIP-712 signed quotes (signed quotes listed as next). 2 curated baskets plus the AI builder. The freed time goes to the hedge. |
| Q6 | Hedge sizing | An input for the amount at risk plus a 10-100% coverage slider. The app computes shares, cost and max payout ("cover $500 of a $2,000 loss for $38"). |
| Q7 | Gemini environments | Production prices and resolves every basket. Sandbox is for the hedge only. A hedge record shows the price gap per trade. |
| Q8 | Economics | Mint price = weighted Gemini ask + 2% fee. The fee and any leftover after settlement return to the operator reserve. Live solvency gauge (vault balance ÷ max liability) in the UI. |
| Q9 | Composability proof | A standard ERC-1155 transfer shown on the explorer (10 s video beat). Lending against baskets goes under "next". |
| Q10 | Name | **Weave** (repo renamed to envezdezeke/Weave). |
| Q11 | Team split | Ezekiel: contracts, Arc deploy, resolver, Gemini hedger. Teammate: Gemini data, frontend, AI builder, README, video, and owns the pitch from Thursday afternoon. Shared `packages/core` holds the math and types; the two halves meet at the operator API. |
| Q12 | Early exit | Hold to expiry for v1. "Sell back to vault at mid − 2%" is listed first under next steps. Q&A answer: standard tokens allow a secondary market. |
| Q13 | Hedge fill failure | The mint still succeeds, and the hedge record marks the trade "unhedged" and retries. A visible hedge-coverage % sits beside the solvency gauge. The reserve always guarantees payout. |
| Q14 | No-match worries | The AI says plainly that no good hedge exists, shows near-misses with a coverage rating, and suggests a curated basket. One such query appears in the video (5 s). |

## Pricing model (answer to "how do we price a basket?")

A basket share pays `Σ wᵢ · 1{leg i hits}` with Σ wᵢ = 1, so the max payout is $1.

- **Fair value = Σ wᵢ · pᵢ.** Expectation is linear, so this holds whatever the correlation between legs. No joint probabilities are needed.
- **Mint price** = Σ wᵢ · askᵢ (the cost to replicate) × 1.02 fee. For No-side legs, use the No ask.
- **NAV mark** = Σ wᵢ · midᵢ. Flag a leg as illiquid if it has no bid. Never use `lastTradePrice`.
- **Static replication:** per basket share, the operator buys wᵢ shares of each leg. The hedge matches the payoff exactly, and this is the core reason the product is pro-rata.
- **Contrast with Gemini combos (parlays):** a combo pays only if all legs hit, so its price needs the *joint* probability, which depends on correlation. That is why combos have their own order book. This is the Q&A answer to "why not a combo?"
- **Correlation still matters for the payout distribution** (e.g. P(payout ≥ $0.80)). The payoff table shows scenarios, not probabilities that assume independent legs.

Worked example, Crash Cover: 50% BTC-No @ 0.30, 30% ETH-No @ 0.25, 20% SOL-No @ 0.40 → 0.305 → $0.311 with fee, max $1.00.
