# Architecture Research

**Domain:** Tokenized event-outcome baskets (onchain vault on Arc testnet, priced and resolved from off-chain Gemini prediction markets)
**Researched:** 2026-11-18
**Confidence:** MEDIUM-HIGH (contract and operator design: HIGH, it is standard escrow plus signed-quote patterns. Gemini public data: HIGH, live-verified today. Gemini sandbox trading and Arc tooling details: MEDIUM/LOW, see Gaps.)

## Findings That Change the Plan (read first)

Verified live against `api.gemini.com` and `api.sandbox.gemini.com` on 2026-11-18. These contradict or sharpen assumptions in PROJECT.md.

1. **No macro or politics markets are active.** Production has 1003 active events: Sports 811, Weather 98, Crypto 88, Commodities 6. No recession, Fed, CPI or election events right now. The "Recession Hedge" curated basket is not buildable from live data. Curated baskets must come from crypto (BTC/ETH/SOL/XRP/HYPE/ZEC), commodities (Brent, WTI, copper, silver, gold, natgas), weather (daily city highs) and sports. The AI builder must be allowed to answer "closest available hedge" or "no good match" honestly.
2. **Short-interval crypto markets exist and settle in seconds.** Series `BTC05M`, `ETH05M`, `SOL05M`, `XRP05M` (5-minute), `*15M`, `*1H`. A 5-minute event observed today had `expiryDate` 17:05:00Z and `resolvedAt` 17:05:05Z, so about 5 seconds of settlement lag. The on-camera payout does not need to wait for the 5 PM ET daily BTC market. Use 5M/15M legs for the live demo and keep daily BTC as the "curated basket" story. A categorical event such as "BTC price on November 18" holds up to 17 independent binary contracts, each with its own `strike` and its own resolution.
3. **Resolution data is machine-readable and per contract.** Settled contracts carry `status:"settled"`, `resolutionSide:"yes"|"no"`, `resolvedAt`, `settlementValue`, `marketState:"closed"`. `GET /v1/prediction-markets/events/recently-settled` only covers the last 24 hours, so poll `GET /events/{ticker}` for tracked events instead of relying on it.
4. **Sandbox is a separate, smaller universe.** Sandbox has 99 active events (crypto and commodities only, no sports or weather), with its own event and contract IDs (`268981` there vs `477479` in prod) and bot-simulated books. Prices and symbols will not match production one-to-one. Production public API is the source of truth for NAV and resolution. The sandbox hedge is best-effort, matched by (series, expiry, strike/label), never load-bearing for correctness.
5. **Arc USDC has two decimal systems.** Native gas USDC is 18 decimals. The ERC-20 interface at `0x3600000000000000000000000000000000000000` is 6 decimals. Use only the ERC-20 interface (never `msg.value`), and read `decimals()`. Testnet: chain ID `5042002`, RPC `https://rpc.testnet.arc.io`, explorer `https://explorer.testnet.arc.io`, finality under 1 second, 20 gwei `maxFeePerGas` floor, sends to `address(0)` revert.

## Standard Architecture

### System Overview

