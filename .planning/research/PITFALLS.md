# Pitfalls Research

**Domain:** Tokenized event-outcome baskets on Arc testnet (Solidity vault + ERC-20 basket token), priced from Gemini prediction markets, with an off-chain operator, a Next.js frontend and an LLM basket builder. 48-hour hackathon, team of 2, both new to crypto, Windows dev machine.
**Researched:** 2026-11-18
**Confidence:** MEDIUM-HIGH overall. Gemini public-API behaviour and Arc RPC/EVM behaviour were verified directly (live calls and current docs). Gemini sandbox *order placement* and Arc contract verification were not verifiable without keys/deploys and are flagged.

**Phase labels used below** (roadmapper may rename; map by content):
- **P0 Env and Spikes** (Wed evening): toolchain, one Arc tx, one Gemini sandbox order, data probes
- **P1 Contracts**: vault, basket token, tests, deploy, verify
- **P2 Pricing/NAV**: Gemini data to quotes/NAV
- **P3 Operator**: resolution posting, hedge leg, signing
- **P4 Frontend + AI builder**
- **P5 Ship**: deploy, README, video, Devpost, pitch

Confidence tags: [V] verified live today (API call or RPC call), [D] stated in current official docs, [S] secondary/inferred, treat as unconfirmed.

---

## Top 5 findings that should change the plan

1. **The sandbox has no macro markets.** [V] Sandbox categories that contain events: Crypto (80 events) and Commodities (18) only; 98 events total. Production has Economics (Fed Dec 11, Recession 2026, S&P/Nasdaq year-end, unemployment, GDP), Politics, Business, Tech, Weather and Sports. A "Recession Hedge" basket can be priced from production, but its hedge leg can never be mirrored in the sandbox, and none of those markets resolve before Feb 2027 (RECESSION26 expires 2027-02-01; FED261211 on 2026-12-11). Only crypto/commodity baskets can both be hedged in sandbox and resolve on camera.
2. **Fri 5 PM ET is after the Devpost deadline.** [V] November = EST, so the daily BTC market expires at 22:00Z = **4:00 PM CST**. Devpost closes Fri 12:00 PM CST. The only daily market that can appear in the submitted video is **Thursday Nov 19 at 4:00 PM CST**. Gemini's 5-minute and 15-minute BTC Up/Down markets run 24/7 and resolve about 5 seconds after expiry, so use those for the on-camera redemption and treat the daily as narrative and live-pitch material.
3. **Arc Foundry has no Windows binary and this machine has no WSL.** [V] Release v0.8.0-4 assets are Linux (x86_64, aarch64) and macOS (arm64) only; `wsl -l` reports WSL not installed; `forge` is not on PATH. Decide the toolchain in P0, not P1.
4. **`lastTradePrice` is unusable as a price.** [V] On the live daily BTC ladder, the $62,000 contract had bid 0.80 / ask 0.84 but `lastTradePrice` 0.65; $63,250 had bid 0.22 / ask 0.26 but last 0.75. Use `(bestBid+bestAsk)/2` for display and `bestAsk` for mint price. `bestBid` is `null` on tail strikes.
5. **The unfiltered event list is both huge and unstable.** [V] 200 events = about 9 MB; offset paging returned 10 duplicate IDs out of 1003, and a full crawl missed the entire Economics category that a `category=Economics` query returned. Always query by `category` and/or `/events/{ticker}` (about 24 KB for the 17-contract daily ladder).

---

## Critical Pitfalls

### Pitfall 1: Undercollateralized vault (nobody funds the 1 minus p gap)

**What goes wrong:**
A basket unit pays up to $1 (sum of weights times binary outcomes), but the user pays the current price p < $1 (for example $0.30 for a "recession" basket). If the vault only holds user deposits, a resolved-yes basket cannot pay all holders. The vault is insolvent at the exact moment the demo shows a payout.

**Why it happens:**
Real Gemini positions are bought off-chain with *off-chain* funds; the on-chain USDC and the hedge are not linked. The 1 minus p liability is implicitly assumed to be covered "by the hedge", but the hedge is sandbox-only and cannot move USDC on-chain (sandbox supports no deposits/withdrawals except Testnet BTC [D]).

**How to avoid:**
- Make the liability explicit: `maxLiability = totalSupply * maxPayoutPerUnit`. The vault holds user deposits plus an **operator-funded reserve** and enforces on `mint`: `usdc.balanceOf(vault) + reserveCommitment >= (totalSupply + amount) * maxPayoutPerUnit`, otherwise revert. Add a Foundry invariant/fuzz test for it.
- Cap per-basket supply to what the reserve covers. Pre-fund the reserve from the faucet early (see Pitfall 8).
- State in the README: on testnet, solvency comes from an operator-funded reserve; in production the real hedge position on Gemini plus a bridge would back it. Judges will ask "who is the counterparty?"; answer in the README before they ask.

**Warning signs:**
Mint price computed from NAV with no check against vault balance; tests that only cover the happy path; payout computed in the redeem function without a solvency assertion.

**Phase to address:** P1 (invariant), P3 (reserve funding), P5 (README).

---

### Pitfall 2: Operator posts outcomes (trust and abuse surface)

**What goes wrong:**
A single operator key resolves baskets. A wrong, early, or never-posted outcome either steals from holders or locks funds. Judges grepping for `onlyOwner` drains will find them.

**Why it happens:**
Gemini is centralized; there is no on-chain oracle. Quick implementation gives the operator broad powers (arbitrary resolve, withdraw, pause).

