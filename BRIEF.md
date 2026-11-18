# UBC 2026 Hackathon: Project Brief

See the original handoff brief pasted on 2026-11-18. Key sections are summarized below; CLAUDE.md has the hard facts.

## Constraints
- Deadline: Fri Nov 20, 2026, 12:00 PM CST (Devpost: ubc-hackathon-2026.devpost.com). Must attend closing ceremony Sat Nov 21.
- Finalists pitch for 5 min plus 2 min Q&A. Must be built during the hackathon (started Nov 12). AI tools are allowed.

## Structure
Pick 1 main track, optionally 1 chain award (Solana $1,500 or Arc $1,000), and any number of bounties.

| Track ($2,000) | Requirement |
|---|---|
| Agentic Payments & AI | Agent transacts onchain or reads the chain (testnet OK). Document the decision loop and safety limits (budgets, allowlists, human approval). |
| DeFi & Onchain Apps | Interacts with smart contracts. README explains the economic design and risk assumptions, and lists contract addresses. |
| Consumer Applications | Crypto stays invisible to the user. Interacts with the chain. Working frontend. |

| Bounty | Prize | Requirement |
|---|---|---|
| Gemini Prediction Markets | $2,500 / $1,000 / $500, and 1st place gets a finalist slot | Uses the Gemini PM API |
| ElevenLabs | 3 months of Scale | Voice is core; demo video has audio; README names the products used |
| QuickNode Streams | $500 | A Stream with a filter and destination as a core data source |
| Grok Bot | Keyboard | Bot does real work on X; chat export |

Judging: technical execution, product/UX, innovation, impact, demo quality.

## Submission checklist
- Name, description, team members; track, chain, bounties opted in
- Written answers: what you built, the problem, how it works, what's unique, what's next
- Public GitHub repo with setup instructions; deployed URL preferred
- 2-3 min public demo video
- README with architecture and track-specific items

## Gemini Prediction Markets API
- Docs: https://developer.gemini.com/prediction-markets/getting-started (LLM index: https://developer.gemini.com/llms.txt)
- Public endpoints: `GET /v1/prediction-markets/events` (status, category, search), `/events/{eventTicker}`, `/volume/{date}`, `/volume/{date}/hourly`
- WebSocket for live prices and depth. Combos: `POST /v1/prediction-markets/combos`
- Authenticated endpoints: `POST /v1/prediction-markets/order`, cancel, orders, positions. Sandbox: https://api.sandbox.gemini.com
- TypeScript SDK: developer.gemini.com/tools/typescript-sdk
- Gemini runs off-chain, so a project needs a separate onchain hook.

## Candidate ideas
1. "Why did this move?" odds news reader (Consumer). LLM explains big odds moves; onchain streak badge.
2. Guarded prediction-market agent (Agentic). Agent forms a probability estimate and trades in the Gemini sandbox under a budget cap, an allowlist and human approval; pays per data request in USDC via x402 or Nanopayments.
3. Friends prediction league (Consumer). Points-based; season trophies minted.
4. Real-life hedging translator (Consumer/DeFi). Worry in, related market and plain-English hedge out.
5. Odds oracle (DeFi). Gemini probabilities posted onchain for contracts to use.
6. Voice layer (ElevenLabs add-on, must be core).

## Plan
1. Decide the idea and track by Wed afternoon.
2. Spike the risky parts: Gemini data (done, works), then one onchain transaction.
3. Build the core loop end-to-end, then deploy early (Vercel).
4. Thu evening: feature freeze and README.
5. Fri morning: video, Devpost, submit by 11 AM; draft the pitch.

Suggested stack: Next.js + Tailwind on Vercel; Claude for LLM work; Arc (viem + Circle Wallets, faucet.circle.com) or Solana (@solana/web3.js, Agent Kit).

## Support sessions (CST, Zoom link in the original brief)
Wed Nov 18: 6-7 PM Solana, Circle; 7-8 PM QuickNode. Thu Nov 19: 7-8 PM Solana, QuickNode, Gemini. Telegram: https://t.me/+Q0hy2P7nbIk2YWIx

## Links
Solana https://docs.solana.com/ · Anchor https://anchor-lang.com/ · Circle https://developers.circle.com/ · Arc https://docs.arc.io/ · ElevenLabs https://elevenlabs.io/docs · QuickNode Streams https://www.quicknode.com/docs/streams/quickstart
