# Project Research Summary

**Project:** Event Baskets (working name)
**Domain:** Tokenized prediction-market outcome baskets (onchain hedging primitive) on Arc testnet, priced and resolved from Gemini Prediction Markets
**Researched:** 2026-11-18
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a collateralized escrow vault plus off-chain operator. The chain holds USDC and the claim rules. Gemini public data (no key) is the source of truth for prices and outcomes. A single operator service signs price quotes, relays resolutions onchain and, best-effort, mirrors exposure on Gemini sandbox. Experts build this as one ERC-1155 vault (basket id = token id) with fixed-weight legs that sum to 10,000 bps. Max payout is always exactly $1 per share, so the vault is fully collateralized: the buyer pays a premium and an operator-funded reserve covers the gap. Mint is gated by an EIP-712 signed quote and a mint cutoff before expiry. Resolution is write-once and expiry-gated, evidence is emitted in events, and redeem is pull-based. The AI builder follows "LLM proposes, code disposes": the LLM picks only from a validated candidate list and all prices are computed server-side.

The recommended approach is to prove the Core Value loop headlessly first (create basket, mint, resolve, redeem on a real settled market), then layer the operator service, frontend and AI builder, and treat the sandbox hedge as cuttable. The stack is Foundry v1.9.0 stock (Windows native; Arc Foundry has no Windows binary and WSL is not installed), Solidity 0.8.30 with OpenZeppelin 5.x, Next.js 16, viem 2.58 (ships `arcTestnet`), and Circle developer-controlled wallets as the primary "invisible crypto" path (Privy as fallback, wagmi injected as bring-your-own-wallet). The differentiator is the combination: Gemini-backed, AI-built from a worry, USDC mint/redeem on Arc, live-odds NAV. Prior art exists (PolyBaskets, Blanket, Offset), so never claim "first basket"; cite it.

Orchestrator-verified facts override conflicting research text:
1. Macro markets DO exist in production when filtered by category: politics 19, economics 9 (Fed December, S&P year-end), business 6, tech 3. They are absent from sandbox and none resolve before Dec 2026, so a "Recession Hedge" basket is buildable and priceable but is price-only (unhedgeable in sandbox, cannot pay out in the demo window). ARCHITECTURE.md Finding 1 is wrong; its bottom correction is authoritative.
2. Friday's 5 PM ET daily BTC market (22:00Z = 4 PM CST) resolves after the Devpost deadline (Fri 12:00 PM CST), so the on-camera payout must use a 5-minute or 15-minute crypto market (resolve about 5 seconds after expiry).

Key risks:
- Undercollateralized vault
- Stale-price mint attacks
- Toolchain, wallet or sandbox spikes failing late
- The single-clock demo
- Regulatory framing

Mitigations:
- The reserve invariant
- Signed quotes plus a mint cutoff
- Hour-one spikes
- A recorded early fallback take
- "Hedge" language, with no sports or politics baskets

## Key Findings

### Recommended Stack

Details in STACK.md.

Arc testnet:
- Chain ID 5042002, RPC `https://rpc.testnet.arc.io`.
- USDC ERC-20 at `0x3600000000000000000000000000000000000000` with 6 decimals. Native gas is 18 decimals, so never use `msg.value`.
- Gas floor is 20 gwei; set 25+ explicitly.
- `eth_getLogs` is capped at 10,000 blocks.

**Core technologies:**
- **Foundry stock v1.9.0** (Windows native) with Solidity 0.8.30, evm_version prague: compile, test, deploy and verify.
  - Hardhat 3 is the fallback if forge fails the hour-one spike.
  - Do not write fork tests against real USDC; use a 6-decimal MockUSDC.
- **OpenZeppelin 5.x:** ERC1155, EIP712, ECDSA, Pausable, ReentrancyGuard, SafeERC20. Match v5 constructor signatures.
- **Next.js 16 + React 19 + Tailwind 4 + viem 2.58 + TanStack Query + zod:** frontend and validation. Use viem's built-in `arcTestnet` with a `fallback` transport over several RPCs.
- **Circle developer-controlled wallets** (EOA, `ARC-TESTNET`): primary invisible-wallet path. Time-box 90 minutes, then Privy; wagmi injected as bring-your-own wallet.
- **Gemini:** public REST (plain fetch) for events, prices and resolution; public WS server-side only; `@gemini-markets/sdk` 0.1.1 only for signed sandbox orders in the hedger.