**How to avoid:**
- Constrain the operator in code: `resolve(basketId, outcomes[], evidence)` callable only once per basket, only after an on-chain `expiry` timestamp, and unable to move vault funds (no `withdraw`/`rescue` of user USDC; reserve withdrawable only above max liability).
- Store evidence on-chain/events: Gemini event ticker, per-contract `resolutionSide`, `settlementValue`, `resolvedAt` (all returned by Gemini [V]), so anyone can compare against the public API URL.
- Add a **timeout refund** path: if unresolved N hours after expiry, holders can redeem at their mint price (or pro-rata). Add a **void/dispute** state.
- Optional but cheap: a challenge window (configurable; set short for the demo and disclose it).
- Document operator trust as a named risk assumption (already a project decision). Do not call it "trustless" anywhere in UI or README.

**Warning signs:**
`resolve` has no expiry check; operator can resolve twice; no event emitted with evidence; README uses the word "decentralized".

**Phase to address:** P1 (contract rules), P3 (operator script), P5 (README risk section).

---

### Pitfall 3: Stale or manipulable price at mint (basket mispricing)

**What goes wrong:**
Quote is read once, the user signs a transaction 40 seconds later, the market has moved (or is about to close). Worse: someone mints after the outcome is effectively known (last minute before expiry, or after expiry before the operator posts) and redeems at $1. On a 5-minute market this is a guaranteed free-money attack on the vault.

**Why it happens:**
Gemini prices are off-chain. Contract has no clock-aware pricing. Gemini stops trading at expiry (`marketState` becomes `closed`) and resolves about 5 s later [V: `resolvedAt` = expiry + 5.5 to 5.7 s on all sampled crypto events], but the chain does not know.

**How to avoid:**
- **Signed quotes**: operator service signs an EIP-712 `(basketId, price, maxUnits, deadline, nonce)`; `mint` verifies signature, `deadline` (short, for example 30 s), and nonce. No per-tick oracle transactions, no gas drain, no stale-price window.
- **Mint cutoff**: contract rejects mint within X seconds of the earliest component expiry (for example 120 s for 5-minute markets; larger for dailies). Server refuses to sign when any component `marketState != "open"`.
- Quote at **ask** (or mid plus a spread fee), never at last trade. Show price with the spread.
- Per-wallet and per-basket mint caps.

**Warning signs:**
`mint` takes a price from calldata with no signature; no expiry argument; the frontend shows a price computed client-side.

**Phase to address:** P1 (signature verify, cutoff), P2 (quote service), P3 (signer).

---

### Pitfall 4: Demo hinges on a market resolving on camera

**What goes wrong:**
The daily BTC market resolves 4 PM CST, hours after the Devpost deadline on Friday. Even on Thursday, a single failed take has no retry until the next day. Or the resolver process (laptop asleep, tunnel dead) misses the 5 s window and the on-chain `resolve` happens late or never.

**Why it happens:**
Timezone confusion (ET vs CST); the plan has a single point of failure with a hard external clock; operator process runs on a laptop.

**How to avoid:**
- **Primary on-camera market: BTC05M or BTC15M** (24/7, resolve about 5 s after expiry [V], present in both prod and sandbox). Events are created about 55 minutes ahead, so any time you want a take, a market is within 5 to 60 minutes away. Record the redemption with a 5-minute market.
- Keep the daily ladder as the "hedge story" market. Thursday Nov 19, 22:00Z (4:00 PM CST) is the last daily in the video window; use it only as a bonus take. For the Saturday in-person pitch, use a 5-minute market on stage (the Saturday daily would also expire at 4:00 PM CST, which may not line up with the ceremony schedule).
- **Honest caveat**: 5-minute Up/Down is a coin flip with a reference strike published only at `startTime` (`strike.availableAt`); it is a poor hedge story and a gambling-optics risk. Label it "short-dated market used to demonstrate settlement".
- Record a **clean successful run early** (Thursday midday) and keep it as the video's fallback segment. Put the mint/resolve/redeem tx hashes in the README so judges can verify on the explorer even if the live demo fails.
- Add a **replay mode** as the last-resort fallback: a documented script that resolves a demo basket using the already-settled Gemini JSON (`recently-settled` entry with `resolvedAt`, `settlementValue`). Clearly disclosed as replay; never present as live.
- Make the resolver both automatic (poll every few seconds near expiry) and manually triggerable (CLI or admin button). Run it off the demo laptop's sleep-prone path (disable sleep; or a small always-on host).
- **Spike today**: watch the Wed 22:00Z (4:00 PM CST today) daily BTC resolution and record the delay between `expiryDate` and `resolvedAt` for the ladder template (we only have measured data for the 5-minute template).

**Warning signs:**
Demo script says "at 5 PM"; no pre-recorded fallback; resolver only works when you run it by hand.

**Phase to address:** P0 (spike resolution timing), P3 (resolver), P5 (video).

---

### Pitfall 5: Arc USDC decimals (18 native vs 6 ERC-20) and value-transfer rules

**What goes wrong:**
Mixing `msg.value` / `address.balance` (18 decimals) with `USDC.balanceOf` (6 decimals) gives amounts off by 10^12: mint prices, vault accounting, or payouts silently wrong by a trillion. Or the vault is written WETH-style with a `payable` deposit.

**Why it happens:**
Arc's USDC is one native balance with two views; docs say they share one balance with a conversion factor of 10^12 and the ERC-20 interface at `0x3600000000000000000000000000000000000000` truncates the last 12 digits [D]. Most tutorials and AI-generated Solidity assume ETH-style `payable` plus 6-decimal ERC-20 USDC on a different chain.

**How to avoid:**
- Contracts use **only the ERC-20 interface** (`SafeERC20`, `transferFrom`, `balanceOf`), 6 decimals everywhere. No `payable` functions, no `msg.value`, no `receive()`, no `address.balance`, no `selfdestruct`.
- Do **not** deploy a wrapped-USDC; do not pair native vs ERC-20 USDC in any accounting [D].
- Basket token: 6 decimals. Express weights as basis points summing to 10000 and compute payout in integer 6-decimal units; test rounding (dust) explicitly.
- viem chain definition: `nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }` (the native/gas side is 18). Use `parseUnits(x, 6)` / `formatUnits(x, 6)` for all ERC-20 amounts; use 18 only for gas displays.
- Show one USDC balance in the UI (ERC-20 `balanceOf`), not two rows [D].
- Remember `balanceOf == 0` does not imply native balance is zero (sub-micro-USDC dust) [D].

