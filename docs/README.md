# Docs

Working docs for Weave (formerly Event Baskets), the UBC 26 hackathon entry.
Tagline: "Weave your worries into one hedge."
Team decisions from Nov 18, 2026 are in [`../.planning/research/DECISIONS-GRILLING.md`](../.planning/research/DECISIONS-GRILLING.md) and win over anything here.
Submission is due Fri Nov 20, 2026, 12:00 PM CST (target 11:00 AM).

## Start here

To apply the design work to the web app, read these in order:

1. [`frontend/CHANGE_PLAN.md`](frontend/CHANGE_PLAN.md) - the ordered task list with acceptance criteria.
2. [`frontend/PROTOTYPE.md`](frontend/PROTOTYPE.md) - what is already in `web/`, how to run it, and the file map.
3. [`design/DESIGN.md`](design/DESIGN.md) - visual direction, tokens, number formats, vocabulary, disclosures.
4. [`design/SCREENS.md`](design/SCREENS.md) - screen-by-screen spec with exact copy.
5. [`design/STATES.md`](design/STATES.md) - transaction and position state machines.

## Folders

| Folder | What it holds |
|---|---|
| `design/` | How the app should look, read, and behave. |
| `frontend/` | The current prototype and the plan to change it. |
| `pitch/` | Positioning against competitors, claims to avoid, regulatory framing, pitch and Q&A lines. |
| `ops/` | Test funds: Arc testnet USDC and the Gemini sandbox. |

Planning and architecture research lives in `../.planning/` (see `../.planning/research/SUMMARY.md`).
The project brief is `../BRIEF.md`.

## Evidence

These docs distill two research reports written on Nov 18, 2026.
The full reports, with every source link, are on Cayden's machine:

- `~/Documents/GitHub/hackathons/UBC/reports/Event Baskets design patterns.md`
- `~/Documents/GitHub/hackathons/UBC/reports/Prediction market moves and gaps.md`

Kalshi, Gemini Predictions, Polymarket and the Circle faucet were also checked first-hand in a browser on Nov 18, 2026.
Where a doc says **[E]**, a cited product or doc does it.
Where it says **[I]**, it is a design proposal, not something observed.

## Team decisions these docs follow

- Name Weave; hero user is a small business or individual with one specific risk; demo persona is a crypto-paid freelancer afraid of a BTC/ETH drop (Q1, Q10).
- Two curated baskets plus the AI builder: the 15-minute BTC/ETH downside demo basket, resolved live, and a priced, unresolved Recession Hedge (Q4, Q5).
- Buy ticket sizes the hedge from an amount at risk and a 10-100% slider (Q6).
- Mint price = Σ weight x ask x 1.02; NAV = Σ weight x mid; live solvency gauge and hedge-coverage % (Q8, Q13).
- Basket tokens are ERC-1155; hold to expiry in v1 (Q9, Q12).
- Cayden owns Gemini data, frontend, AI builder, README, video and the pitch (Q11).

## Ground rules for every change

- Never use the words insurance, policy, premium, claim, coverage, covered, bet, wager, odds, or win in user-facing copy (the one exception is the basket name "Crash Cover", settled on Nov 18; see `design/DESIGN.md`).
- No sports or politics legs in any basket.
- Testnet and Gemini sandbox only; no real money.
- Never commit API keys; use `.env` (gitignored).
