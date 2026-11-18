# CLAUDE.md

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

## Docs
- `docs/README.md` indexes the design, frontend, pitch and ops docs. For frontend work, start at `docs/frontend/CHANGE_PLAN.md`.
- `web/` is the Next.js 16 frontend (mock data for now); see `docs/frontend/PROTOTYPE.md`.