**Warning signs:**
Any `payable` in the contracts; `parseEther` in the frontend for amounts; tests using 18-decimal mock USDC; amounts that are 1e12 too large.

**Phase to address:** P1 (contract design, tests with real-address fork), P4 (frontend formatting).

---

### Pitfall 6: Transactions silently dropped below the 20 gwei floor

**What goes wrong:**
A transaction with `maxFeePerGas` below the base-fee floor is dropped by the mempool with **no error and no receipt**; the UI spins forever [D]. Hard-coded low gas values (copied from Ethereum examples) trigger this.

**Why it happens:**
Arc's minimum base fee is 20 gwei (observed `eth_gasPrice` = exactly 20.5 gwei [V]) and base fee goes to the block beneficiary. Standard tooling defaults are fine but custom overrides are not.

**How to avoid:**
- Never hard-code `maxFeePerGas`; let viem estimate, or set at least about 30 gwei. For `forge`/Hardhat deploys pass an explicit gas price above 20 gwei if the tool fetches a stale value.
- Cost is trivial (21,000 gas at 20.5 gwei is about 0.0004 USDC), so over-pay rather than stall.
- Treat "pending > 15 s" as an error in the UI: show the failure and offer retry with higher fee. Check `receipt.status === 0` for reverts (blocklist and zero-address reverts still consume gas) [D].
- Finality is deterministic on inclusion [D]; do not wait for multiple confirmations (it wastes demo time).

**Warning signs:**
`transaction underpriced`, `intrinsic gas too low`, or a tx hash that never appears in the explorer.

**Phase to address:** P0 (first tx spike), P4 (UI error handling).

---

### Pitfall 7: Toolchain mismatch on Windows (Arc Foundry is Linux/macOS only)

**What goes wrong:**
Plan assumes `arc-forge`/`arc-cast`/`arc-anvil` (the only Arc-specific tooling the docs name). On this machine: no WSL, no forge. `wsl --install` needs admin plus a reboot and may fail on virtualization settings; a half-day lost at the worst time.

**Why it happens:**
Arc Foundry install guide supports Linux, Apple-Silicon macOS, and Windows "through WSL" only [D, V from release assets]. Standard `anvil` cannot reproduce Arc behaviour [D].

**How to avoid (pick in P0, time-boxed to 30 minutes):**
1. Try `wsl --install` Wed evening and reboot; if `arc-forge --version` works, use it for tests only.
2. If WSL fails or is slow, **use standard Foundry for Windows** (native binaries; `foundryup` via Git Bash) or **Hardhat + viem** natively for compile/test/deploy against `https://rpc.testnet.arc.io` (chain ID 5042002). Because the contract design avoids native-USDC paths (Pitfall 5), you lose little from not running arc-anvil. [S: native Windows Foundry is standard; not verified on this machine.]
3. Test Arc-specific paths (real USDC at `0x3600…`, fees) **directly on testnet**; docs explicitly recommend testnet for realistic behaviour [D].
- Pin the Solidity compiler version; AI-generated code often uses OpenZeppelin v4 imports/constructors against v5 (`Ownable(msg.sender)`); compile on day one.

**Warning signs:**
`forge: command not found`; time spent on PATH fiddling; contracts never compiled by Thursday.

**Phase to address:** P0.

---

### Pitfall 8: Faucet limits starve the demo and the reserve

**What goes wrong:**
You need USDC for: operator reserve (Pitfall 1), several demo wallets, the test mints, plus the judges' own wallets. The public faucet is rate-limited per address and per time window; hitting the wall Thursday night means no demo funds.

**Why it happens:**
Faucet quota figures conflict across sources: one third-party guide says 20 USDC per address per chain every 2 hours; Circle developer-console docs say 10 or 20 USDC with one request per 24 hours per token per testnet [S, unconfirmed]. Gas is not the constraint (a deploy costs cents); *principal* is.

**How to avoid:**
- Drip from faucet.circle.com on **Wednesday** from multiple team addresses and consolidate into the operator/reserve wallet. Check the quota displayed on the faucet page itself.
- Design the demo around tiny amounts (for example $1 to $5 baskets, 1 USDC mints). Reserve sized for the demo cap only.
- Ask in the Circle/Arc support session (Wed 6 to 7 PM CST) or Discord for a larger allocation if needed.

**Warning signs:**
"Faucet limit reached" on Thursday; reserve below `maxLiability` in the contract check.

**Phase to address:** P0 (first drip and balance tracking), P3 (reserve funding).

---

### Pitfall 9: RPC quirks (getLogs range, load-balancer lag, no documented rate limits)

**What goes wrong:**
Frontend or indexer scans events from genesis and fails with `-32012` (max 10,000 blocks per `eth_getLogs`, about 85 minutes at about 2 blocks/s) [D]. Calls using a `toBlock` from `eth_blockNumber` intermittently fail with `-32014` because the primary endpoint's backends are at slightly different heights [D]. Rate limits are not documented, so a polling UI may be throttled.

**How to avoid:**
- Do not rely on logs for UI state. Use contract reads (`balanceOf`, `getBasket`, `resolved`), optionally `multicall`. If logs are needed (history of mints), store the deploy block and chunk at 9,999 blocks or fewer.
- Use a viem `fallback` transport over Circle primary, Blockdaemon, dRPC and QuickNode testnet URLs [D]; retry `-32014` with short backoff.
- Prefer `eth_subscribe` over WebSocket only server-side; poll sparingly (every 3 to 5 s) client-side.
- Never double-count USDC `Transfer` events: they come from two emitters (system emitter with 18-decimal amounts and the ERC-20 contract with 6-decimal amounts); a single ERC-20 `transfer()` emits two logs [D].