```
 USER BROWSER (Vercel, Next.js, no secrets)
 ┌─────────────────────────────────────────────────────────────────────┐
 │  Basket list / detail │ AI "worry" box │ Buy │ Portfolio │ Redeem    │
 │          wallet abstraction (viem; burner or injected)               │
 └───────┬───────────────────────┬───────────────────────────┬─────────┘
         │ HTTPS (REST/JSON)     │ JSON-RPC (reads+txs)      │
         ▼                       ▼                           │
 OPERATOR SERVICE (one Node process: Railway/Fly, or laptop+cloudflared)
 ┌──────────────────────────────────────────────────────┐    │
 │ API layer: /markets /baskets /build /quote /hedges    │    │
 │ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐│    │
 │ │ Gemini   │ │ Pricing + │ │ Quote    │ │ AI builder││    │
 │ │ client   │ │ basket    │ │ signer   │ │ (LLM +    ││    │
 │ │ (public) │ │ math      │ │ EIP-712  │ │ validator)││    │
 │ └────┬─────┘ └─────┬─────┘ └────┬─────┘ └─────┬─────┘│    │
 │ Workers (loops):                                      │    │
 │ ┌──────────────┐ ┌───────────────┐ ┌────────────────┐│    │
 │ │ Chain indexer│ │ Resolver      │ │ Hedger         ││    │
 │ │ (event logs) │ │ (Gemini→chain)│ │ (chain→Gemini  ││    │
 │ └──────┬───────┘ └───────┬───────┘ │  sandbox)      ││    │
 │        │                 │         └───────┬────────┘│    │
 └────────┼─────────────────┼─────────────────┼─────────┘    │
          │ viem            │ viem            │ HMAC REST     │
          ▼                 ▼                 ▼               │
 ┌──────────────────────────────────┐   ┌───────────────────────────┐
 │ ARC TESTNET                      │◄──┘ GEMINI                    │
 │ EventBasketVault (ERC-1155+escrow)│   │ prod public API (prices,  │
 │ USDC ERC-20 0x3600...0000        │   │   resolution) - no key    │
 └──────────────────────────────────┘   │ sandbox trading API (key) │
                                        └───────────────────────────┘
```

Trust boundary summary: the chain holds money and the claim rules. The operator holds three powers (sign price quotes, post leg resolutions, fund and withdraw reserve). Gemini is read-only truth for prices and outcomes. The browser holds nothing but a user key.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `EventBasketVault` (Solidity) | Basket registry (legs, weights, sides), USDC escrow, mint against signed quote, per-leg outcome registry, settlement math, redemption, solvency invariant | One OpenZeppelin ERC-1155 + EIP712 + ECDSA + Pausable contract, about 250 lines |
| `core` package (TS) | Shared basket math (NAV, payout, hedge sizes), Gemini types and client, ABI, constants | Plain TS library imported by operator and web |
| Gemini client | Fetch events/contracts, normalize prices, detect settled contracts, place sandbox orders | `fetch` for public; HMAC-signed requests for sandbox (or Gemini TS SDK) |
| Pricing engine | Per-basket NAV (mark) and mint price (cost to hedge plus fee) from live books | Pure function over Gemini snapshots, 5-10s server cache |
| Quote signer | EIP-712 quote binding (basket, buyer, max amount, price, deadline, nonce) | viem `signTypedData` with operator key |
| Chain indexer | Rebuild basket list, supplies, mint events, resolution state from logs | viem `getLogs` at startup plus `watchContractEvent`, in-memory cache |
| Resolver | For every basket with expired legs, poll Gemini, post `resolveLeg`, then `settle` | 15s loop, idempotent, plus manual CLI trigger |
| Hedger | On `Minted`, size and place sandbox orders; write hedge ledger | Event-driven loop, JSON file ledger; failures never block users |
| AI builder | Worry text to validated basket proposal (legs, weights, rationale, price preview) | LLM with structured output over a filtered candidate list, then server-side validation |
| Web app | Browse, build, buy, hold, redeem | Next.js app router, viem, polling; reads chain directly where possible |

## Recommended Project Structure

```
event-baskets/
├── contracts/                 # Foundry project
│   ├── src/EventBasketVault.sol
│   ├── test/Vault.t.sol       # mint/resolve/settle/redeem/solvency fuzz
│   └── script/Deploy.s.sol    # or a viem deploy script, see Pitfalls
├── packages/core/             # shared TS: basket math, gemini client, abi, types
│   └── fixtures/              # frozen Gemini JSON for offline dev and tests
├── apps/operator/             # Node service: API + workers (holds ALL secrets)
│   ├── api/                   # markets, baskets, build, quote, hedges
│   ├── workers/               # indexer.ts, resolver.ts, hedger.ts
│   ├── ai/                    # candidates.ts, prompt.ts, validate.ts
│   └── scripts/               # e2e-loop.ts, resolve-now.ts, seed-baskets.ts
├── apps/web/                  # Next.js: no secrets, NEXT_PUBLIC_* only
├── baskets/curated.json       # name, thesis, legs (symbol, side, weight)
└── README.md                  # architecture, economics, risks, addresses
```

