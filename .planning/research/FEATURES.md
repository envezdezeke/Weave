# Feature Research

**Domain:** Tokenized baskets of prediction-market outcomes (hedging primitive), Gemini-backed, USDC on Arc testnet
**Researched:** 2026-11-18
**Confidence:** MEDIUM-HIGH overall. HIGH for Gemini API facts (read live from the public API today). MEDIUM for competitor landscape (web search, several self-published or secondary sources). LOW for Nexus/Etherisc UX details (low-quality sources only).

## Headline Findings (read these first)

1. **"Event baskets" are not unique as a concept; the specific combination still is.** PolyBaskets (Vara chain, Polymarket outcomes, weighted baskets in basis points, launched April 2026, 2 GitHub stars) and a self-published "Prediction Market Index Protocol" (Polymarket events bundled into an index token) already exist. AI "worry to hedge" tools also exist for Kalshi and Polymarket (Blanket, Offset, PolyHedge concept). Nobody found combines: Gemini-backed + AI-built from a worry + USDC mint/redeem on Arc + live-odds NAV. Claim the combination, never "first basket." Cite PolyBaskets in the README as prior art; judges who know it will respect that, and judges who do not will not catch a false "first" claim.
2. **Gemini already has combos (parlays), and they are a different product.** A combo is AND-only: pays $1 only if all 2-6 legs hit. A basket pays pro rata per leg that hits. This contrast is a pitch line and a one-screen explainer feature, not a thing to build on.
3. **The live Gemini universe constrains which baskets can resolve during the demo.** Short-dated markets (5-min, 15-min, hourly and daily crypto, daily commodity, daily weather highs) resolve within hours and the contract object exposes `resolutionSide`, `resolvedAt` and `settlementValue` (a 5-min ETH market resolved about 5 seconds after expiry). The macro markets that make the best story ("Recession this year?", "Fed decision in December", S&P year-end ladder) resolve in Dec 2026 to Feb 2027, so they can be shown priced and bought but not paid out on camera.
4. **Liquidity is thin and one-sided in the markets that matter for hedging.** Daily BTC event: ~$26K volume, ~3c average spread. "Recession this year?": no bid, 4c ask, $121K volume. 5-min BTC: $3 volume. This drives the pricing, NAV and sandbox-hedge design (see Pitfalls hand-off notes).
5. **Judges in this event reward "crypto invisible + real loop + honest risk docs."** Arc team's stated criteria from the previous HackMoney Arc track: technical execution, product utility, integration quality; they highlight invisible settlement and real business problems. The DeFi track here explicitly requires economic design, risk assumptions and contract addresses in the README.

## Gemini API: what is exposed and which feature each field powers

All verified live on 2026-11-18 against `https://api.gemini.com/v1/prediction-markets/*` (no key). HIGH confidence.

