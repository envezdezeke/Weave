# State: Weave

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-18)

**Core value:** A worry becomes one USDC hedge token from real Gemini markets, bought on Arc and redeemed pro-rata after resolution.
**Current focus:** Phase 1, Live loop

## Current Position

Phase: 1 of 3 (Live loop)
Status: Ready to plan
Progress: 3 of 24 requirements done (CHAIN-01..03: WeaveBasket.sol, 12 tests passing)

## Blockers

- Arc testnet deploy key (funded from faucet.circle.com), set with `npx hardhat keystore set ARC_PRIVATE_KEY` in `contracts/`
- Gemini sandbox API key with the Trader role, in the root `.env`

## Decisions

See `.planning/research/DECISIONS-GRILLING.md` and the Key Decisions table in PROJECT.md.
- Crash Cover uses hourly strike ladders (NO on "$X or above" just below spot), not 15-minute Up/Down markets.
- Contracts use Hardhat 3 (no Foundry on this machine).
- Every basket is fully collateralized onchain; the sandbox hedge never gates payouts.