### Structure Rationale

- **`packages/core` first:** basket math must be identical in the operator (quote), the web (preview) and the contract tests. One implementation, fixtures checked in.
- **One operator service, not Next.js route handlers plus a separate worker:** secrets (operator key, Gemini sandbox key, LLM key) live in exactly one place, the resolver and hedger need a long-lived process anyway, and Vercel serverless cannot run loops. The web app then needs zero secrets, which keeps the public repo and Vercel project clean. Ezekiel already runs this shape (local API plus cloudflared tunnel) for nabla, so the fallback to "laptop plus tunnel" is cheap.
- **Fixtures:** Gemini data changes by the minute and 5M markets vanish. Frozen JSON lets the contract, math and UI work proceed offline and keeps tests deterministic.

## Contract Design

### Decision 1: One ERC-1155 vault, not one ERC-20 per basket

| Option | Verdict |
|--------|---------|
| **ERC-1155, basket id = token id, inside the vault** (recommended) | One deployment, one address for the README, AI baskets are a registry write not a deployment, `balanceOfBatch` makes the portfolio view one call, no factory or clone logic |
| ERC-20 per basket via factory | Better wallet display and AMM composability, but needs a factory, clones, and per-basket address tracking. Composability is explicitly out of scope (no AMM). Every AI-built basket costs a contract deployment |

Fallback or "next step" story: an ERC-20 wrapper contract per basket that wraps ERC-1155 ids, buildable later without touching the vault. Say so in the README.

Unit convention: **1 share = 1,000,000 token units (6 decimals, aligned with USDC).** Frontend uses `formatUnits(amount, 6)` for both USDC and basket tokens.

### Decision 2: Payoff structure and the solvency invariant

A basket is N legs. Each leg i has: `legId = keccak256(instrumentSymbol)`, `weightBps_i`, and `sideYes_i` (true means the leg pays when the Gemini contract resolves YES, false means it pays on NO). Weights sum to exactly 10,000.

- Payout per share = Σ weight_i × hit_i, in [0, $1.00]. A hit means the resolved side equals the leg's chosen side.
- NAV per share (mark) = Σ weight_i × price_i(side). Each leg pays $1 or $0 per Gemini share, so a basket share is an ETF of event contracts with weights summing to 1.
- Because weights sum to 1, **max payout per share is always exactly $1.00.** This gives a clean collateral rule that mirrors Gemini's own ("every contract is backed by $1"): the vault must always hold USDC ≥ the sum of max liability over outstanding shares.