**Warning signs:**
Intermittent "block not found"; history that works for the first hour after deploy then breaks.

**Phase to address:** P1 (record deploy block), P4 (transport config).

---

### Pitfall 10: Explorer verification may not work first time

**What goes wrong:**
Judges (and the Arc award) expect verified contract source on the explorer. Verification fails at 11 PM Thursday; or bytecode differs because compiler settings changed after deploy.

**Why it happens:**
Arc's explorer is Blockscout [D]; the documented command is `forge verify-contract <addr> <path:Name> --chain-id 5042002 --verifier blockscout --verifier-url https://explorer.testnet.arc.io/api/` (with `--constructor-args $(cast abi-encode ...)`) [D]. An open issue in `circlefin/arc-node` reports Blockscout-API verification failing on a different explorer domain (arcscan.app); status unknown [S].

**How to avoid:**
- Verify the **first deployed contract in P0/P1** (even a trivial one), not on the last day.
- Fallback: verify manually through the explorer's UI with flattened source (`forge flatten`) and the exact compiler version/optimizer runs/EVM version used.
- Freeze compiler settings in `foundry.toml`/`hardhat.config` before the final deploy. Redeploying changes addresses: generate the README address table from a `deployments.json` written by the deploy script, never by hand.

**Warning signs:**
"Unverified" badge on the explorer; README address does not match the frontend env var.

**Phase to address:** P1 (verify early), P5 (final re-check).

---

### Pitfall 11: Gemini signed-request errors (HMAC-SHA384, nonce, headers, roles)

**What goes wrong:**
Every private call returns 400/403: `InvalidSignature`, `InvalidNonce`, `MissingRole`, or terms not accepted. The hedge leg is blocked for hours.

**Why it happens:** [D unless noted]
- The JSON payload is **not** sent as the body: it is base64-encoded into `X-GEMINI-PAYLOAD`, the body is empty, `Content-Type: text/plain`, `Content-Length: 0`. Signature is `hex(HMAC_SHA384(base64(payload), api_secret))` over the *base64 string*, not raw JSON.
- Payload must contain `request` (the exact path, for example `/v1/prediction-markets/order`) and `nonce`.
- Nonce is epoch **seconds within +/-30 s of server time** (time-based keys) or strictly increasing (incremental keys, chosen at key creation). Two orders in the same second on an incremental key, or a drifted Windows clock on a time-based key, give `InvalidNonce`. Resync the clock (`w32tm /resync`).
- Key needs the **Trader** role; calls without it return 403 `MissingRole`. Terms must be accepted: check `GET /v1/prediction-markets/terms/status`; if `hasAcceptedLatest` is false, `POST /terms/accept` first.
- "Requires Heartbeat" keys cancel open orders after 30 s without an authenticated request.
- Sandbox needs a **separate account and separate API key** from production; sandbox has 2FA on by default, with a documented test bypass (`GEMINI-SANDBOX-2FA=true` cookie/header, code `9999999`).
- `quantity` and `price` must be **strings**; price range is 0 to 1; tick `0.01`, minimum quantity `0.01` [V from contract fields]. Use the exact `instrumentSymbol` from the events endpoint; do not construct it.
- An accepted order is not a fill; do not blindly retry on timeout (check active orders/history first) [D].
- The trading quickstart gives only the production base URL for the order endpoint and never mentions sandbox for prediction markets; the sandbox page does not say whether PM trading is enabled [D]. **Sandbox PM order placement is unverified.**

**How to avoid:**
- P0 spike: create sandbox account and key, accept terms, place a 0.01-quantity limit buy at price 0.01 on a sandbox BTC05M contract, then cancel it. Do this Wednesday; if it fails, ask in the Thursday 7-8 PM CST Gemini session, and prepare the fallback (a "paper hedge" ledger that records intended orders against live public prices, disclosed as such).
- Use the Gemini TypeScript SDK or a known-good signing helper; unit-test signing against the doc's sample before wiring.
- Use millisecond nonce (`Date.now()`) or an in-process counter on incremental keys.
- Keep one HTTP client module; log request path and response `reason` (never the secret or signature).

**Warning signs:**
`InvalidSignature` after "fixing" the JSON; works once, then `InvalidNonce`.

**Phase to address:** P0 (spike), P3 (hedge leg).

---

### Pitfall 12: Gemini sandbox is a different, thinner market

**What goes wrong:**
Operator prices baskets from sandbox data (thin, bot-driven), or hedges in sandbox at prices that differ from production NAV; macro baskets have no sandbox legs at all.

**Why it happens:** [V]
- Sandbox has 98 events vs 1003+ in production; categories Crypto and Commodities only. Sandbox returns 400 for some category names (`Economy`, `Business`, `Tech`, `Midterms`) whereas production returns 200 with an empty list.
- Same ticker, different book: `BTC2611182200` had 17 strike contracts and volume 26,056 in production but 6 contracts (63,000 to 64,250) and volume 48.64 in sandbox. Prices were close at the money (for example $63,000: prod 0.33/0.37, sbx 0.34/0.38) but sandbox `lastTradePrice` is also unreliable.
- Sandbox exchange bots simulate order-book activity [D]; liquidity is not representative.

**How to avoid:**
- **NAV and quotes always come from production public data** (no key). The sandbox is only the hedge-execution mirror. Say so in the README ("price source: production public API; hedge venue: sandbox").
- Constrain *hedgeable* baskets to contracts that exist in both environments (check by `instrumentSymbol` at build time and skip missing ones). Mark macro baskets "price-only, hedge leg not available in sandbox".
- Assume sandbox fills may not occur at the quoted price; the operator hedge is best-effort and reported, not guaranteed.