**Operator architecture conflict, resolved:** ARCHITECTURE.md recommends one long-lived Node operator service (secrets, resolver loop, hedger) rather than Next.js route handlers, because Vercel cannot run loops. STACK.md leans on route handlers for Circle and the LLM. Resolve in favor of ARCHITECTURE: one operator process (Railway/Fly or laptop + cloudflared) holds all secrets, and Vercel hosts a secret-free web app.

### Expected Features

Details in FEATURES.md.

**Must have (table stakes):**
- Vault + basket token + operator `resolve` + holder `redeem` (Core Value loop)
- 3-4 curated baskets with aligned expiries:
  - one same-day crypto basket (the demo)
  - one macro basket (priced, unresolved, tells the story; buildable per the correction)
  - one commodity or weather basket
- Live NAV and a "pay $X, get ~$Y if it happens" quote with payoff table; NO-side legs for downside hedges
- Wallet, buy, portfolio and redeem with receipt
- Resolution view with Gemini `resolutionSide`, `resolvedAt`, `settlementValue` and the terms link
- In-product risk disclosure, and a README covering economic design, solvency model, risk assumptions, addresses and Gemini endpoints used

**Should have (competitive):**
- Grounded AI basket builder from a free-text worry, with an honest coverage rating (good/partial/none)
- Verifiable resolution receipt (evidence hash plus link to the public Gemini endpoint)
- Basket vs Gemini combo (AND-only parlay) explainer using a real `/combos` response
- Operator sandbox hedge leg with hedge receipt (best-effort, P2)
- Target-payout slider and odds sparkline (only if time)

**Defer (v2+):**
- Rebalancing
- Secondary AMM
- Permissionless baskets
- Decentralized resolution
- Multi-venue legs
- Combos RFQ
- Sports baskets (also a regulatory risk)

### Architecture Approach

Details in ARCHITECTURE.md. Four principles:
- The chain is the database: event logs, no separate DB.
- Truth is off-chain, and the onchain trust assumptions are stated explicitly.
- The hedge is an async side effect that never gates mint or redeem.
- The LLM proposes, code disposes.

**Major components:**
1. **`EventBasketVault`** (ERC-1155 + escrow): basket registry, signed-quote mint, write-once leg outcomes, settle, redeem, solvency invariant `balance >= liability`, `maxSupply`, onchain `lastMintTime` cutoff. Roles (owner, quoteSigner, resolver, operator) are kept separate in code.
2. **`packages/core`** (TS): shared basket math, Gemini client and zod types, ABI, frozen fixtures for offline dev.
3. **Operator service:**
   - API: `/baskets`, `/quote`, `/build`, `/hedges`
   - Quote signer, chain indexer, hedger and AI builder
   - Resolver loop: every 15 s, idempotent, with a manual trigger
   - Fallback to `postPrice` with 60 s staleness if EIP-712 debugging exceeds about 2 hours
4. **Web app** (Next.js, no secrets):
   - Catalog, detail and buy pages
   - Portfolio via `balanceOfBatch`
   - Redeem state machine: Open, Closing, Resolving, Redeemable, Redeemed
   - Wallet seam behind one hook

### Critical Pitfalls

1. **Undercollateralized vault:**
   - Enforce `balance >= liability` at mint, backed by an operator-funded reserve.
   - Set a per-basket `maxSupply` and add a fuzz/invariant test.
   - Document the counterparty in the README.
2. **Stale or manipulable mint price:**
   - Gate mint with an EIP-712 signed quote: short deadline, nonce, and chainId/verifyingContract in the domain.
   - Add an onchain mint cutoff before the earliest expiry.
   - Quote at ask, never `lastTradePrice` (unusable).
   - Refuse quotes when any leg is not `open`.
3. **Demo clock risk:**
   - Use BTC05M/BTC15M for the on-camera payout; they run 24/7 with about 5 s settlement lag.
   - Record a clean run Thursday midday as a fallback, and keep tx hashes in the README.
   - Keep a disclosed replay mode as a last resort.
   - Run the resolver both automatically and manually, never on a sleeping laptop.
4. **Arc specifics:**
   - Use the ERC-20 interface only, with 6 decimals; no `payable` or `msg.value`.
   - Set explicit gas of 25+ gwei; transactions below 20 drop silently.
   - Avoid wide `getLogs` ranges.
   - Verify a trivial contract on Blockscout early.
5. **Operator trust and regulatory framing:**
   - Make resolve one-shot and expiry-gated, with evidence in events.
   - Never let the operator withdraw holder funds, and add a timeout refund/void path.
   - Never say "trustless", "bet" or "insurance"; remove "insurance you can trade" from user-facing copy.
   - No sports or politics baskets.