| Gemini surface | What it returns | Feature it powers |
|---|---|---|
| `GET /events?status=active&category=&search=&limit=&offset=` | Events with `title`, `category`, `subcategory.path`, `tags`, `series`, `volume`, `volume24h`, `volumeDelta24hPct`, `expiryDate`, `effectiveDate`, `type` (binary or categorical), `source`/`sourceDetails` (resolution index, e.g. Lukka for crypto), `termsLink`, `imageUrl`, nested `contracts` | Candidate-market universe for the AI builder, curated basket definitions, market cards, filter by expiry to guarantee same-day resolution |
| Contract object | `instrumentSymbol` (e.g. `GEMI-BTC2611182200-HI61750`), `prices.bestBid/bestAsk`, `prices.buy.yes/no`, `prices.sell.yes/no`, `strike {type: above/below/reference, value}`, `marketState`, `priceIncrement 0.01`, `quantityMinimum 0.01`, rules text in `description` | NAV and quote math, both YES and NO sides (hedges are often NO on an "above" strike), liquidity filter (drop contracts with no bid), plain-English rule display |
| Resolution fields (on settled events, `GET /events/recently-settled`) | `status: settled`, `resolvedAt`, per-contract `resolutionSide: yes/no`, `settlementValue`, event-level `settlement.value` | Operator `resolve()` input and the public "proof" shown with each redemption; fully verifiable by anyone with no key |
| `GET /events/{ticker}/strike`, `GET /events/upcoming`, `/newly-listed` | Strike value; approved-but-not-yet-live events (e.g. a ZEC market with status `approved`) | "New markets" shelf; possible demo-safety net (pre-find the next 5-min market) |
| `GET /categories` | Live, Sports, Midterms, Crypto, College Football, Commodities, Economics, Economy, Fun/Culture, Media, Politics, Tech, Business, Weather, Culture, Other, Finance | Category chips and curated-basket grouping. Note only Sports, Crypto, Weather, Commodities have unfiltered-list prominence; Economics (9), Politics (19), Business (6), Tech (3), Midterms (3) show up only when filtered by category. Economy, Finance, Media returned 0 active |
| `GET /volume/{date}` and `/volume/{date}/hourly` | Volume by category path | "Where is the money" chip or liquidity sparkline; low value, cheap |
| `GET /combos`, `GET /combos/{instrumentSymbol}`, `POST /combos` | 2-6 legs, each with required outcome Yes/No, own orderbook, ticker `GEMI-CMB-{MMYY}-{HASH12}`, AND settlement. 121 combos listed today, all Sports | "Basket vs parlay" explainer and a Gemini-bounty credibility signal. Not the engine. `POST` needs auth |
| Combos RFQ (beta, sealed-bid auction, WebSocket, makers need eligible account) | Custom multi-leg quotes | Skip. Out of reach in 48h and not in sandbox per docs |
| WebSocket (live prices and depth) | Streaming book | Optional "live" NAV tick; polling every 5-10s is enough for a demo |
| Authenticated: `POST /order`, batch orders, cancel, `GET /positions`, `/positions/settled`; sandbox `api.sandbox.gemini.com` | Order placement, fills, settled positions | Operator hedge leg (mirror basket exposure), "hedge receipt" panel |

**Market inventory that matters (observed 2026-11-18):**

| Theme | Markets (expiry) | Resolves in demo window? |
|---|---|---|
| Macro | Recession this year? (2027-02-01, 1 contract), Fed decision in December (2026-12-11, 5 buckets), S&P close end 2026 (27 buckets), S&P high/low this year, NASDAQ-100 year-end, unemployment high 2026, US GDP 2026, Strait of Hormuz traffic normal (2027-01-02, $196K volume) | No |
| Crypto | BTC/ETH/SOL/XRP/HYPE/ZEC 5-min, 15-min, hourly and daily-at-5pm-ET ladders (strike types above/below/reference) | Yes (minutes to hours) |
| Commodities | Brent, WTI, copper, silver, gold, natural gas daily | Yes (daily 5pm ET) |
| Weather | ~98 "Highest temperature in {city} on {date}" events | Yes (daily) |
| Politics, Business, Tech | 2028 nominees, crypto market-structure bill, Best AI end of 2026, Stripe IPO, etc. | No |
| Sports | ~810 events, many resolving in days | Some; off-theme for hedging |

## Feature Landscape

Complexity key (48-hour, 2-person, new to crypto, AI-assisted): **S** = under 2h, **M** = 2-6h, **L** = 6-12h, **XL** = over 12h. Estimates assume Foundry/Hardhat scaffolding exists and viem + Next.js are in use.

### Table Stakes (Users Expect These)