**Warning signs:**
`instrumentSymbol` from prod 404s in sandbox; basket shows a hedge for a Fed market.

**Phase to address:** P2 (data source split), P3 (hedge leg), P5 (README).

---

### Pitfall 13: Gemini data-handling traps (payload size, paging, field shapes)

**What goes wrong:**
Slow pages, rate-limit errors, wrong prices, crashes parsing fields.

**Details:** [V unless noted]
- Public limit: 120 requests/min (recommended at most 1 per second); private 600/min (about 5 per second). Overflow gets a burst of 5 queued, then HTTP 429 [D]. No rate-limit headers are documented [D].
- Unfiltered `/events` at limit=200 is about 9 MB (descriptions embedded). Offset paging is unstable (10 duplicate IDs across pages) and a full crawl missed the Economics events. Filter by `category`, then fetch `/events/{ticker}`.
- CORS is enabled (the API echoes the request `Origin`), so browsers *can* call it directly, but with many viewers you will hit 120/min. Proxy through a Next.js route handler with 3 to 5 s server-side caching (stale-while-revalidate); use the WebSocket only on the server.
- Prices are **strings** ("0.93"); parse with a decimal-safe path or at least `Number()` at the boundary; docs say preserve precision [D].
- `prices` has nested `buy{yes,no}`, `sell{yes,no}`, `bestBid`, `bestAsk`, optional `lastTradePrice`. YES-ask plus NO-ask exceeds 1 (for example 0.91 + 0.13 = 1.04 on the $61,750 contract): the overround is real cost. `bestBid`/`bestAsk` can be missing, and `prices.buy`/`sell` can be `{}` on closed events.
- `description` is a rich-text JSON document (`nodeType: document`), not a string. Extract `content[].content[].value`.
- Contracts are defined in YES space (`label` "$61,750 or above" or Up/Down); "NO" is the complement. Daily ladders are **non-exclusive thresholds** (YES on $62k implies YES on $61k), so basket payouts across them are correlated, not independent.
- Events carry `status`, contracts carry `status` and `marketState` (`open`/`closed`); gate on both.
- `recently-settled` only returns the **last 24 hours**; capture `resolutionSide`, `settlementValue`, `resolvedAt` into your own store at resolution time. Docs warn not to infer settlement from end time alone [D].
- Non-ASCII in titles (for example "Díaz-Canel"): on Windows, Python's default cp1252 decoding raises `UnicodeDecodeError` on these payloads (hit during this research); open files with `encoding="utf-8"` / set `PYTHONUTF8=1`.
- Resolution rule (crypto): "If no eligible trade occurs during the contract window, this contract will resolve based on the most recent traded price prior"; outcomes verified against the Lukka index (for example `LS-LRRR-XBTUSD`). Show the rule text and source for every basket component.

**How to avoid:**
One server-side `gemini.ts` with a typed zod schema, strict string-to-decimal handling, a cache, and fixture JSON (saved real responses) for offline dev and for the demo fallback.

**Phase to address:** P2.

---

### Pitfall 14: LLM basket builder hallucinates or gets steered

**What goes wrong:**
The model invents tickers, picks illiquid or irrelevant markets, returns weights that do not sum to 1, or follows instructions embedded in a market title/description (untrusted text from the API). The "pay $X, get ~$Y" figure misleads users.

**How to avoid:**
- LLM receives a **pre-filtered candidate list** (ticker, title, mid price, expiry, spread, volume) fetched from Gemini server-side; it returns ticker IDs only. The server **rejects any ID not in the candidate list**, forces weights to basis points that sum to 10000, enforces min/max components, minimum liquidity (max spread, non-null bid), and a minimum time to expiry.
- Treat market titles/descriptions as data, not instructions; use structured output with a strict schema; do not let LLM output reach the contract without server validation and signing.
- Present "max payout per $1" and the probability-weighted figure separately; label the payout figure as probabilistic, not guaranteed. Include a one-line rationale per component.
- Deterministic fallback: if the LLM call fails or exceeds a timeout, return the nearest curated basket. Curated baskets must work with the LLM key unset.
- Vercel serverless default timeouts are short; set `maxDuration`, keep prompts small.

**Phase to address:** P4 (builder), P2 (candidate list).

---

### Pitfall 15: Regulatory framing (gambling vs hedging, "insurance")

**What goes wrong:**
Pitch or README describes tokenized bets on real events, "insurance you can trade", or includes sports baskets. Judges or sponsors read it as an unlicensed gambling or insurance product; Q&A derails.