Sandbox is a thinner, separate universe (98 events, crypto and commodities only):
- NAV and quotes come from production; sandbox is hedge execution only, matched by (series, expiry, strike).
- Never call the unfiltered `/events` endpoint (9 MB, unstable paging). Query by `category` and `/events/{ticker}`, with a 3-5 s server cache (public limit 120/min).

## Implications for Roadmap

Time budget is about 50 hours, feature freeze Thursday evening, submit by 11 AM Friday. Critical path: spikes → contracts → deploy → resolver → web redeem.

### Phase 0: Environment and Spikes (Wed evening, 2-3h)
**Rationale:** Four unverified assumptions can each kill the plan, so resolve them before building. Faucet drips also need lead time.
**Delivers:**
- Stock forge deploys and verifies a trivial contract on Arc (confirms solc 0.8.30/prague and the gas flags).
- Gemini sandbox account, Trader key and accepted terms; one tiny order placed and cancelled on a sandbox BTC05M symbol, or else the paper-hedge decision.
- Circle Console wallet and one contract execution (90-minute cap, then Privy).
- Faucet quota check and multi-address drips toward the reserve.
- One observed daily BTC resolution, to measure its lag.
- `.gitignore` and `.env.example` before anything else.

### Phase 1: Onchain Core and Headless Loop (8-10h)
**Rationale:** The keystone. It proves the Core Value loop with no UI and gives every later piece a stable ABI and live addresses.
**Delivers:**
- `packages/core`: math, Gemini client, fixtures.
- Vault: createBasket, signed-quote mint, resolveLeg, settle, redeem, reserve invariant, mint cutoff, timeout refund/void, pause.
- Foundry tests, including solvency fuzz and cutoff reverts.
- Deploy to Arc with `deployments.json`.
- `e2e-loop.ts` on live 5M legs.

### Phase 2: Operator Service (6-8h)
**Rationale:** The frontend, AI builder and hedger all depend on quotes, the indexer and the resolver.
**Delivers:**
- API with a cached Gemini proxy (category and ticker queries, zod).
- Pricing engine: mint at ask, NAV at mid, flag illiquid legs.
- Quote signer, indexer, and auto plus manual resolver.
- 3-4 seeded curated baskets, including a macro price-only basket from production category queries.
- Reserve funding.

### Phase 3: Frontend Core Loop (about 8h)
**Rationale:** The demo surface. It can start against fixtures in parallel with Phase 2. Deploy to Vercel early.
**Delivers:**
- Catalog, plus a detail page with payoff table and "pay X, get Y".
- Wallet seam: Circle primary, injected fallback.
- Buy, portfolio, and the redeem state machine with receipt.
- Resolution proof panel and risk disclosure.
- UTC-derived local times, and tx timeout/retry UI.

### Phase 4a: AI Basket Builder (6-8h)
**Rationale:** The wow factor, independent of the hedger.
**Delivers:**
- Candidate filter, then structured LLM output with a symbol enum.
- Server-side validation and pricing, and an honest coverage rating.
- Create-and-buy flow.
- Curated fallback when the LLM is unset or times out.
- Basket vs combo explainer.

### Phase 4b: Sandbox Hedger (4-6h, parallel, cuttable)
**Rationale:** Adds bounty credibility and a backing story, but never gates mint or redeem.
**Delivers:**
- Event-driven sandbox orders and prod-to-sandbox leg mapping.
- Hedge ledger with reconciliation, and a proof panel.
- If the Phase 0 spike failed: a documented paper-hedge ledger, disclosed as such.

### Phase 5: Harden, Docs, Demo, Submit (about 8h, freeze Thu evening)
**Rationale:** The README is a judged DeFi requirement, and the video must be recorded from a real 5M/15M resolution.
**Delivers:**
- README: architecture, economics, solvency model, risk assumptions, addresses from `deployments.json`, endpoints used, prior-art citations.
- Verified contracts and a secret scan.
- `next build` plus a fresh-profile test on the Vercel URL.
- Recorded fallback take, and a 2-3 min video with an explorer tx.
- Devpost with all three tracks selected.
- 5-min pitch with prepared Q&A answers.

### Phase Ordering Rationale

- Contracts and the headless loop come first because everything hangs off the ABI and addresses. The spikes precede them because toolchain, wallet and sandbox failures are cheap to discover early and expensive late.
- The operator comes before frontend polish, but the frontend can run on fixtures in parallel. Suggested split:
  - Person 1: contracts and E2E, then operator and hedger.
  - Person 2: core, Gemini and fixtures, then web and AI.
- Cut order if late:
  1. Hedger becomes a documented design plus a manual script.
  2. AI builder becomes pre-baked prompts.
  3. Never cut resolve and redeem on a real settled market.