Missing any of these makes the product feel like a mock-up. Sources: Polymarket/Kalshi/Gemini consumer UX, ETF/index-token norms (Set Protocol, Index Coop), insurance-like payout clarity (Etherisc).

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Basket catalog page (3-5 curated baskets) with plain-English thesis, legs, weights, expiry | Every index token (DPI, Index Coop) and every prediction-market site has a browse view with a clear composition | M | Seed from Gemini events by `instrumentSymbol`. Recommend 4: one macro (Recession/Fed/S&P/unemployment/Hormuz, resolves months out, shows the story), one crypto-drawdown (same-day, demo), one commodity/energy shock, one weather (consumer-relatable, same-day). See MVP section |
| Live NAV / price per basket token from Gemini odds | Core value. ETF-like products always show NAV | M | NAV = sum(weight_i x mark_i). Choose mark policy explicitly: price to buy at ask-side, display value at bid-side or mid (document it). Cache server-side, poll 5-10s |
| "Pay $X, get ~$Y if it happens" quote | This is the one number users read first (Polymarket "to win", Etherisc premium vs payout) | S | Max payout per $ = 1 / basket price on all-legs-hit, plus per-leg breakdown ("if BTC drops below $60K you receive $Z") |
| Buy basket with USDC (approve + mint, or single-step) | The product | L | Vault `mint(basketId, usdcAmount)`; ERC-20 or ERC-1155 token per basket. Arc gas is USDC, so one balance. Handle USDC 6-decimals vs Arc native gas decimals carefully |
| Wallet connect or embedded wallet; testnet faucet guidance | Any onchain app | M | MetaMask/RainbowKit path is fastest and most reliable. Circle Wallets/email onboarding is nicer for "crypto invisible" but is a risk item. Pick MetaMask path first, treat embedded as stretch |
| Portfolio / "My baskets" view: balance, current value, status (live, resolved, redeemable) | Kalshi/Polymarket portfolio tab | M | Read token balances via viem multicall, join with NAV |
| Resolution status per leg and per basket, with link to the Gemini rule text and `termsLink` | Prediction-market users check what resolves it. Insurance users check the trigger | M | Pull `resolutionSide`, `resolvedAt` from Gemini; show terms PDF link; show settlement source (e.g. Lukka index) |
| Operator-posted resolution onchain, then redeem for USDC | Core loop; Etherisc auto-pays on oracle data, Nexus pays after claims vote | L | `resolve(basketId, legOutcomes[], proofHash)` by operator role; `redeem(basketId, amount)` pays `amount x sum(w_i x outcome_i)` in USDC. Show the Gemini `settlementValue` and event ticker in the tx data or event log |
| Claim/redeem button and receipt (tx hash, explorer link, amount) | Users need confirmation money moved | S | Arc explorer link; "You received $Y" |
| Clear risk and trust disclosure in-product (operator-resolved, testnet, not insurance, not financial advice) | DeFi track README requirement; also regulatory prudence | S | One modal plus README section. Say "hedge," not "insurance" |
| Loading, error and empty states (no wallet, no USDC, market closed, market has no bid) | Demo robustness | M | Especially "no quote available" when a leg has no liquidity |
| Deployed URL and published contract addresses | Devpost and DeFi track checklist | S | Vercel plus Arc testnet explorer links in README |

### Differentiators (Competitive Advantage)

