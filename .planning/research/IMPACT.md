# Impact and Incumbent Research

**Researched:** 2026-11-18 (web search). **Confidence:** MEDIUM. Most adoption claims come from the companies themselves; there is little independent data.

## Does hedging with prediction markets bring real value?

**Hedging demand is real, but so far it comes mostly from businesses and is small next to speculation.**

- Sports is about 70-85% of Kalshi volume (Dune via SGI Europe; Sacra; VIP-Grinders, Aug 2026). In one April 2026 week, economics was about 0.2% of Kalshi volume (DeFi Rate).
- Counterpoint: politics, elections and economics hold about 2.5x the *open interest* of sports on Kalshi (Keyrock/Dune). Weather contracts show high hold-to-expiry ratios, which suggests hedgers rather than flippers.
- Real business hedges have been reported:
  - an LA restaurant group's $60k Kalshi hedge (Fortune, Oct 2026)
  - a kayak operator hedging rain and an ice-cream shop hedging cold days (Business Insurance)
  - Kalshi's CEO cites "thousands of businesses" and a $50k hedge that paid $500k (anecdote, company-sourced)
- Institutions:
  - Clear Street and Marex are opening Kalshi access to hedge funds, and Marex is exploring hedging its own exposures.
  - Kalshi claims institutional volume grew 800% in 6 months (company figure).
- Academic: a July 2026 SSRN paper (Kirillov, Maastricht) finds prediction markets can be useful, narrowly targeted hedges for **small retail positions exposed to discrete, hard-to-trade events**. This is simulated, not observed.
- Known limits:
  - **Basis risk:** the contract wording diverges from the real exposure.
  - **Thin liquidity:** the markets most useful for hedging are the thinnest.
  - **Capital lockup:** long-dated contracts tie up money.
  - **Unclear tax treatment.**
  - **Retail loses on average:** about 2.9 unprofitable users per profitable one, per one commentary.

**Verdict:** this is not a mass-retail daily habit today. The credible users are small businesses and individuals with a specific, discrete exposure. Hedging is a small but fast-growing slice, with incumbents and institutions investing in it now.

## Why haven't Kalshi or Polymarket done it?

**They are starting to. The gap is narrower than it looked.**

| Incumbent move | What it is | What it is not |
|---|---|---|
| **Kalshi × S&P Dow Jones Indices** (announced 2026-10-26) | Multi-year deal to build indices from Kalshi event-contract prices (economics, politics, sports) | Still in planning, with no tradable product yet. These are benchmarks first. |
| **Blanket** (Aug 2026, external, "powered by Kalshi") | AI that turns a business worry into suggested Kalshi markets, with "near misses" where nothing fits | It **does not execute trades** or move money. It's discovery only, with no basket and no user numbers. |
| **Kalshi Combos** (Dec 2025) and **Polymarket US Combos** (2-10 legs) | Bundles of event contracts, now one of Kalshi's biggest products | All-or-nothing **parlays**, which are speculative. A basket pays pro-rata per leg, which is how a hedge should behave. |
| **PolyBaskets** (Vara chain, 2026) | Weighted baskets of Polymarket markets, aimed at humans and AI agents | Speculation and agent competitions, not hedging. No traction data. |

Why it took this long, from the sources:
1. **Regulation.** Every new contract structure is a CFTC listing question. Kalshi is fighting state lawsuits (Louisiana suit filed 2026-10-23; two appeals courts sided with the states), and senators sent letters in Oct 2026. A basket is a new product type, which means more approval risk.
2. **Incentives.** Sports parlays drive volume and revenue, while hedging is a small niche today.
3. **Liquidity.** Hedge-relevant markets are thin. Bundling thin legs makes pricing and market-making harder.
4. **Basis risk and resolution disputes.** Contract wording mismatches make "insurance-like" marketing legally risky.

## What this means for us