- P1 feature effort is about 38-52h against about 50h available, so there is no slack and scope discipline is the main risk.

### Research Flags

Need deeper research during planning:
- **Phase 0:** the spikes are the research (stock forge on Arc, sandbox PM order fills, Circle entity-secret flow, faucet quota, browser WS Origin).
- **Phase 1:** EIP-712 signed-quote mint and Arc-specific USDC behaviour on real testnet (solc/evm target unverified).
- **Phase 4b:** sandbox prediction-market trading and leg mapping are unverified.

Standard patterns (skip research):
- **Phase 2:** public Gemini API shapes verified live; standard Node service patterns.
- **Phase 3:** standard Next.js + viem; only the wallet seam needs the Phase 0 result.
- **Phase 4a:** established LLM-over-closed-candidate-list pattern.
- **Phase 5:** checklist-driven.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Chain parameters, package versions and Gemini REST/WS verified live. Unverified: stock forge on Arc, solc/prague fit, Circle contract-execution args, sandbox PM fills. |
| Features | MEDIUM-HIGH | Gemini facts verified live. Competitor landscape is from secondary sources. Devpost wording is unconfirmed (403). |
| Architecture | MEDIUM-HIGH | Standard vault and operator patterns. Finding 1 was wrong and is corrected. Sandbox trading and Arc getLogs/permit are unverified. |
| Pitfalls | MEDIUM-HIGH | Gemini/Arc behaviour verified live. Regulatory and faucet claims are from secondary sources. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Sandbox PM order placement and fills:**
  - Phase 0 spike; if it fails, ask at the Thu 7-8 PM CST Gemini session.
  - Fallback is a disclosed paper hedge. The bounty is satisfied by public API usage regardless.
- **Stock forge/solc target on Arc:** first-hour deploy; fallback is Hardhat 3.
- **Circle dev-controlled wallet flow and funding:** 90-minute cap, then Privy. The contract-execution argument shapes need confirming against Circle docs.
- **Faucet amount and rate limit:**
  - Sources conflict (10-20 USDC), so check the faucet page.
  - Size the reserve and demo amounts to match: about $1-5 baskets, `maxSupply` about 100.
- **Daily-ladder resolution lag:** only measured for 5-minute markets, so observe a daily resolution during Phase 0.
- **Void/cancelled/halted Gemini statuses are undocumented:** v1 treats them as unsupported, pauses the basket, and relies on the timeout refund path.
- **Macro baskets:**
  - Price-only and unhedgeable in sandbox; they resolve after Dec 2026.
  - Liquidity is thin (for example, no bid on Recession), so the mark policy must flag illiquid legs.
- **Correlated legs in daily ladders:** contracts are non-exclusive thresholds, so do not present payoff-table probabilities as independent without a caveat.
- **Gemini rate limits:** public 120/min per PITFALLS, unverified elsewhere. Use a single cached proxy.

## Sources

### Primary (HIGH confidence)
- **Live calls 2026-11-18:**
  - Gemini prod and sandbox: `/v1/prediction-markets/events`, `/events/{ticker}`, `/events/recently-settled`, `/categories`, `/combos`, public WS bookTicker
  - Arc RPC: `eth_chainId`, `eth_gasPrice`, `eth_call decimals()`, Blockscout stats
  - GitHub release asset lists (Foundry v1.9.0, arc-foundry v0.8.0-4) and npm registry versions
- **Arc docs (docs.arc.io):** connect-to-arc, contract-addresses, evm-differences, gas-and-fees, rpc-endpoints, deploy-on-arc, install-arc-foundry
- **Gemini docs (developer.gemini.com):** core-concepts, trading-quickstart, authentication/api-key, sandbox, order-lifecycle, OpenAPI spec, combo-contracts overview
- **Circle docs:** wallets supported-blockchains

### Secondary (MEDIUM confidence)
- PolyBaskets, Blanket and Offset
- Kalshi/Polymarket combos coverage and Index Coop retrospectives
- prediction.com index explainer
- Arc HackMoney 2026 winners and judging criteria
- Regulatory reporting on the April 2026 NY AG suit against Gemini Titan and Coinbase, and the CFTC counter-suit

### Tertiary (LOW confidence)
- Faucet quota claims (eco.com guide vs Circle console docs)
- `.io` RPC DNS flakiness and Privy chain-switch anecdotes
- Unofficial Hardhat-on-Arc config
- arc-node issue 210 on Blockscout verification
- Vercel Hobby cron limits
- Nexus/Etherisc latency claims
- Self-published Prediction Market Index Protocol

---
*Research completed: 2026-11-18*
*Ready for roadmap: yes*
