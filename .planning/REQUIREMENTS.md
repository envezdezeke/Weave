# Requirements: Weave

**Defined:** 2026-11-18
**Core Value:** A user turns a worry into one USDC-priced hedge token built from real Gemini markets, buys it on Arc, and redeems it pro-rata after the real markets resolve. That loop must work end to end on camera.

Owners: **E** = Ezekiel (contracts, resolver, hedger). **C** = Cayden (data, frontend, AI builder, pitch).

## v1 Requirements

### Contracts (Arc testnet)

- [x] **CHAIN-01** (E): A buyer can mint basket tokens (ERC-1155) for USDC at the posted price, with a max-cost slippage guard.
- [x] **CHAIN-02** (E): A mint is refused when the posted price is stale, the basket is closed, or the vault would hold less than $1 per token.
- [x] **CHAIN-03** (E): The operator resolves each leg once, with an evidence string; a holder redeems for Σ weight of the legs that hit.
- [ ] **CHAIN-04** (E): The contract is deployed and verified on the Arc testnet explorer, and its address is in the README and the app.

### Operator service

- [ ] **OPS-01** (E): The operator posts each basket's price (Σ w·ask × 1.02 from live Gemini books) onchain on a schedule, so the price never goes stale during the demo.
- [ ] **OPS-02** (E): The operator creates the hourly Crash Cover basket each hour, choosing the strike just below spot.
- [ ] **OPS-03** (E): After a Gemini market resolves (resolutionSide), the operator posts the result onchain within a minute.
- [ ] **OPS-04** (E): Each mint triggers sandbox Gemini orders for w·tokens shares per leg; the fill or failure is recorded, and a failed hedge never blocks a mint.

### Data and pricing

- [ ] **DATA-01** (C): The app reads live Gemini events and books (public API), not the Nov 18 snapshot.
- [ ] **DATA-02** (C): A leg with no ask cannot be bought, and a leg with no bid is flagged as illiquid.
- [ ] **DATA-03** (C): Each basket shows the latest expiry of its legs (Q18).

### AI builder

- [ ] **AI-01** (C): The user enters a worry, their holdings/exposure, and the amount at risk.
- [ ] **AI-02** (C): An LLM picks legs only from the live candidate market list, with weights set from the stated exposure.
- [ ] **AI-03** (C): When nothing fits, the builder says so and shows near misses instead of forcing a basket.

### Frontend

- [ ] **UI-01** (C): The home page shows the two curated baskets: Crash Cover (1 hr, 70/30 BTC/ETH) and Recession Hedge.
- [ ] **UI-02** (C): The buy flow has the coverage slider, the price breakdown and a payout table ("how it pays").
- [ ] **UI-03** (C): Buy, redeem and send run real transactions against the deployed contract (no mocks).
- [ ] **UI-04** (C): A solvency gauge (from solvencyBps) and a hedge-coverage % are visible on each basket.
- [ ] **UI-05** (E+C): A user can pay with a Circle developer-controlled wallet; if that takes longer than 90 minutes to build, MetaMask instead.
- [ ] **UI-06** (C): The app is deployed to a public URL.

### Submission

- [ ] **SUB-01** (E): The README covers the architecture, economic design, risk assumptions (operator trust, basis risk, liquidity) and contract addresses.
- [ ] **SUB-02** (C): A 2-3 min demo video shows a Crash Cover basket resolving and paying out on camera, plus a recorded backup take.
- [ ] **SUB-03** (C): The Devpost entry is submitted by Fri Nov 20, 11 AM CST, entered for DeFi + Arc + Gemini.
- [ ] **SUB-04** (C): A 5-minute pitch with prepared answers to "isn't Kalshi doing this?" and "why not a combo?".

## v2 Requirements

- **NEXT-01**: Signed quotes instead of operator-posted prices.
- **NEXT-02**: Early sell-back before resolution.
- **NEXT-03**: Lending against basket tokens.
- **NEXT-04**: More curated baskets.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real money or Gemini mainnet trading | Rules and risk; sandbox only |
| Sports or politics baskets | Off-pitch (hedging, not betting) and regulatory risk |
| Trustless oracle | Gemini is centralized; operator trust is documented as a risk |
| AMM or secondary market | Not part of the demo loop |
| Permissionless basket creation | Curated + AI-built covers the story |
| "First", "trustless", "bet", "insurance", "no KYC" claims | Accuracy and regulatory wording |

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| CHAIN-01 | Phase 1 | Complete |
| CHAIN-02 | Phase 1 | Complete |
| CHAIN-03 | Phase 1 | Complete |
| CHAIN-04 | Phase 1 | Pending |
| OPS-01 | Phase 1 | Pending |
| OPS-02 | Phase 1 | Pending |
| OPS-03 | Phase 1 | Pending |
| OPS-04 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| UI-04 | Phase 1 | Pending |
| UI-05 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| AI-01 | Phase 2 | Pending |
| AI-02 | Phase 2 | Pending |
| AI-03 | Phase 2 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-06 | Phase 2 | Pending |
| SUB-01 | Phase 3 | Pending |
| SUB-02 | Phase 3 | Pending |
| SUB-03 | Phase 3 | Pending |
| SUB-04 | Phase 3 | Pending |

**Coverage:** 24 v1 requirements, 24 mapped, 0 unmapped ✓

---
*Requirements defined: 2026-11-18*