Aligned to Core Value in PROJECT.md: the full worry to AI basket to buy to resolve to redeem loop.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI basket builder from a free-text worry** (grounded: LLM chooses only from a retrieved candidate set of live Gemini contracts) | Nobody combines worry-to-hedge with a tokenized, redeemable basket. Blanket, Offset and PolyHedge stop at suggesting markets on Kalshi/Polymarket | L | Pipeline: LLM extracts risk themes and search terms, backend queries `/events?search=` and `?category=` (filter: active, has bid/ask, expiry window, volume floor), LLM picks 2-8 contracts plus rationale, server computes weights and validates (weights sum 100%, symbols exist, prices fresh). Never let the LLM emit prices or tickers that were not in the candidate list |
| **Hedge preview as a payoff table** ("if X, Y, Z happen you get $A, $B, $C; if none, you lose your $premium") | Turns odds into a risk story. The quant background is a real edge here. Sets this apart from a bag of Polymarket bets | M | Scenario table of per-leg outcomes with payout and a max-loss line. Add a single "implied probability of at least one leg hitting" assuming independence, labeled as an estimate |
| **Honest "no good hedge" and basis-risk warnings** | Blanket explicitly flags mismatched or missing hedges. Honesty reads as maturity to judges and builds trust vs. pretend coverage | S | LLM returns a `coverage` rating (strong/partial/weak) and one-line mismatch note per leg; UI shows it. If fewer than 2 viable contracts, say so |
| **Weighting that targets a payout, not just probability** ("I want $500 if it happens") | Insurance-style framing differentiates from ETF-style exposure. Etherisc sells on payout vs premium | M | Given target payout T, compute notional so cost = sum(ask x qty). Slider for budget or target |
| **Basket vs parlay explainer** ("Gemini combos pay only if ALL legs hit; this pays for each leg that hits") | Pre-empts the judge question "isn't this just a Gemini combo?" and shows we know the Gemini API deeply (bounty) | S | Static panel plus an example computed from a real combo from `GET /combos` |
| **Operator hedge leg on Gemini sandbox** with a "hedge receipt" (order ids, fills) | Makes the onchain token actually backed, answering the DeFi judge's "what backs this?" Gemini bounty explicitly wants real API use | L | Authenticated `POST /order` on `api.sandbox.gemini.com` per mint (or batched). Needs sandbox keys and sandbox markets; confirm sandbox lists the same instruments (unverified, see gaps). Decouple from the mint tx: async worker, status shown as "hedged / pending" |
| **Verifiable resolution receipt** (Gemini event ticker, `resolvedAt`, `settlementValue`, rules `termsLink` stored or logged with `resolve()`) | Shrinks the operator-trust gap without building an oracle. Anyone can reproduce from the public API | S | Emit event with `keccak(JSON of Gemini resolution payload)` and show a "Verify" link that hits the Gemini public endpoint |
| **Same-day live demo basket** that resolves on camera | Real payout rather than a mock; strongest demo moment | M (mostly curation) | Daily BTC (5pm ET) plus ETH/SOL/commodity daily legs share one expiry. Pre-mint before filming; keep a 5-min/15-min market as backup |
| **Reverse-side hedge direction** (buy NO on "above" strikes, or "below" strikes) | Hedging against a drop needs "below"/NO exposure. Gemini contracts are YES-space with `prices.buy.no` | S | Legs carry `side: yes/no`; NAV and payout use the correct side. Required for a "Crypto Winter" basket to make sense |
| Live odds history sparkline per basket | Reads like a real fund tracker | M | Needs stored snapshots or Gemini history endpoint (not found in docs read). Store our own snapshots on poll. Defer |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Rebalancing / dynamic weights after mint | ETF analogy; Set/Index Coop do it | Index Coop's own post-mortem lists rebalancing cost, slippage, NAV decay and maintenance burden as why composite products were curtailed. Impossible to do well in 48h | Fixed-weight, fixed-maturity baskets (like a unit trust). State this as a design choice in the README |
| Secondary-market AMM / trading of basket tokens | "Insurance you can trade" | Liquidity bootstrapping, pricing-vs-NAV arbitrage, plus ERC-20 pool contracts. Already out of scope in PROJECT.md | Show "transferable ERC-20" and quote NAV; optionally mention AMM as roadmap |
| Permissionless user-created basket minting | "Anyone can make a basket" | Griefing with illiquid or ambiguous markets, security review, and the operator then hedges junk. Out of scope per PROJECT.md | AI-built baskets are private quotes assembled from an allowlist of liquid contracts; only operator-published baskets are mintable |
| Trustless oracle / decentralized resolution (UMA-style, multisig vote) | DeFi purists | Gemini is centralized; any oracle just re-posts a Gemini value. Nexus Mutual-style voting claims take 7+ days (low-confidence source) | Operator-posted resolution plus verifiable receipt plus clear trust disclosure |
| Real-money Gemini mainnet trading or real USDC | "Make it real" | Rules and risk. Sandbox and testnet only | Sandbox hedge with labeled "testnet" banners |
| Selling/pricing as "insurance" or "coverage" | Marketing appeal | Regulatory wording, and basket pays on events not on losses incurred (basis risk). Parametric products carry precisely this basis-risk caveat | "Hedge" language, show basis-risk warning |
| Using Gemini combos as the basket engine | Seems like a shortcut | Combos are AND-only (all legs must hit), sports-only today, own thin orderbook, 2-6 legs, `POST` needs auth; the payoff is the opposite of a hedge basket | Basket = independent legs with pro-rata payouts; use combos only in the explainer |
| Multi-chain / cross-chain bridging UI | Arc teams commonly do this (56% of HackMoney Arc submissions) | Treated as baseline there but is a time sink for us; no differentiation for a primitive | Single chain, USDC-only |
| Fancy social features (leaderboards, sharing baskets, comments) | Consumer polish | Not on the core loop | One share-link of a basket quote if time remains |
| Voice or ElevenLabs layer | Sponsor bounty | Must be core to qualify; not core here | Skip |
| Continuous streaming NAV via WebSocket on the client | "Live" feel | Browser WS auth/reconnect complexity for no judging value | Server-side polling every 5-10s, refresh button |
| Sports baskets as hero product | Sports are 810 of ~1000 events | Off-theme for "hedge your worry"; combos already own this space | Keep out of curated set; AI may see them but filter by category |

