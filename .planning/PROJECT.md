# Weave

## What This Is

Tokenized baskets of real-world event outcomes on Arc testnet, backed by Gemini prediction-market contracts. A user either picks a curated basket (e.g. "Recession Hedge", "Crypto Winter") or types a real-life worry, and an AI assembles a hedge basket from matching Gemini markets. They buy the basket token with USDC. The token's value tracks live Gemini odds, and when the events resolve it redeems for USDC onchain. Each basket works like an ETF of events: "Weave your worries into one hedge."

## Core Value

The full loop must work end to end in the demo: worry → AI basket → buy with USDC on Arc → a real Gemini market resolves → the holder redeems for USDC payout onchain.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Smart contracts on Arc testnet: a basket token plus a vault that mints for USDC and redeems after resolution
- [ ] Basket price/NAV derived from live Gemini prediction-market odds (public API, no key)
- [ ] 3-5 curated themed baskets
- [ ] AI basket builder: free-text worry → LLM selects matching Gemini markets and weights → shows "pay $X, get ~$Y if it happens"
- [ ] Resolution and redemption: the operator posts outcomes onchain, and holders redeem for USDC
- [ ] Operator mirrors basket exposure on Gemini sandbox (hedge leg; real orders in sandbox only)
- [ ] Web frontend (Next.js), deployed URL, crypto mostly invisible (USDC-only, no separate gas token)
- [ ] Demo uses a short-dated real market (daily BTC price market, resolves 5 PM ET) so the payout happens on camera
- [ ] README: architecture, economic design, risk assumptions, contract addresses (DeFi track + Arc award requirements)
- [ ] 2-3 min demo video, Devpost submission, 5-min pitch draft

### Out of Scope

- Real money / Gemini mainnet trading — rules and risk; sandbox only
- User-created custom baskets (permissionless minting UI) — too much scope for 50h; curated + AI-built covers the story
- Trustless oracle / decentralized resolution — Gemini is centralized; we document operator trust as a risk assumption instead
- Secondary-market AMM for basket tokens — nice to have, not core to the demo loop
- Solana — chose Arc (USDC gas, Solidity speed)

## Context

- UBC 2026 Hackathon. Brief in `BRIEF.md`. Team of 2, Ezekiel (quant background: built and won with a factor-model portfolio API, nabla) plus a teammate; both are new to crypto and build with AI help.
- Gemini Prediction Markets public API verified working 2026-11-18: events carry contracts with `prices.bestBid/bestAsk`, `instrumentSymbol`, `expiryDate`, `strike`. Daily BTC price markets exist.
- Gemini runs off-chain, so the onchain leg (Arc) holds USDC and tokens while an operator mirrors positions on Gemini sandbox.
- Uniqueness: most teams will likely build trading agents or odds oracles. A basket of event outcomes as a hedging primitive is the differentiator.

## Constraints

- **Timeline**: Devpost due Fri 2026-11-20 12:00 PM CST (target 11:00 AM); in-person closing Sat 2026-11-21 — ~50 hours total
- **Tracks**: Main = DeFi & Onchain Apps; Chain = Arc; Bounty = Gemini Prediction Markets — README must meet all three
- **Chain**: Arc testnet, testnet USDC from faucet.circle.com
- **Security**: no keys committed; `.env` gitignored; sandbox-only trading
- **Tech stack**: Next.js + Tailwind (Vercel), Solidity (Foundry or Hardhat), viem, an LLM API for the basket builder

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Outcome baskets over trading-agent/oracle ideas | Unique vs. likely crowded ideas; combines a new primitive with real hedging | — Pending |
| DeFi track + Arc + Gemini bounty | New financial primitive with smart contracts; prizes stack | — Pending |
| Curated baskets + AI-built from a worry | Curated is reliable for the demo; AI adds the wow and UX | — Pending |
| Demo on daily BTC market resolution | Real resolution on camera, no faked outcome | — Pending |
| Operator-trusted resolution | Gemini is off-chain; honest risk disclosure beats a fake oracle | — Pending |
| Grilling round (Q1-Q11), see research/DECISIONS-GRILLING.md | Hero user, reserve + hedge backing, pricing, sizing, scope trims, team split | — Pending |
| Basket price = Σ w·ask × 1.02, NAV = Σ w·mid | Linear pro-rata payoff → exact static replication; correlation-free pricing | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-18 after initialization*