**Why it matters (verified context):**
In April 2026 the New York Attorney General sued Gemini Titan (Gemini's prediction-market entity) and Coinbase Financial Markets, calling the contracts "quintessentially gambling" and objecting to users aged 18 to 20; the CFTC then sued New York claiming exclusive federal jurisdiction; there are parallel federal-vs-state fights (Illinois, Connecticut, Arizona; a Third Circuit ruling for Kalshi; Nevada injunctions against Kalshi and Coinbase) [S: news reports, no ruling found in the NY Gemini case].

**How to avoid:**
- Language: "event-outcome exposure", "hedging primitive", "outcome-linked payoff"; **not** "bet", and **not** "insurance" (PROJECT.md currently says "insurance you can trade"; remove it from user-facing copy. Insurance is its own regulated category and requires insurable interest).
- Curate for real exposures: macro, crypto and commodity baskets (recession, rates, crypto drawdown, oil/gold). **No sports, no politics baskets**, even though the API offers them.
- Explicit disclosures in README and UI footer: testnet only, no real value, sandbox-only hedge, not financial advice, not available to US persons for real money. Mention that Gemini's own markets are offered by a CFTC-regulated venue and that state-level litigation exists, so any production version needs legal review.
- Keep the 5-minute coin-flip market out of the hedging narrative (Pitfall 4).
- Prepare a 30-second Q&A answer: "who is the insurable party, what exposure does this offset, what are the limits".

**Phase to address:** P0 (decide basket categories), P4 (copy), P5 (README and pitch).

---

### Pitfall 16: Reentrancy, double-redeem, blocklist and zero-address behaviour in the vault

**What goes wrong:**
Redeem pays twice, a loop paying holders reverts on one blocklisted address and blocks everyone, or a transfer to `address(0)` reverts unexpectedly.

**Why it happens:**
Arc reverts value-bearing transfers to blocklisted addresses and to `address(0)`, and the reverting transaction still consumes gas [D]. Push-style payout loops and "burn by sending to dead address" patterns break.

**How to avoid:**
- **Pull-based redeem**: each holder calls `redeem(amount)`; burn token with the standard `_burn`, then `safeTransfer` USDC (checks-effects-interactions, `ReentrancyGuard`, `SafeERC20`).
- No loops over holders; no transfers to `address(0)`.
- Payout math: `payout = amount * resolvedPayoutPerUnit / 1e6` with a rounding rule that never exceeds vault balance; fuzz it.
- Resolution immutability: once `resolved`, outcomes are final; block `mint` after resolve.
- Use well-known OpenZeppelin (pin v5 and match constructor signatures) and test with Foundry fuzz/invariants.

**Phase to address:** P1.

---

## Moderate Pitfalls

### Pitfall 17: Wallet connection friction on Arc
**What goes wrong:** Arc testnet is not in the WalletConnect registry; each user's first connection triggers `wallet_addEthereumChain`. Wallets without custom-gas-token support label the balance "ETH" [D]. ConnectKit without `mainnet` in `chains` uses an ENS endpoint that blocks cross-origin requests; Reown AppKit needs `defineChain` imported from `@reown/appkit/networks`, not viem [D].
**Prevention:** Test connect in a fresh browser profile on the deployed Vercel URL in P4. For "crypto invisible", use a **pre-funded demo wallet / embedded wallet path** plus a "bring your own wallet" path; do not depend on judges owning a funded wallet. Show chain-add as one click. Use plain wagmi/viem injected connector if the kit gives trouble.
**Phase:** P4.

### Pitfall 18: Event-indexing double counts and order
**What goes wrong:** Block timestamps have one-second granularity and sub-second blocks can share a timestamp; ordering by timestamp misorders events [D].
**Prevention:** Order by block number and log index.
**Phase:** P1/P4.

### Pitfall 19: Resolver runs on serverless
**What goes wrong:** Vercel functions cannot hold a polling loop or WebSocket; free-tier cron fires too rarely for a 5-second window [S: Hobby plan cron limits].
**Prevention:** Resolver is a separate Node script (laptop with sleep disabled, or a free always-on host); Vercel hosts only the frontend and stateless API routes. Add a manual "Resolve now" CLI.
**Phase:** P3.

### Pitfall 20: Secrets leakage and repo hygiene
**What goes wrong:** Operator private key or Gemini secret ends up in a `NEXT_PUBLIC_*` variable, in the public repo history, or in a screen recording.
**Prevention:** Only non-secret values get `NEXT_PUBLIC_`; operator and Gemini keys live in the operator script's `.env` only; `.env` gitignored from the first commit; `.env.example` committed; use a **fresh burner key** for deploy (never a mainnet wallet); run a secret scan (`git grep`, gitleaks) before making the repo public; blur terminals while recording.
**Phase:** P0 (gitignore), P5 (scan).

### Pitfall 21: Basis risk between the hedge and the token
**What goes wrong:** Operator's sandbox hedge size/price does not match the outstanding token supply; "mirrors basket exposure" is not demonstrably true.
**Prevention:** Operator keeps a ledger `onchainSupply -> targetPositions -> filledPositions` and publishes a reconciliation JSON/endpoint; show a "hedge status" row in the UI (filled / partial / paper). Report partial fills honestly.
**Phase:** P3.

### Pitfall 22: Time zone confusion in UI and copy
**What goes wrong:** Gemini titles say "EST" while rules say "ET"; summer would be EDT; copy shows "5 PM" while the judges are in CST.
**Prevention:** Store and compute in UTC from `expiryDate`; render countdowns plus local time; in November 5 PM ET = 22:00Z = 4 PM CST.
**Phase:** P2/P4.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Operator can arbitrarily resolve with no expiry check | 10 minutes saved | Looks like a rug; fails DeFi Q&A | Never |
| Price passed as calldata with no signature | Skips EIP-712 | Free-money attack (Pitfall 3) | Never, even on testnet |
| Hard-coded basket weights in the contract | No admin UI | Cannot add AI-built baskets | OK for curated; AI baskets use server-validated, signed basket definitions |
| Using `lastTradePrice` for NAV | One field | Wildly wrong NAV | Never |
| Polling Gemini from every browser | No backend cache | Rate limit at demo | Never; one cached proxy |
| Mock USDC with 18 decimals in tests | Quick tests | Hidden 10^12 bugs | Never; use 6 decimals, ideally the real `0x3600…` on testnet |
| Skipping fuzz/invariant tests | Time | Insolvency undiscovered | Skip fuzz only if the solvency invariant has a simple unit test |
| Saved fixture JSON instead of live Gemini | Offline reliability | Stale data | Acceptable as explicit "demo fixtures" fallback, labelled |
| Deploy from laptop with raw `PRIVATE_KEY` in `.env` | Fast | Key leak risk | OK for a burner testnet key only |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gemini public API | Crawl `/events` unfiltered and page by offset | `category=` plus `/events/{ticker}`, server cache, fixtures |
| Gemini prices | Use `lastTradePrice` or assume numbers | Strings; mid = (bestBid+bestAsk)/2, ask for mint; handle null bid |
| Gemini private API | Send JSON body; sign raw JSON; epoch ms on a seconds-nonce key | Base64 payload in header, empty body, HMAC-SHA384 over base64, match nonce mode |
| Gemini sandbox | Assume same markets as prod | Crypto+Commodities only; prices from prod, hedge in sandbox |
| Gemini settlement | Infer from expiry time; read `recently-settled` after 24 h | Persist `resolutionSide/settlementValue/resolvedAt` right after resolution |
| Arc RPC | `eth_getLogs` from block 0; single endpoint | 9,999-block chunks; viem `fallback` across 4 providers; retry `-32014` |
| Arc USDC | `payable` deposit, mixed decimals | ERC-20 interface at `0x3600…`, 6 decimals; native only for gas |
| Arc gas | Hard-coded low `maxFeePerGas` | Estimated or at least 30 gwei; floor is 20 gwei |
| Wallets | Assume chain is in the wallet list | `wallet_addEthereumChain` on first connect; test in fresh profile |
| Arc explorer | Verify at the last minute | Verify a trivial contract in P1; manual flattened fallback |
| LLM | Trust model output | Candidate list in, IDs out, server validation, curated fallback |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unfiltered Gemini list (9 MB per 200 events) | Slow page load, timeouts, memory | Category/ticker filters, server cache | Immediately |
| Client-side polling of Gemini | HTTP 429 after burst | One server cache, 3 to 5 s TTL | About 120 requests/min per IP, i.e. a handful of viewers polling every second |
| Per-render `readContract` calls | RPC throttling, jank | `multicall`, query cache (TanStack Query), 3 to 5 s stale time | A few concurrent judges |
| LLM call on every keystroke | Cost, latency, timeouts | Debounce; submit-on-click; cache by worry text | First demo |
| Log scans for UI state | `-32012` errors | Contract reads; chunked logs with deploy block | After about 85 minutes of chain history |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Operator key too powerful (withdraw, arbitrary resolve) | Rug-pull appearance or real loss | Role-limited functions, expiry check, one-shot resolve, no user-fund withdrawal |
| Signed quote lacks nonce/deadline/chainId/contract in domain | Replay across baskets or chains | EIP-712 domain with `chainId` 5042002 and `verifyingContract`; per-quote nonce |
| Reentrancy in redeem/mint | Drained vault | CEI, `ReentrancyGuard`, `SafeERC20` |
| `NEXT_PUBLIC_` prefix on secrets | Keys in the browser bundle | Only public RPC/addresses are public |
| Gemini production key used by mistake | Real orders with real money (violates out-of-scope) | Sandbox base URL hard-coded in config with an assertion refusing `api.gemini.com` for `/order`; separate env var names |
| Unvalidated LLM output reaching the signer | Arbitrary basket signed | Server validation; allowlist of tickers |
| Holder blocklisted on Arc | Redeem tx reverts, gas lost | Pull redeem; surface revert reason; do not loop payouts |
| Prompt injection via market text | LLM picks attacker-chosen basket | Data/instruction separation, strict schema, ticker allowlist |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing NAV only, not max payout and spread | Users do not understand "pay $0.30, maybe get $1" | Show price, max payout, implied probability, spread cost |
| Spinner with no failure state on dropped tx | Demo appears frozen | 15 s timeout, show reason, retry with higher fee |
| Two USDC balances or "ETH" labels | Confusion; "crypto not invisible" | Single USDC row from ERC-20 `balanceOf`; custom chain config |
| Countdown in ET only | Judges in CST mis-time | Show UTC-derived local time and countdown |
| LLM text that sounds like advice | Regulatory/credibility issue | Disclaimer plus factual rationale per component |
| Redeem button visible before resolution | Reverts, confusion | State machine: Open, Closing (cutoff), Awaiting resolution, Redeemable |
| Wallet needed before seeing anything | Judges bounce | Browse, quote and AI builder work without a wallet; connect only on buy |

## "Looks Done But Isn't" Checklist

- [ ] **Vault solvency:** Often missing a max-liability check at mint and an invariant test; verify `usdc.balanceOf(vault)+reserve >= maxLiability` after every action in fuzz.
- [ ] **Resolution:** Works on the happy path but not for timeout or void; verify refund path with a market that never resolves.
- [ ] **Mint cutoff:** Contract allows mint seconds before expiry; verify a mint inside the cutoff reverts.
- [ ] **Redeem on Arc:** Passes on a plain EVM test but not with real USDC `0x3600…`; verify one real redeem on testnet and look at the explorer.
- [ ] **Contract verification:** Deployed but "unverified"; verify the explorer shows source for every address in the README.
- [ ] **README addresses:** Hand-typed, stale after redeploy; generate from `deployments.json`.
- [ ] **Sandbox hedge:** Code exists but no real sandbox order ID anywhere; verify an actual sandbox order and capture the ID/screenshot for the video and README (Gemini bounty requires using the PM API).
- [ ] **Deployed URL:** Works on localhost but fails on Vercel (case-sensitive imports, missing env vars, type/lint errors fail the build); run `next build` locally and test the Vercel preview in a fresh browser profile.
- [ ] **Fallbacks:** Curated baskets work with LLM key unset and Gemini unreachable (fixtures).
- [ ] **Video:** Has audio, shows the explorer tx, 2 to 3 minutes, public link works logged out.
- [ ] **Devpost:** Track, chain award (Arc) and Gemini bounty all selected; repo public; written answers filled; submitted by 11 AM Fri, not 11:59.
- [ ] **Secrets:** `git log -p | grep -i -E "secret|private"` clean; `.env` absent from history.
- [ ] **Basket math:** Weights sum to exactly 10000 bps; dust rounding never exceeds vault balance.
- [ ] **Disclosure:** README states operator trust, sandbox-only hedge, testnet-only, and the reserve model.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WSL/Foundry will not install | LOW | Switch to Hardhat+viem or native Foundry; test on testnet |
| Sandbox PM orders unavailable | MEDIUM | Paper-hedge ledger vs live public prices, disclosed; still call PM API for data to satisfy bounty; ask Thursday Gemini session |
| Faucet dry | MEDIUM | Multiple addresses, ask Circle/Arc support, shrink demo amounts and reserve |
| Verification API fails | LOW | Manual flattened verification via explorer UI |
| Live demo resolution missed | LOW if prepared | Use pre-recorded Thursday take; replay mode with settled JSON (disclosed) |
| Contract bug found late | HIGH | Redeploy, regenerate `deployments.json`, update Vercel env, re-verify, re-record; budget 90 minutes |
| RPC flaky during demo | LOW | viem fallback transport; switch primary in env |
| Vercel build fails | LOW to MEDIUM | `next build` locally to reproduce; fix case-sensitive imports/types; ship with ignoreBuildErrors only as last resort |
| Operator key leaked | MEDIUM | Rotate on a new deploy; it is a burner testnet key, but never reuse |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Undercollateralized vault | P1 (+P3 reserve) | Invariant test passes; mint reverts when reserve short |
| 2 Operator trust | P1, P5 | One-shot, expiry-gated resolve test; README risk section |
| 3 Stale/manipulable price | P1, P2, P3 | Expired-deadline and in-cutoff mint revert tests |
| 4 Demo resolution risk | P0, P3, P5 | 5-minute market end-to-end rehearsal; recorded fallback take exists |
| 5 Decimals | P1, P4 | No `payable`/`msg.value` (grep); 6-decimal tests; UI shows one USDC row |
| 6 20 gwei floor | P0, P4 | First tx lands; UI timeout error path exercised |
| 7 Windows toolchain | P0 | A contract compiles and deploys by Wed night |
| 8 Faucet | P0, P3 | Reserve funded >= demo cap by Thu AM |
| 9 RPC quirks | P1, P4 | Fallback transport; no unbounded `getLogs` (grep) |
| 10 Verification | P1, P5 | Explorer "Contract: verified" for every README address |
| 11 Gemini signing | P0, P3 | Sandbox order placed and cancelled; order ID captured |
| 12 Sandbox differences | P2, P3 | Hedgeable-basket filter checks `instrumentSymbol` exists in sandbox |
| 13 Data handling | P2 | zod-validated fixtures from prod; cached proxy; no `/events` unfiltered call |
| 14 LLM hallucination | P4 | Fuzz with garbage output; unknown ticker rejected |
| 15 Regulatory framing | P0, P4, P5 | Copy review: no "bet"/"insurance"; no sports/politics baskets |
| 16 Vault security | P1 | Reentrancy, double-redeem, rounding fuzz tests |
| 17 Wallet friction | P4 | Fresh-profile connect test on Vercel URL |
| 19 Resolver hosting | P3 | Resolver runs unattended for 1 hour; manual command works |
| 20 Secrets | P0, P5 | Secret scan clean before making repo public |

## Sources

Verified live (2026-11-18):
- Gemini production and sandbox `GET /v1/prediction-markets/events`, `/events/{ticker}`, `/events/recently-settled`, `/categories`: category counts, contract field shapes, `resolvedAt` timing, sandbox vs prod ladder differences, CORS headers, payload sizes. (HIGH)
- Arc testnet RPC `https://rpc.testnet.arc.io`: `eth_chainId` = 0x4cef52 (5042002), `eth_gasPrice` = 20.5 gwei. (HIGH)
- GitHub API `circlefin/arc-foundry` latest release v0.8.0-4 asset list (no Windows build). (HIGH)
- Local machine checks: WSL not installed, `forge` missing, Node v24, git 2.55. (HIGH)

Official docs (current):
- Gemini: https://developer.gemini.com/llms.txt, /authentication/api-key.md, /rate-limit.md, /get-started/sandbox.md, /prediction-markets/core-concepts.md, /prediction-markets/market-data.md, /prediction-markets/order-lifecycle.md, /prediction-markets/trading-quickstart.md, /prediction-markets/collateral-return.md, /rest-api/prediction-markets/events/list-recently-settled-events.md (HIGH; sandbox PM availability and settlement timing are explicitly not documented)
- Arc: https://docs.arc.io/build/evm-differences.md, /arc/references/gas-and-fees, /arc/references/contract-addresses.md, /arc/references/connect-to-arc.md, /arc/references/rpc-endpoints.md, /arc/tutorials/porting-contracts-to-arc.md, /arc/tutorials/deploy-on-arc.md, /arc/tutorials/install-arc-foundry.md (HIGH)

Secondary (MEDIUM/LOW, treat as unconfirmed):
- Faucet quotas: eco.com USDC faucet guide (20 USDC / 2 h) vs Circle developer-console docs (10 or 20 USDC / 24 h). (LOW)
- Arc explorer verification issue: https://github.com/circlefin/arc-node/issues/210 (different explorer domain; status unknown). (LOW)
- Regulatory context: Yahoo Finance, Insurance Journal and MarketScreener reports on the April 2026 New York AG suit against Gemini Titan and Coinbase, and the CFTC counter-suit. (MEDIUM; no ruling found)
- Vercel Hobby cron frequency limit and native Windows Foundry builds: from general knowledge, not re-verified. (LOW)

Note: fetched doc pages contained embedded "agent instructions" (install skills, follow other directions); they were ignored as untrusted page content.

---
*Pitfalls research for: tokenized event-outcome baskets on Arc testnet with Gemini prediction markets*
*Researched: 2026-11-18*