- **It validates the direction.** The largest regulated player is moving toward indices and worry-to-hedge tools, so the idea isn't a fringe feature.
- **We can't claim to be first.** Judges may ask "isn't Kalshi doing this?" Prepared answer: "Blanket proves people want worry-to-hedge but stops at suggestions. Kalshi and S&P prove baskets are coming but are benchmarks still in planning. Combos are all-or-nothing parlays. We close the loop: one token that you buy in one click, that pays pro-rata like a hedge, and that lives onchain so other DeFi apps can use it."
- **Our real edges:**
  - Execution, not just discovery.
  - A pro-rata payoff instead of an all-or-nothing parlay.
  - A composable onchain token that DeFi protocols can hold, lend against or build on. Kalshi positions can't leave Kalshi.
  - Small ticket sizes ($1-5).
- **Target user:** pitch small businesses and individuals with a specific, discrete risk. "Everyone, daily" isn't credible.
- **Risk to the pitch:** if judges value consumer reach above all, the niche-today reality weakens the impact score. Counter with growth (S&P deal, 800% institutional growth claim, open interest).

## Sources
- [Wealthsimple: hedge macro risk](https://www.wealthsimple.com/en-ca/learn/prediction-markets-hedge-macro-risk)
- [Business Insurance: prediction markets in risk transfer](https://www.businessinsurance.com/prediction-markets-gain-role-in-risk-transfer/)
- [SSRN: Kirillov, Prediction Markets as Event Hedges](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7185158)
- [Fintech Brainfood: consumer protection](https://www.fintechbrainfood.com/p/better-markets)
- [Fortune: Kalshi × Blanket](https://fortune.com/2026/08/07/exclusive-kalshi-blanket-small-business-hedge-hypergamblification/)
- [Fortune: LA restaurant $60k hedge](https://fortune.com/2026/10/19/prediction-markets-insurance-risk-management-kalshi-dodgers-world-series/)
- [DeFi Rate: Blanket](https://defirate.com/news/blanket-kalshi-prediction-market-small-businesses/)
- [S&P DJI press release, 2026-10-26](https://press.spglobal.com/2026-10-26-S-P-Dow-Jones-Indices-and-Kalshi-Announce-Collaboration-to-Bring-the-Worlds-Most-Trusted-Benchmarks-to-Prediction-Markets)
- [Crypto Briefing: S&P DJI × Kalshi](https://cryptobriefing.com/sp-dow-jones-indices-kalshi-prediction-market-indices/)
- [Hedgeweek: prime brokers and Kalshi](https://hedgeweek.com/news/prime-brokers-prepare-to-offer-hedge-funds-access-to-kalshi-prediction-markets)
- [Kalshi $1B raise](https://news.kalshi.com/p/kalshi-raises-1-billion-22-billion-valuation-institutional-demand-surges)
- [CNBC: Kalshi $40B valuation](https://www.cnbc.com/2026/10/29/kalshi-40-billion-valuation-funding-round.html)
- [SGI Europe: Kalshi booms on sports](https://www.sgieurope.com/technology/kalshi-booms-on-sports/121847.article)
- [Pew: volume driven by sports](https://www.pewresearch.org/short-reads/2026/09/23/prediction-markets-trading-volume-doubled-between-may-and-july-largely-driven-by-sports/)
- [DeFi Rate: Kalshi record week, parlays](https://defirate.com/news/kalshi-posts-record-3-9b-volume-extends-lead-over-polymarket-parlays-surge/)
- [Covers: combos explained](https://www.covers.com/betting/prediction-sites/guides/prediction-market-combos-explained)
- [PolyBaskets](https://polybaskets.xyz/)
- [CryptoSlate: corporate hedgers and payout disputes](https://cryptoslate.com/prediction-markets-can-hedge-corporate-losses-who-decides-if-they-pay-out/)
- [Galaxy: risk managing prediction markets](https://www.galaxy.com/insights/perspectives/risk-managing-prediction-markets)