## Feature Dependencies

```
Gemini market fetch + normalization
    ├──requires──> Curated basket definitions (symbols, weights, side)
    │                  └──requires──> NAV/quote engine (mark policy, fresh prices, no-bid handling)
    │                                     └──requires──> Basket catalog UI + "pay $X get $Y" quote
    └──requires──> AI basket builder (candidate retrieval -> LLM pick -> server validation)
                       └──requires──> NAV/quote engine
                       └──requires──> Operator-published basket on chain (so an AI basket is mintable)

Vault + basket token contracts (Arc)
    ├──requires──> USDC approve/mint flow in UI (wallet connect)
    │                  └──requires──> Portfolio view
    └──requires──> Resolve() (operator) ──requires──> Gemini resolution fields (resolutionSide, resolvedAt)
                       └──requires──> Redeem() + receipt UI
                                         └──requires──> Vault is funded with enough USDC to pay

Operator hedge leg (Gemini sandbox) ──enhances──> Vault solvency story (not required for the contract to work)
Verifiable resolution receipt ──enhances──> Resolve()
Basket vs parlay explainer ──enhances──> Gemini bounty narrative (independent, uses /combos read-only)
Rebalancing ──conflicts──> fixed-weight vault accounting (do not combine)
AMM secondary market ──conflicts──> 48h scope (do not combine with vault MVP)
```

### Dependency Notes

- **Redeem requires solvency:** a fixed-weight basket pays `sum(w_i x outcome_i)` per token, max payout 1 USDC per token if all legs hit. The vault must hold enough to cover worst case or limit supply. In testnet the operator can pre-fund. State the solvency model in the README (max liability = tokens outstanding x max payout). This is the most important contract-level design item to settle before coding.
- **Mismatched expiries break one-shot redemption:** require all legs of a basket to resolve by one basket expiry (or allow partial redemption). Simplest: basket has a single `expiry` = latest leg expiry and a `resolve` that requires all legs posted. Curate baskets with aligned expiries; the AI builder should filter candidates by an expiry window.
- **NAV depends on a mark policy:** one-sided books (no bid) cannot be marked at mid. Decide one rule (ask for buy, bid-or-zero for display, flag illiquid legs) before building UI.
- **AI builder requires operator-published baskets:** an AI-built basket must be registered onchain by the operator (or a signed quote the vault accepts) before purchase. Cheapest is `createBasket` by operator on demand, with the user's purchase happening in the next transaction. Do not build permissionless creation.
- **Hedge leg enhances but does not gate the demo loop:** if sandbox access or instruments fail, the loop must still run with the vault self-funded.

## MVP Definition

### Launch With (v1: what the Thursday feature freeze must contain)

- [ ] Vault + basket token + operator `resolve` + holder `redeem` on Arc testnet — the Core Value loop (L)
- [ ] 3 curated baskets: one same-day crypto/commodity basket (the demo), one macro basket (story, priced but unresolved), one weather or energy basket — (M)
- [ ] NAV and "pay $X, get ~$Y" quote with payoff table — (M)
- [ ] AI basket builder with grounded retrieval and server-side validation, outputs a mintable operator-published basket — (L)
- [ ] Wallet connect, buy, portfolio, redeem with receipt — (L)
- [ ] Resolution view with Gemini fields (`resolutionSide`, `resolvedAt`, `settlementValue`, terms link) and a verifiable receipt event — (M)
- [ ] Trust and risk disclosure plus README (economic design, solvency model, risk assumptions, contract addresses, Gemini endpoints used) — (M)
- [ ] Basket vs parlay explainer using a real `/combos` response — (S)

### Add After Validation (v1.x: only if v1 is solid Thursday afternoon)

