# Test funds

How to get Arc testnet USDC and Gemini sandbox funds, checked on Nov 18, 2026.

## Arc testnet USDC

| Route | Amount | Notes |
|---|---|---|
| Public faucet, https://faucet.circle.com | 20 USDC per address per network every 2 hours | No account needed. Protected by reCAPTCHA, so claim by hand; do not script it. |
| Circle Developer Console faucet | USDC and native tokens | Funds wallets created with Circle Wallets only, which matches the developer-controlled wallet plan. |
| `POST https://api.circle.com/v1/faucet/drips` | Per Circle docs | Programmatic version of the Console faucet. Docs say it may require an upgraded account; test it early. Confirm the exact blockchain identifier for Arc testnet in the request. |
| Circle Discord | Larger amounts | The faucet FAQ says to request more there. |
| Circle office hours | Ask in person | Wed Nov 18, 6-7 PM CST (Solana and Circle); Thu Nov 19, 7-8 PM CST. |

Sizing for the demo:

- Baskets cost $1-5; cap each basket at about 100 tokens.
- A fully reserved vault needs $1.00 per token outstanding, so about $100 per basket covers the cap.
- A few manual faucet claims across team addresses, plus the Console faucet, is enough.
- Fund new demo accounts from a server-held testnet treasury so the demo never waits on the faucet.

Arc reminders:

- Chain ID 5042002, RPC `https://rpc.testnet.arc.io`.
- USDC ERC-20 at `0x3600000000000000000000000000000000000000`, 6 decimals; native gas balance uses 18 decimals.
- Set gas to 25+ gwei; transactions below 20 gwei are dropped silently.

## Gemini sandbox

- Sandbox API: `https://api.sandbox.gemini.com`; it needs its own account at exchange.sandbox.gemini.com.
- New sandbox accounts are credited with test funds automatically (docs cite $100,000 USD; the asset list varies between doc pages, so check after signing up).
- Test funds cannot be deposited or withdrawn; they only trade on the sandbox.
- To change a balance (for example to test insufficient funds), email trading@gemini.com.
- Before the first order: create an API key, accept the current terms, and check `GET /v1/prediction-markets/terms/status`.
- The sandbox has fewer markets than production (crypto and commodities); use production public data for prices and the sandbox only for hedge orders.

## Sources

- [Circle Testnet Faucet](https://faucet.circle.com/)
- [Circle Developer Console faucet](https://developers.circle.com/wallets/developer-console-faucet)
- [Circle API: request testnet tokens](https://developers.circle.com/api-reference/wallets/programmable-wallets/request-testnet-tokens)
- [Gemini sandbox](https://developer.gemini.com/get-started/sandbox)
- [Gemini prediction markets getting started](https://developer.gemini.com/prediction-markets/getting-started)