Who pays the gap? A buyer pays premium P = mint price < $1. The vault still needs $1 behind each share. The shortfall (1 − P) per share is the **operator reserve** (the operator's own capital, deposited as plain USDC). This is the "fully collateralized, premium is the cost" design:

- User risk: loses at most the premium paid.
- Operator risk: pays at most (1 − P) per share, bounded by `maxSupply`, and offsets it with the Gemini hedge (premium buys the real contracts; they pay $1 when the user's leg hits).
- Vault is never undercollateralized, so redemption cannot fail for lack of funds. This is enforced by code, not trust.

Accounting (all USDC micro-units, which equal basket token units, so no conversions):

```
liability  += amount                       at mint (max payout = 1 USDC/share)
require( usdc.balanceOf(vault) >= liability )   after the premium transfer-in
settle(b):  payoutBps_b = Σ w_i·hit_i ;  liability -= supply_b·(10000 - payoutBps_b)/10000
redeem:     pay = amount·payoutBps_b/10000 ; liability -= pay ; burn
withdrawExcess(x): require( x <= balance - liability ), operator only
```

If the operator under-funds the reserve, `mint` reverts. That is the safety property to demo and to document. Cap exposure with per-basket `maxSupply` (for example 100 shares, so the reserve to fund is about $100 of faucet USDC at worst).

### Decision 3: Price at mint, operator-signed EIP-712 quote (not a posted onchain price)

| Option | Pros | Cons |
|--------|------|------|
| **Signed quote** (recommended) | No per-basket price transactions. Price is fresh (60s deadline). Same code path serves curated and AI baskets. Binds buyer, max amount, nonce. Tight staleness control | EIP-712 plumbing (about 40 lines Solidity, `signTypedData` in viem) |
| Operator posts NAV onchain every N seconds | Dead simple to read, visible onchain NAV | Tx spam per basket, stale price window is an arbitrage hole against the operator, awkward for on-demand AI baskets |

Recommendation: signed quote. **Fallback if EIP-712 debugging eats more than about 2 hours:** `postPrice(basketId, priceMicro)` with a 60s staleness check. It is a 10-line swap, and the rest of the system (API shape, UI) is unchanged because the frontend only sees "price per share, valid until T".

```solidity
// Quote(uint256 basketId,address buyer,uint256 maxAmount,uint256 priceMicro,uint64 deadline,bytes32 nonce)
function mint(uint256 id, uint256 amount, uint256 priceMicro, uint64 deadline,
              bytes32 nonce, bytes calldata sig) external whenNotPaused {
    Basket storage b = baskets[id];
    require(block.timestamp <= deadline && block.timestamp < b.lastMintTime, "closed");
    require(!usedNonce[nonce] && priceMicro > 0 && priceMicro <= 1e6, "bad quote");
    require(_signer(id, msg.sender, amount, priceMicro, deadline, nonce, sig) == quoteSigner, "sig");
    usedNonce[nonce] = true;
    require(totalSupply(id) + amount <= b.maxSupply, "cap");
    uint256 cost = (amount * priceMicro + 1e6 - 1) / 1e6;     // round up, favors vault
    usdc.transferFrom(msg.sender, address(this), cost);
    liability += amount;
    require(usdc.balanceOf(address(this)) >= liability, "reserve");
    _mint(msg.sender, id, amount, "");
    emit Minted(id, msg.sender, amount, cost);
}
```

Also enforce `lastMintTime = min(leg expiry) - buffer` onchain (see Pitfalls: buying after the outcome is knowable).

### Decision 4: Resolution and payout accounting

- A global registry `mapping(bytes32 legId => Outcome)` with `Unresolved | Yes | No` (`Void` only if time allows). Legs are shared across baskets, so the operator resolves a leg once and every basket using it benefits.
- `resolveLeg(legId, yes, evidenceHash)` is `onlyResolver` and write-once (no overwriting). Emit `settlementValue` and `resolvedAt` from Gemini in the event or as an evidence hash for judges.
- `settle(basketId)` is permissionless: requires all legs resolved, computes `payoutBps`, releases excess liability. `redeem` calls `settle` lazily so users never get stuck waiting on a keeper.
- `redeem(id, amount)` burns and pays `amount × payoutBps / 10000` USDC (round down). Zero payout redeems are allowed (burns the token, pays 0) so the UI can show "resolved, did not hit".
- A basket only redeems after **all** legs are resolved. Constrain baskets at creation so legs expire within a tight window of each other (same series or same day). Mixed-horizon baskets stall until the last leg.
- Operator can `withdrawExcess` only down to `liability`, never into holders' funds.

### Basket creation

`createBasket(legIds[], weightBps[], sideYes[], lastMintTime, maxSupply, metadata)` is `onlyOperator`, maximum 8 legs, weights sum 10,000. Human-readable leg labels and the AI rationale go in the `BasketCreated` **event** as a JSON string (cheap, not stored). The indexer rebuilds the catalog from logs, so there is no database. AI baskets are created by the operator on user confirmation (rate-limited per IP and capped in count) rather than by the user, so users never pay for creation gas and cannot spam arbitrary legs.

### Roles

`owner` (deploy and pause), `quoteSigner`, `resolver`, `operator` (create baskets, withdraw excess). One EOA can hold all four in the demo, but keep them as separate checks in code; the README can then say "separable by design".

## Architectural Patterns

### Pattern 1: Chain as the database

**What:** Basket catalog, supplies, mints and resolutions are read from the vault's event logs plus view calls. The only off-chain state is the hedge ledger (rebuildable from Gemini sandbox order history, and non-critical).
**When to use:** Hackathon scope, one contract, low volume.
**Trade-offs:** No DB to deploy or migrate and judges can verify everything from the explorer. Needs `getLogs` range checks on the Arc RPC (unverified, see Gaps). Mitigate by starting the indexer from the deploy block and caching in memory.

### Pattern 2: Off-chain truth, onchain claim, trust made explicit

**What:** Gemini decides outcomes. The operator copies them onchain via a single write-once call with evidence attached. The contract does not pretend to verify them.
**When to use:** Any centralized-data tokenization without a real oracle.
**Trade-offs:** Operator can lie or go offline. Document it as a stated risk assumption (README, DeFi track requirement), add `pause`, and make resolution transparent (evidence in events, public Gemini source linked). A challenge window is a clear "next step", not v1.

### Pattern 3: The hedge is a side effect, never a precondition

**What:** Mint and redeem correctness depend only on the vault's reserve invariant. The Gemini sandbox hedge reacts to `Minted` events asynchronously.
**When to use:** Always here. Sandbox may lack the market, reject terms, or rate-limit.
**Trade-offs:** The "backed by Gemini" claim is a mirrored exposure plus a ledger, not a cryptographic guarantee. State this plainly.

### Pattern 4: LLM proposes, code disposes

**What:** The LLM only chooses from a closed candidate list and assigns weights and rationale. Code validates and prices everything.
**Trade-offs:** Less "magic", far fewer demo failures and no hallucinated markets or prices.

## Data Flow

### Mint (the buy path)

```
Browser: choose basket + amount
   │  POST /quote {basketId, amount, buyer}
   ▼
Operator: fresh Gemini prices ─► price = Σ w_i·ask_i(side) · (1+fee) ─► check every leg open and
          time-to-expiry > buffer ─► sign EIP-712 {price, deadline=now+60s, nonce}
   │  returns {priceMicro, cost, payoutIfHit, deadline, nonce, sig}
   ▼
Browser (viem): USDC.approve(vault, cost) ─► vault.mint(...)   (sub-second finality on Arc)
   ▼
Vault emits Minted ─► indexer updates UI state ─► hedger sizes + places sandbox orders (async)
```

Price source detail: use `prices.buy.yes` and `prices.buy.no` (cost to buy that outcome) for the mint price, because that is what the hedge costs. Use mid or `bestBid` for the displayed mark NAV. Tick and quantity increments are 0.01, so hedge shares per leg = `amount × weight` rounded to 0.01; the residual is covered by the fee. Contracts with empty `prices.buy` (settled or illiquid) must be excluded from the builder and blocked from quotes.

### Resolution and redeem

```
Resolver loop (15s):
  for basket with legs past expiry and unresolved:
      GET /events/{ticker}  ─► contract.status=="settled" && resolutionSide present ?
      yes ─► vault.resolveLeg(legId, side=="yes", hash(settlementValue,resolvedAt))
  for basket with all legs resolved and not settled: vault.settle(id)
UI: basket state Open ─► Closing (no mint) ─► Resolving ─► Redeemable ─► Redeemed
Holder: vault.redeem(id, amount) ─► USDC to wallet
```

Do not treat "expired" or `marketState:"closed"` as resolved. Wait for `status:"settled"` plus `resolutionSide`.

### AI basket builder

```
Worry text
  │ POST /build {worry}
  ▼
1. Universe: active events (paginate, 1003 total at limit 500), keep contracts with both
   buy prices present, expiry within horizon (default <= 24h, 5M/15M/1H and daily),
   category allowlist, enough volume. Compress to ~40-80 lines:
   "<instrumentSymbol> | <event title> | <label> | yes ask | expires"
2. LLM (structured output / tool call, enum of candidate symbols):
   {name, coverage:"good|partial|none", rationale, legs:[{symbol, side, weightBps, why}]}
3. Validate in code: symbols in candidate set, N<=6, weights sum 10000 (renormalize if off by rounding),
   no duplicate events, legs expire within the basket window, side in {yes,no}
4. Price in code from live Gemini data, never from the LLM:
   cost per share, payout if all hit, payout if one hits, "pay $X, get ~$Y if it happens"
5. Return preview. On user "Create & buy": operator createBasket tx ─► normal mint flow
```

The honest coverage field matters. With the current universe, "I'm worried about a recession" should return `partial` and propose commodity and crypto proxies, labelled as proxies, rather than inventing a link. Prompt caching and a small fast model keep latency under a few seconds; candidate lists are small.

### Frontend data flow

- **Catalog and detail:** `GET /baskets` from the operator (indexer data plus live NAV and per-leg odds), polled every 5-10s via SWR. The operator caches Gemini responses about 5s so many browsers do not multiply upstream calls (Gemini rate limits are unverified).
- **Holdings:** viem `balanceOfBatch` straight to the Arc RPC for the connected wallet, so the portfolio is trustless and needs no backend.
- **Buy:** quote from operator, then approve and mint from the browser.
- **Redeem:** pure chain call. Basket state is derived from `legOutcome` and `settled`.
- **Proof panel:** `GET /hedges/:basketId` shows sandbox order IDs and fills, plus explorer links to each onchain tx. Useful for the Gemini bounty and DeFi track judging.
- **Wallet seam:** hide wallet choice behind one `useWallet()` hook (burner key in localStorage with faucet drip for "invisible crypto", or an injected wallet). USDC is the gas token on Arc, so a single faucet balance covers both fees and purchases. Wallet product choice belongs to STACK.md; the architecture only requires viem-compatible signing.

## Build Order (dependencies and phase boundaries)

Dependency graph:

```
core (math+gemini client+fixtures) ─┬──────────────┐
                                    ▼              ▼
contracts + tests ─► deploy Arc ─► headless E2E ─► operator: quote+indexer ─► web: buy/portfolio
                         │                   │            │                      │
                         │                   │            ├─► resolver ──────────┤ (redeem demo)
                         │                   │            ├─► hedger (parallel, cuttable)
                         │                   │            └─► AI builder ─► web: build UI
                         └───────────────────┴──────────────────────────────────► README/demo
```

Critical path: contracts, deploy, resolver, web redeem. Everything else hangs off those. The headless E2E script is the keystone: it proves the Core Value loop with no UI and gives every later piece a stable ABI and live addresses.

| # | Phase (suggested boundary) | Contents | Unblocks | Est. |
|---|-----|----------|----------|------|
| 1 | **Onchain core and headless loop** | `core` math and Gemini client with fixtures. Vault with create, quote-mint, resolveLeg, settle, redeem, reserve invariant. Foundry tests including a solvency fuzz. Deploy to Arc testnet. `e2e-loop.ts`: create a basket of live 5M legs, mint, wait about 5 minutes, resolve, redeem | Everything | 8-10h |
| 2 | **Operator service** | API (`/baskets`, `/quote`), indexer, resolver worker with manual trigger, ledger. Seed 3-5 curated baskets from `curated.json` | Frontend, AI, hedger | 6-8h |
| 3 | **Frontend core loop** | Catalog, basket detail (legs with live odds, NAV, "pay X, get Y"), wallet, buy, portfolio, redeem states. Deploy to Vercel early | Demo, README screenshots | 8h |
| 4a | **AI builder** | Candidate filter, LLM structured output, validator, preview, create-and-buy flow, build UI | The "wow" | 6-8h |
| 4b | **Sandbox hedger** (parallel with 4a, independent) | Event-driven orders, leg mapping prod-to-sandbox, hedge ledger, proof panel | Gemini bounty credibility | 4-6h, cuttable |
| 5 | **Harden, docs, demo** | Mint cutoff buffer tests, pause, error states, README (architecture, economics, risks, addresses), explorer links, video, Devpost. Feature freeze Thu evening | Submission | 8h |

Parallelism for two people: one owns contracts and E2E (phase 1), the other owns `core`, Gemini client and fixtures, then the AI candidate pipeline (needs no chain). After phase 1, one takes operator plus hedger while the other takes web. Frontend can start against fixture JSON before the operator exists.

Cut order if time runs out: (1) hedger becomes a documented design plus a manual script, (2) AI builder becomes pre-baked prompts with fixed outputs, (3) ERC-20 wrapper and early-exit never. Never cut: resolve and redeem on a real settled market.

Demo reliability: run the live loop with 5M or 15M legs. Also keep one basket that already settled for real earlier (minted an hour before) so the "Redeemable" state can be shown immediately if a live window misbehaves. That is a real outcome, not a fake one.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Hackathon (under 100 users, under 20 baskets) | Everything above. In-memory index, JSON ledger, single operator EOA |
| 1k-100k users | Real indexer (subsquid or similar) and DB, quote service behind a queue, multi-leg hedge batching via Gemini batch orders, ERC-20 wrappers for composability |
| Beyond | Multisig or threshold operator, challenge window and dispute path for resolution, real Gemini-to-Arc reserve rebalancing (CCTP or Gateway addresses exist on Arc), permissionless basket creation with leg allowlists |

First bottleneck: Gemini public API polling (cache it). Second: `getLogs` full-range scans (checkpoint the indexer).

## Anti-Patterns

### Anti-Pattern 1: Letting the LLM supply prices or free-text symbols

**What people do:** Ask the model to "pick markets and say what they cost".
**Why it's wrong:** Hallucinated symbols, stale or invented odds, unpriceable baskets, broken demo.
**Do this instead:** Closed candidate list with symbol enum; server recomputes every number from live Gemini data.

### Anti-Pattern 2: Gating mint or redeem on the Gemini hedge

**What people do:** Mint only after the sandbox order fills.
**Why it's wrong:** Sandbox lacks most production markets and needs terms acceptance and a Trader-role key. One failure kills the core loop.
**Do this instead:** Reserve invariant protects holders; hedge is async best-effort with a visible ledger.

### Anti-Pattern 3: Minting until the last second

**What people do:** Keep a market buyable until expiry.
**Why it's wrong:** At 4:59:50 the outcome of a daily or 5M market is nearly known. A signed quote at stale odds is free money against the operator reserve.
**Do this instead:** `lastMintTime = min(expiry) − buffer` enforced onchain, quote refuses inside the buffer, short quote deadlines.

### Anti-Pattern 4: One ERC-20 deployment per AI basket

**What people do:** Factory-deploy a token per user request.
**Why it's wrong:** Deploy cost and latency, address sprawl, indexing work, and no benefit since there is no AMM.
**Do this instead:** One ERC-1155 vault, basket id is the token id.

### Anti-Pattern 5: Claiming a trustless oracle

**What people do:** Present operator resolution as decentralized.
**Why it's wrong:** DeFi-track judges read the README for risk assumptions. Overclaiming costs more than the disclosure.
**Do this instead:** State plainly: Gemini is the source, operator relays, evidence is emitted, pause exists, challenge window is future work.

### Anti-Pattern 6: Mixing the two USDC decimal systems

**What people do:** Use `msg.value` or 18 decimals because Arc gas is USDC.
**Why it's wrong:** Off by 10^12 on amounts. Native 18-decimal and ERC-20 6-decimal views differ.
**Do this instead:** Only the ERC-20 interface, `decimals()` read in code, no payable functions.

### Anti-Pattern 7: Treating sandbox as a mirror of production

**What people do:** Assume the same symbol exists in sandbox with similar price.
**Why it's wrong:** Different IDs, 99 vs 1003 events, no sports or weather, bot-driven books.
**Do this instead:** Production public API for truth; match legs to sandbox by (series, expiry, strike) and mark unmatched legs "unhedged" in the ledger and README.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Gemini prod public API | `GET /v1/prediction-markets/events?status=active&limit=500&offset=N`, `GET /events/{ticker}` | No key. Paginate (`pagination.total`). Prices as strings (`"0.92"`). Contract `instrumentSymbol` is the stable key. Rate limits unverified |
| Gemini sandbox trading | `POST https://api.sandbox.gemini.com/v1/prediction-markets/order` with `X-GEMINI-APIKEY`, `X-GEMINI-PAYLOAD` (base64 JSON with `request`, `nonce`), `X-GEMINI-SIGNATURE` (HMAC); body `{symbol, orderType:"limit", side:"buy", quantity, price, outcome:"yes"|"no", timeInForce:"good-til-cancel"}` | Key needs Trader role. Check terms status and accept terms before first order. NO-side leg means `outcome:"no"`, not a sell of YES. Response schema and sandbox PM availability unverified (see Gaps) |
| Arc testnet | viem custom chain: id 5042002, rpc `https://rpc.testnet.arc.io`; USDC `0x3600000000000000000000000000000000000000`; Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11` | Faucet `faucet.circle.com`. Sub-second finality, no confirmations loop needed. Gas floor 20 gwei |
| LLM API | Structured output with symbol enum | Keep key in operator only. Cache candidate prefix |
| Vercel | Static and edge frontend | Only `NEXT_PUBLIC_VAULT_ADDRESS`, `NEXT_PUBLIC_OPERATOR_URL`, RPC URL |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| web ↔ operator | REST/JSON, CORS locked to the web origin | Operator returns signed quotes; web never sees secrets |
| web ↔ chain | viem direct | Holdings, approve, mint, redeem |
| operator ↔ chain | viem (write: createBasket, resolveLeg, settle; read: logs) | One nonce-managed EOA, serialize txs through a queue to avoid nonce collisions |
| operator ↔ Gemini | prod: public fetch; sandbox: HMAC | Normalize into `core` types at the edge |
| contract ↔ operator | Events: `BasketCreated`, `Minted`, `LegResolved`, `Settled`, `Redeemed` | ABI shared via `packages/core` |

## Gaps to Verify in Phase Research

- **Sandbox prediction-market trading:** public sandbox events list works, but order placement, terms acceptance and key creation for sandbox PM were not verified; sandbox docs do not say PM is supported for trading. Spike this in phase 1 alongside the first onchain tx. If it fails, the hedge is simulated and disclosed, and the Gemini bounty still qualifies on public API usage.
- **Gemini status vocabulary:** observed `active`, `settled`, `open`, `closed`. Void/cancelled/halted states are undocumented in the fetched pages. Decide how `Void` is handled (v1 recommendation: not supported, operator pauses the basket).
- **Arc tooling on Windows:** Arc docs recommend "Arc Foundry" (`arc-forge`, `arc-cast`). Not verified whether stock `forge` suffices for build and test (likely yes) with deploy via a viem script. Spike early.
- **Arc RPC `getLogs` limits and USDC permit support:** unverified; affects indexer and whether approve plus mint can be one tx.
- **Rate limits** on Gemini public and sandbox APIs.
- **Combos:** Gemini `POST /combos` is a parlay-style product, not a weighted sum, so it does not replace this design. Not investigated further.

## Sources

- Live Gemini API calls, 2026-11-18: `GET api.gemini.com/v1/prediction-markets/events` (active list, categories, series, price and resolution fields), `.../events/recently-settled` (HIGH, primary data)
- `api.sandbox.gemini.com/v1/prediction-markets/events` live list (HIGH)
- Gemini docs: https://developer.gemini.com/prediction-markets/core-concepts.md, `.../collateral-return.md`, `.../trading-quickstart.md`, `.../rest-api/prediction-markets/order-management/place-order.md`, `.../get-started/sandbox.md`, index https://developer.gemini.com/llms.txt (MEDIUM: official, but schema pages were partially unrendered)
- Arc docs: https://docs.arc.io/, `.../arc/references/connect-to-arc.md`, `.../arc/references/contract-addresses.md` (MEDIUM-HIGH: official; re-check addresses before deploy)
- OpenZeppelin ERC-1155, EIP-712, ECDSA patterns (HIGH, standard, from training knowledge)

---
*Architecture research for: event-outcome basket tokens (Arc testnet, Gemini prediction markets)*
*Researched: 2026-11-18*

---
**Correction (2026-11-18, orchestrator):** Finding 1 is wrong. Macro and politics markets do exist. They are just absent from the unfiltered `events?status=active` list. When filtered by `category`: politics 19, economics 9 (Fed December, S&P/NASDAQ year-end), business 6, tech 3. A "Recession Hedge" basket is buildable.