- [ ] Operator hedge leg on Gemini sandbox plus hedge receipt panel — add once the core loop works, because sandbox access is a risk item. Trigger: sandbox keys available and sandbox lists the target instruments
- [ ] Target-payout slider ("I want $500 if it happens")
- [ ] Odds history sparkline from stored snapshots
- [ ] Embedded wallet / email onboarding via Circle for "crypto invisible" framing

### Future Consideration (v2+: README roadmap only)

- [ ] Secondary-market AMM for basket tokens — liquidity and pricing work
- [ ] Permissionless custom baskets with liquidity and ambiguity screening
- [ ] Multi-venue legs (Kalshi, Polymarket) and cross-venue best-price routing
- [ ] Decentralized resolution or attestation (e.g., oracle attesting to Gemini resolution)
- [ ] Combos RFQ integration for correlated multi-leg payoffs

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Vault + token + resolve + redeem | HIGH | HIGH | P1 |
| Same-day demo basket (aligned expiries) | HIGH | LOW | P1 |
| Basket catalog + NAV + quote | HIGH | MEDIUM | P1 |
| Wallet, buy, portfolio, redeem receipt | HIGH | HIGH | P1 |
| AI basket builder (grounded) | HIGH | HIGH | P1 |
| Payoff preview table | HIGH | MEDIUM | P1 |
| Resolution view and verifiable receipt | MEDIUM | LOW | P1 |
| Risk disclosure and README economic design | HIGH (judging) | LOW | P1 |
| NO-side/below legs | HIGH (needed for hedges) | LOW | P1 |
| Basket vs parlay explainer | MEDIUM | LOW | P2 |
| Basis-risk / "no good hedge" honesty | MEDIUM | LOW | P2 |
| Operator hedge leg on Gemini sandbox | HIGH (bounty, backing) | HIGH | P2 |
| Target-payout slider | MEDIUM | MEDIUM | P2 |
| Embedded wallet (Circle) | MEDIUM | HIGH | P2 |
| Odds sparkline | LOW | MEDIUM | P3 |
| Secondary AMM | MEDIUM | HIGH | P3 |
| Rebalancing | LOW | HIGH | Do not build |

**Priority key:** P1 must have for launch; P2 should have if time allows; P3 future.

**Rough effort total for P1:** about 38-52 hours of focused work for two people with AI help, which fits ~50h only with parallel tracks (contracts and Gemini-fetch/NAV on one side, UI and AI builder on the other) and no slack. That is the main scoping risk; the P2 hedge leg is the first thing to cut or fake-honestly (log intended sandbox orders and label as such) if contracts slip.

## Competitor / Prior Art Feature Analysis

| Feature | Polymarket / Kalshi | Gemini Predictions | PolyBaskets (Vara) | Set / Index Coop | Nexus Mutual / Etherisc | Blanket / Offset / PolyHedge | Our Approach |
|---------|---------------------|--------------------|---------------------|------------------|-------------------------|------------------------------|--------------|
| Browse by category, odds as probability | Yes | Yes (categories, watchlists, tournament tab) | Polymarket markets via agent | n/a | n/a | Suggest markets | Reuse Gemini categories and `search` |
| Single-market buy/sell | Yes (orderbook, outcome tokens on Polymarket) | Yes (order book, $0.01 ticks) | Bet via program | n/a | n/a | Offset can execute on Kalshi via chat | Not our product; baskets only |
| Multi-leg product | Parlays/combos (Kalshi RFQ, Polymarket Aug 2026); AND-only, sports-heavy | Combo contracts AND-only 2-6 legs, own orderbook; custom combos via RFQ beta | Weighted basket, at least 2 markets, weights in bps summing to 10,000 | Index tokens with managed weights, quarterly rebalance | n/a | Not baskets | Weighted independent legs, pro-rata payout, fixed weights, no rebalance |
| Hedge-oriented framing | None (speculation) | None | Not described | n/a | Yes: payout on a defined trigger | Yes (Blanket plain-language to Kalshi contracts, can say "no suitable market"; Offset reads brokerage portfolio) | AI from worry plus payoff preview plus honest basis-risk |
| Tokenized position | Polymarket: ERC-1155 outcome tokens; Kalshi via DFlow on Solana | No (off-chain) | Onchain program on Vara | ERC-20 basket tokens | Cover is NFT-like/ policy; Etherisc policy NFTs | No | ERC-20 basket token minted for USDC on Arc |
| Settlement/payout | Platform resolves; auto payout | Auto settlement; resolution fields visible via API | "Claim payout" | Redeem for underlying | Etherisc oracle-triggered automatic; Nexus claims voted, reported 7+ day latency (LOW confidence source) | n/a | Operator posts outcomes onchain, holder redeems; verifiable receipt |
| Index/composite view | Kalshi Political Power Index (May 2026, reference gauge, not tradable) | None found | Basket value | NAV | n/a | n/a | Basket NAV from live odds; tradable-by-mint |
| ETF/fund wrapper | None | None | None | Core product | n/a | n/a | As of the Aug 2026 PredictionHunt/prediction.com article, no ETF holds prediction-market positions |

