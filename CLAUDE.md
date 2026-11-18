# CLAUDE.md

## North star (read first; anything not listed here is out of scope until the Thu-evening freeze)
**Weave**: "Weave your worries into one hedge." DeFi track + Arc award + Gemini bounty. Due **Fri Nov 20, 11 AM CST** (hard deadline 12 PM).
Core loop that must work end to end:
1. User types a worry, their holdings or exposure, and the amount at risk.
2. AI builds a basket from **real** Gemini markets, with weights set from the user's exposure, or honestly says no good hedge exists.
3. Coverage slider; price = Σ w·ask × 1.02.
4. Buy with USDC on Arc (ERC-1155).
5. The production Gemini market resolves, and the operator posts the result onchain.
6. Redeem USDC, pro-rata.
Must also have:
- USDC reserve with a live solvency gauge, plus a Gemini sandbox hedge with a hedge-coverage % (a failed hedge never blocks a mint).
- 2 curated baskets: "Crash Cover" (70/30 BTC/ETH downside, 15-min, resolves on camera) and "Recession Hedge" (priced from production, unresolved).
- Posted price with a staleness check; Circle wallet (90-min cap, then MetaMask); README with the economics, risks and contract addresses.
Never:
- Claim "first", "trustless", "bet" or "insurance".
- Build sports or politics baskets.
- Pitch "no KYC".
- Use real money.
- Build early sell-back, lending or signed quotes (all of these are "next").
Owners: Ezekiel builds the contracts, resolver and hedger. Cayden builds the data, frontend, AI builder and pitch.
Decisions: `.planning/research/DECISIONS-GRILLING.md`. Project: `.planning/PROJECT.md`.

UBC 2026 Hackathon entry. Team of 2 (Ezekiel + teammate), new to crypto, interested in prediction markets.
Full brief: `BRIEF.md` (tracks, bounties, Gemini API notes, submission checklist). Read it first.

## Hard deadlines (CST)
- Devpost submission: **Fri Nov 20, 12:00 PM** (target 11:00 AM)
- Closing ceremony in person: Sat Nov 21

## Key facts
- Gemini Prediction Markets public data needs no key: `GET https://api.gemini.com/v1/prediction-markets/events?status=active` (verified working 2026-11-18). Contracts carry `prices.bestBid/bestAsk`, `instrumentSymbol`, `expiryDate`.
- Trading demos use sandbox only: `https://api.sandbox.gemini.com`. Never real money.
- Gemini is centralized, so every main track still needs a separate onchain component (Solana devnet or Arc testnet).
- Never commit API keys; keep them in `.env` (gitignored).

## Status
Chosen 2026-11-18 (pending teammate confirmation): event-outcome basket tokens on Arc testnet backed by Gemini prediction markets. DeFi track + Arc award + Gemini bounty. See `.planning/PROJECT.md`.