**Gap in prior art we occupy:** onchain redeemable hedge basket, Gemini-sourced, AI-assembled from a worry, USDC-native. **Gap we do not occupy:** anything with deep liquidity or decentralized resolution.

## What Judges Will Want (DeFi track, Arc award, Gemini bounty)

**DeFi & Onchain Apps ($2,000 main track).** Requirement from BRIEF.md: interacts with smart contracts; README explains economic design and risk assumptions and lists contract addresses. Evidence of what scores: Arc's own judging criteria (technical execution, product utility, integration quality) and their stated love of "invisible settlement" and real business problems.
- Show: a deployed vault with verified addresses, a worked solvency calculation (max liability vs funded USDC), explicit trust assumptions (operator resolves, Gemini is centralized, thin liquidity), and the on-camera payout.
- A new financial primitive is rarer than payroll/escrow apps. In the HackMoney Arc write-up most projects were "familiar workflows on stablecoin rails rather than new financial primitives." Lean on that: pitch the primitive.
- Judge questions to pre-answer in README and pitch: What backs a token? (vault USDC plus operator sandbox hedge, with the honest note that sandbox is not real money). What if the operator lies? (verifiable receipts from a public API, dispute window on the roadmap). What if a leg has no liquidity? (illiquid legs excluded or flagged). Why not a Gemini combo? (AND-only, opposite payoff). Why would anyone prefer this to buying the contracts directly? (one-click diversification, the AI mapping from worry to contracts, a single redeemable token).

**Arc chain award ($1,000).** Use USDC as gas (no separate gas token), show Arc explorer links, document the Arc-specific choices (USDC decimals, gas in USDC, fast finality). Circle Wallets / Gateway usage would add "integration quality" but is optional given time.

**Gemini Prediction Markets bounty ($2,500 / $1,000 / $500; 1st place also gets a finalist slot).** Requirement: uses the Gemini PM API. To stand out, show breadth beyond a single endpoint: events with category and `search`, contract `strike` types and `expiryDate`, bid/ask for NAV, `volume` for liquidity filtering, resolution fields for redemption, `/combos` for the explainer, sandbox orders for the hedge leg, and optionally recently-settled for a "past baskets" shelf. List every endpoint used in the README with what it powers.

## Sources

- Gemini Prediction Markets API (live responses read 2026-11-18; HIGH confidence): `GET https://api.gemini.com/v1/prediction-markets/{events, categories, combos, events/recently-settled, events/upcoming, volume/{date}, events/{ticker}/strike}`
- Gemini docs index: https://developer.gemini.com/llms.txt (HIGH)
- Gemini combo contracts overview (AND-only, 2-6 legs, own orderbook, ticker format): https://developer.gemini.com/prediction-markets/combo-contracts/overview.md (HIGH)
- Gemini Combos RFQ overview (sealed-bid auction, beta, last-look): https://developer.gemini.com/prediction-markets/combos-rfq/overview.md (HIGH)
- Gemini core concepts (events, contracts in YES space, $1 payout): https://developer.gemini.com/prediction-markets/core-concepts.md (HIGH)
- Gemini World Cup post introducing combo contracts: https://www.gemini.com/blog/trade-the-world-cup-introducing-combo-contracts-team-watchlists-and-a-new-tournament-tab (MEDIUM; launch rules differ between sources, newer docs show Yes/No legs and 2-6 legs)
- Gemini self-certifies parlays (CDC Gaming): https://cdcgaming.com/brief/gemini-is-latest-prediction-market-operator-to-self-certify-parlays/ (MEDIUM)
- Gemini Custom Combos RFQ beta: https://cryptobriefing.com/gemini-custom-combos-rfq-api-beta/ (MEDIUM)
- Polymarket multi-leg contracts: https://www.legalsportsreport.com/264161/polymarket-adds-multi-leg-contracts-as-it-chases-kalshi-sportsbooks/ ; Kalshi combos and RFQ summary via https://casinobeats.com/2026/08/18/polymarket-launching-parlays-in-us-as-kalshi-looks-to-cash-in-on-combos/ (MEDIUM; sources disagree on dates and leg limits)
- PolyBaskets (existing basket product, Vara chain): https://skills.sh/adityaakr/polybaskets/polybaskets-overview (MEDIUM; skill listing only, settlement and trust model not described)
- Prediction Market Index Protocol (Polymarket event index token): https://2312312.pages.dev (LOW; self-published, unverified)
- Prediction market indices explained (Kalshi Political Power Index, no ETF as of Aug 2026): https://prediction.com/blog/prediction-market-indices-explained (MEDIUM)
- Blanket (AI to Kalshi hedges for small businesses): https://www.crowdfundinsider.com/2026/08/295675-new-ai-tool-blanket-supported-by-kalshi-aims-to-help-small-businesses-manage-everyday-risks-via-prediction-markets/ (MEDIUM; summarized from search snippet, page itself returned 403)
- Offset (AI hedging bot on Kalshi): https://github.com/navil2468/Offset (MEDIUM)
- PolyHedge concept, Polymarket Edge, AutoHedge PM: via the same web search results (LOW; project write-ups and idea pages, not verified as live)
- Kalshi tokenization via DFlow, Skywalk prediction token standard, Goldsky tokenization explainer: https://pond.dflow.net/prediction-markets/introduction , https://skywalk.gitbook.io/skywalk-docs/prediction-token-standard , https://goldsky.com/blog/how-prediction-markets-work-part-2-tokenization-and-market-types (MEDIUM)
- Index Coop / Set Protocol lessons (composite products curtailed, rebalancing costs, NAV decay): https://gov.indexcoop.com/t/update-on-composite-index-products/4261 ; https://gov.indexcoop.com/t/set-engineering-retrospective-and-changelog/2388 ; https://www.wintermute.com/insights/research/defi-research/the-landscape-of-on-chain-etfs (MEDIUM)
- Nexus Mutual / Etherisc parametric insurance (claims voting latency, oracle-triggered payout): vendor blog results (chainscorelabs, hackernoon) (LOW; sources conflict, treat claims as unverified)
- Arc track winners and judging criteria (HackMoney 2026): https://www.arc.io/blog/meet-the-arc-track-winners-from-the-hackmoney-2026-hackathon-and-what-we-learned (MEDIUM-HIGH)
- Project briefs: `C:\Users\ezeki\hack\UBC\BRIEF.md`, `C:\Users\ezeki\hack\UBC\.planning\PROJECT.md`

## Open Questions / Gaps for Later Phases

- **Sandbox coverage unverified:** whether `api.sandbox.gemini.com` lists the same instruments (daily BTC ladder, 5-min markets, macro) and whether sandbox contracts resolve. Needs a one-hour spike with sandbox keys before committing to the hedge leg.
- **Gemini price history endpoint:** not found in the docs read; sparkline likely needs our own snapshots.
- **Devpost page returned 403:** the exact Gemini bounty and DeFi track judging wording beyond BRIEF.md is unconfirmed. Ask in the Thursday 7-8 PM Gemini support session.
- **Basket-token standard choice** (one ERC-20 per basket vs one ERC-1155) and the solvency model are architecture decisions for ARCHITECTURE.md, flagged here because they gate redeem, the portfolio view, and the whole demo loop.
- **Demo-day liquidity:** the same-day markets are thin (daily BTC ~$26K volume; 5-min markets near zero). Pricing at ask with no real hedge is fine on testnet, but the README should say the NAV is indicative.

---
*Feature research for: tokenized prediction-market outcome baskets (hedging primitive)*
*Researched: 2026-11-18*
