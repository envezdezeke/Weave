# Stack Research

**Domain:** Tokenized event-outcome baskets on Circle Arc testnet (Solidity + Next.js), priced from Gemini Prediction Markets, hedged on Gemini sandbox
**Researched:** 2026-11-18 (about 49 hours before the Devpost deadline)
**Confidence:** HIGH for chain parameters, Gemini REST/WS and package versions (probed live); MEDIUM for the Foundry-on-Windows path and wallet effort estimates; LOW where marked UNVERIFIED

Legend used throughout:
- **[LIVE]** I called it myself on 2026-11-18 and saw the result.
- **[DOCS]** Stated by official docs (URL cited), not independently executed.
- **[NPM]** Version read from the npm registry on 2026-11-18.
- **[UNVERIFIED]** Inference, third-party claim, or could not be checked. Spike before depending on it.

---

## 1. Arc Testnet: Verified Connection Parameters

| Parameter | Value | Source / status |
|-----------|-------|-----------------|
| Network name | Arc Testnet | [DOCS] https://docs.arc.io/arc/references/connect-to-arc.md |
| Chain ID | `5042002` (hex `0x4CEF52`) | [DOCS] same page; [LIVE] `eth_chainId` on `https://rpc.testnet.arc.io` returned `0x4cef52` |
| Native currency | USDC, **18 decimals** (gas token) | [DOCS] https://docs.arc.io/arc/references/evm-differences.md; viem's `arcTestnet` definition agrees [NPM viem@2.58.0] |
| Primary RPC (HTTP) | `https://rpc.testnet.arc.io` | [DOCS] + [LIVE]. Anonymous, open CORS, no API key (https://docs.arc.io/arc/references/rpc-endpoints.md) |
| Primary RPC (WS) | `wss://rpc.testnet.arc.io` | [DOCS] |
| Fallback RPCs | `https://rpc.blockdaemon.testnet.arc.io`, `https://rpc.drpc.testnet.arc.io`, `https://rpc.quicknode.testnet.arc.io` | [DOCS] rpc-endpoints page. May need provider API keys (not tested) |
| Legacy RPC host | `https://rpc.testnet.arc.network` | [LIVE] still returns chain ID `0x4cef52`. A community report says `.io` intermittently failed DNS (LOW, anecdotal). Use as an emergency fallback only |
| Block explorer | `https://explorer.testnet.arc.io` (Blockscout) | [DOCS] + [LIVE] HTTP 200, `/api/v2/stats` returns Blockscout JSON |
| Explorer API (for verify) | `https://explorer.testnet.arc.io/api/` | [DOCS] https://docs.arc.io/arc/tutorials/deploy-on-arc.md |
| Faucet | https://faucet.circle.com (pick "Arc Testnet") | [DOCS] + [LIVE] HTTP 200. Per-claim amount and rate limit **[UNVERIFIED]**: a third-party guide says 20 USDC per 2 hours per address, a Circle tutorial says 10 USDC. Plan for ~10 USDC and ask in Circle Discord/Telegram support if more is needed |
| Block time / finality | ~0.5 s blocks (explorer stats `average_block_time` ≈ 510 ms [LIVE]); single-confirmation finality | [DOCS] evm-differences page |
| Gas price floor | `maxFeePerGas` must be **>= 20 Gwei** or the tx is silently dropped with no receipt | [DOCS] https://docs.arc.io/arc/references/gas-and-fees.md; [LIVE] `eth_gasPrice` = `0x4d4cbdf80` (~20.8 Gwei), explorer shows slow/avg/fast 20.65/21.4/22.14 Gwei |
| Fee cost | ~$0.001 target per ERC-20 transfer | [DOCS] gas-and-fees page (design target, not measured) |
| `eth_getLogs` limit | Max **10,000 blocks** per query (error `-32012`). At 0.5 s blocks that is only ~83 minutes of history | [DOCS] rpc-endpoints page. Plan an indexer/explorer-API approach, see Pitfalls below |
| EVM baseline | Osaka hard fork | [DOCS] evm-differences page |
| Mainnet (not for us) | Chain ID `5042`, `https://rpc.mainnet.arc.io`, `https://explorer.arc.io` | [DOCS] connect-to-arc page |

### Testnet token and contract addresses (all [DOCS] https://docs.arc.io/arc/references/contract-addresses.md)

| Contract | Address | Decimals |
|----------|---------|----------|
| **USDC (ERC-20 interface of the native token)** | `0x3600000000000000000000000000000000000000` | **6** ([LIVE] `eth_call decimals()` returned 6; address has proxy bytecode) |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 |
| USYC | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` | 6 |
| WETH | `0x2c4047028a72803939b6fb674D01bC059B5C4961` | 18 |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | n/a (also wired into viem's `arcTestnet`) |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | n/a |
| CREATE2 factory (Arachnid) | `0x4e59b44847b379578588920cA78FbF26c0B4956C` | n/a |
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | n/a |
| Blocklisted test address (transfers revert) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | n/a (Hardhat/Anvil account #1; never use it as a test user) |

### The one decimals rule that decides contract design

Native USDC has 18 decimals, the ERC-20 interface at `0x3600...0000` has 6, and both are the **same balance**. Hence:
- Our contracts must be **ERC-20 only**: `IERC20(USDC).transferFrom/transfer/balanceOf` with 6-decimal math. **Never use `payable`/`msg.value` for deposits and never mix `msg.value` with `balanceOf` math** (they differ by 10^12). [DOCS] evm-differences page.
- A native transfer can revert even with sufficient balance (blocklist, zero address). Do not forward native value.
- `PREVRANDAO` is 0, EIP-4788 absent, blobs rejected: irrelevant to us, do not use block-based randomness.
- `block.timestamp` is non-decreasing at 1 s granularity, not strictly increasing: do not require strictly increasing timestamps in resolution logic.
- Showing balances in the frontend: use ERC-20 `balanceOf` (6 decimals, `formatUnits(x, 6)`). `eth_getBalance` is 18 decimals; a zero `balanceOf` does not prove a zero native balance.

---

## 2. Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Foundry (stock `forge`/`cast`) | v1.9.0 [LIVE: GitHub release 2026-11-02 has `foundry_v1.9.0_win32_amd64` asset] | Compile, test, deploy, verify Solidity | Native Windows binary exists. Arc's own tutorial deploy/verify flow is Foundry-shaped (`create`, `verify-contract --verifier blockscout`), which is the same CLI surface in stock forge. See decision in section 3 |
| Solidity | `0.8.30` pinned in `foundry.toml`, `evm_version = "prague"` | Basket token + vault | Pin an explicit EVM target below Osaka so the compiler never emits an opcode Arc rejects. **[UNVERIFIED]** that solc has a fully supported `osaka` target and that Arc docs prescribe a value (Arc docs give no compiler guidance, https://docs.arc.io/build/deploy-on-arc.md). Smoke-test with a trivial deploy in the first hour |
| OpenZeppelin Contracts | 5.6.1 [NPM] | `ERC20`, `SafeERC20`, `Ownable`/`AccessControl`, `ReentrancyGuard`, `Pausable` | Do not hand-roll token or access control. Install via `forge install OpenZeppelin/openzeppelin-contracts@v5.6.1` (tag name **[UNVERIFIED]**, confirm with `git ls-remote --tags`) |
| Next.js (App Router) | 16.4.6 [NPM]; requires Node >= 20.9 | Frontend + server route handlers (wallet ops, Gemini proxy, LLM call) | Matches brief; route handlers keep secrets (Circle key, Gemini keys, LLM key) server-side; one deploy to Vercel |
| React | 19.x | UI | Required by Next 16 peer range (`^19.0.0`) [NPM] |
| TypeScript | >= 5.9.3 | Typing | wagmi 3.x declares `typescript >= 5.9.3` as a peer [NPM] |
| viem | 2.58.0 [NPM] | All chain reads/writes in TS (public client, ABI encoding, `formatUnits`) | Ships `arcTestnet` in `viem/chains` (id 5042002, all 4 RPCs, explorer + API URL, Multicall3) [LIVE: read from the published tarball]. Do not hand-write a chain object |
| Tailwind CSS | 4.3.5 [NPM] | Styling | Brief says Tailwind. v4 uses CSS-first config via `create-next-app` default |
| Node.js | 24.x (machine has v24.20.0) | Runtime | Satisfies Circle SDK (`>=22`) and Gemini SDK server entry (`>=22.4.0`) [NPM engines] |

### Wallet layer (the "invisible crypto" decision)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Circle Developer-Controlled Wallets** (EOA, `ARC-TESTNET`) | `@circle-fin/developer-controlled-wallets` 10.8.1 [NPM]; Node >= 22 | **Primary.** Server creates one wallet per demo user, signs and submits `approve`/`buy`/`redeem` from Next.js route handlers | Arc is listed as supported for developer-controlled (EOA, SCA), user-controlled (EOA, SCA) and modular (MSCA) wallets, chain code `ARC-TESTNET` [DOCS] https://developers.circle.com/wallets/supported-blockchains.md. SDK exposes `createWalletSet`, `createWallets`, `createContractExecutionTransaction`, `getTransaction`, `registerEntitySecretCiphertext` and the `ARC-TESTNET` literal [LIVE: grepped the published package types]. Zero wallet popups, zero extension install, nothing for the browser to misconfigure. Circle-native, which the Arc award judges can see |
| wagmi + viem injected connector | wagmi 3.7.11 [NPM]; peers `viem 2.x`, `@tanstack/react-query >= 5` | **Fallback / "bring your own wallet" toggle.** MetaMask or Rabby connect, `useWriteContract` against the same ABI and addresses | Costs ~2 h and gives a second path if Circle onboarding stalls. Not needed on the primary path |
| @tanstack/react-query | 5.108.0 [NPM] | Server-state cache for NAV/odds polling; required by wagmi | Use even without wagmi for polling Gemini via our own API |

Effort estimates below are my own, for a team new to crypto using AI help ([UNVERIFIED] estimates, not sourced):

| Wallet option | Effort | Key risk | Verdict |
|---------------|--------|----------|---------|
| Circle dev-controlled wallets (EOA) | 3-5 h incl. Console signup, API key, entity-secret registration, wallet set, treasury funding, drip-to-user helper | Custodial (disclose it in README risk section); Console setup friction; faucet rate limits on funding the treasury | **Primary.** Time-box the spike to 90 minutes |
| Privy embedded wallets + `@privy-io/wagmi` | 2-4 h | No official Privy-on-Arc recipe found; a community write-up reports external wallets stayed on the wrong chain during sign-in and needed a forced switch (LOW, anecdotal). Users must be funded with USDC for gas anyway | **Fallback #2** if Circle Console blocks us. Arc docs list Privy among supported AA/wallet providers (https://docs.arc.io/arc/tools/account-abstraction.md) |
| Circle Modular Wallets (passkeys, MSCA) | 6-10 h | Needs Circle client key, WebAuthn domain setup, ERC-4337 userOp monitoring. Arc Testnet listed as supported chain path `arcTestnet` [DOCS] https://developers.circle.com/sdks/modular/web-sdk.md, but **whether Gas Station sponsors Arc is UNVERIFIED** (supported-blockchains page is silent) | **Do not use** for a 48 h build |
| Circle User-Controlled Wallets (social/email/PIN) | 6-10 h | Email OTP needs your own SMTP; social needs OAuth client setup; mobile-oriented SDK (`@circle-fin/w3s-pw-web-sdk` 1.1.11) | **Do not use** |
| Plain MetaMask + wagmi | 1-2 h | Not "invisible"; judges for the Consumer-style UX criterion see a wallet popup. Users need to add network and get faucet USDC | Fallback only (the toggle above) |

Gas for end users: Arc charges gas in USDC, so a user holding only USDC can already transact. "No separate gas token" is true natively; no paymaster is required. Gas Station / ERC-4337 sponsorship is optional polish and unverified on Arc, skip it.

### Gemini integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Gemini public REST (plain `fetch`) | n/a | Event discovery, odds for NAV, resolution status | No key, no SDK, one file. Verified live (section 5) |
| Gemini public WebSocket | `wss://ws.gemini.com` (prod), `wss://ws.sandbox.gemini.com` (sandbox) | Live best bid/ask ticker in the UI | Verified live, unauthenticated (section 5) |
| `@gemini-markets/sdk` | 0.1.1 [NPM, last modified 2026-09-25]; Node >= 22.4 on server entry; pre-1.0 | **Only** for signed sandbox orders (`HmacAuth`) in the operator hedge worker | Saves hand-rolling HMAC-SHA384 signing. Pre-1.0: pin exact version. Hand-rolled signing is a ~20 line fallback (headers documented, section 5) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | latest | Validate Gemini responses and LLM JSON output | Always. LLM must return `{symbol, weight}` list; validate against fetched `instrumentSymbol`s so the model cannot invent markets |
| @anthropic-ai/sdk | 1.10.0 [NPM] | AI basket builder (free text worry -> market selection + weights) | Brief suggests Claude; call only from a route handler. Not researched in depth here (outside this dimension) |
| dotenv / Next `.env.local` | n/a | Secrets | `.env*` must be gitignored from commit 1 |
| @privy-io/react-auth + @privy-io/wagmi | 3.52.0 / 4.0.20 [NPM] | Only if Circle dev-controlled spike fails | Fallback #2 |
| @circle-fin/modular-wallets-core | 1.0.16 [NPM] | Not used | Listed so nobody installs it by accident |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Foundry stock `forge`, `cast` v1.9.0 | Build, test, deploy, verify, read chain from CLI | Download `foundry_v1.9.0_win32_amd64.zip` from https://github.com/foundry-rs/foundry/releases/tag/v1.9.0 and put `forge.exe`/`cast.exe` on PATH (a copy is already downloaded, unexecuted, at `C:\Users\ezeki\AppData\Local\Temp\claude\51ffb1690ad95b2e\127b1c10-3235-4b41-a9b2-98dc79548c84\scratchpad\forgebin`). `foundryup` under Git Bash is [UNVERIFIED] on this machine |
| Blockscout explorer | Contract verification + read/write UI + REST API | `https://explorer.testnet.arc.io/api/` for `forge verify-contract`; `https://explorer.testnet.arc.io/api/v2/...` for history queries (see getLogs limit) |
| Vercel | Deploy Next.js | Brief requires deployed URL; set env vars in dashboard, never commit |
| Circle Developer Console | https://console.circle.com (API key + entity secret) | Needed only for the Circle wallet path |

---

## 3. Foundry vs Hardhat (decision)

**Use stock Foundry v1.9.0 on native Windows. Do not use Arc Foundry on this machine.**

Facts:
- Arc ships its own fork, "Arc Foundry" (`arc-forge`, `arc-cast`, `arc-anvil`), latest release v0.8.0-4 (2026-11-02). Precompiled binaries exist only for Linux x86_64/arm64 and macOS Apple Silicon; **Windows x86_64 is build-from-source** [LIVE: README at https://github.com/circlefin/arc-foundry/blob/main/README.md; releases API asset list shows only linux and apple-darwin tarballs]. The docs say "Windows with WSL" [DOCS install-arc-foundry page], and **WSL is not installed on this machine** [LIVE: `wsl -l -v` says not installed]. Installing WSL or compiling Rust is a poor use of hour one.
- Arc Foundry's value is runtime fidelity: `arc-forge test --network arc` and `arc-anvil --network arc` reproduce native-USDC, blocklist and decimal behaviour that vanilla Anvil cannot (https://docs.arc.io/arc/tutorials/troubleshoot-with-arc-foundry.md). We neutralize that gap by design instead (ERC-20-only USDC, no `msg.value`, tests with a 6-decimal `MockUSDC`, plus a real-testnet smoke script).
- Deploying to Arc with stock `forge` is a normal JSON-RPC flow (chain ID, gas price and `eth_call` all behave standardly: [LIVE] cast-style calls via raw JSON-RPC returned correct results). **I did not run stock forge against Arc: the sandbox blocked executing the downloaded binary. That a stock `forge create/script --broadcast` lands a tx on Arc is therefore [UNVERIFIED]; make it the first spike (Phase 1, hour 1).** If it fails, fall back to Hardhat 3.
- Fork tests that touch the real USDC proxy at `0x3600...0000` with stock forge will likely misbehave (it relies on Arc-specific precompile logic per the docs): **do not write fork tests against real USDC.**

Why not Hardhat 3.22.0 [NPM]: no official Arc page for it (the Arc llms index has none; only unofficial mirrors show a config), slower compile/test loop, tests in TypeScript add a second place for decimals bugs. It remains the **fallback** if forge misbehaves on Windows: `hardhat` 3.22.0 + `@nomicfoundation/hardhat-toolbox-viem` 5.0.7, network `{ url: "https://rpc.testnet.arc.io", chainId: 5042002, accounts: [PRIVATE_KEY] }`, explorer verify via Blockscout API `https://explorer.testnet.arc.io/api` (config shape is from an unofficial mirror: [UNVERIFIED]).

### Deploy and verify commands (flags from official Arc tutorial, with `forge`/`cast` substituted for `arc-forge`/`arc-cast`)

```bash
# .env (gitignored)
ARC_TESTNET_RPC_URL="https://rpc.testnet.arc.io"
PRIVATE_KEY="0x..."          # throwaway deployer key; fund it at https://faucet.circle.com (Arc Testnet)

cast wallet new                                  # generates a deployer key
cast chain-id --rpc-url $ARC_TESTNET_RPC_URL     # expect 5042002
forge build
forge test
forge script script/Deploy.s.sol --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast
# or single contract:
forge create src/BasketVault.sol:BasketVault --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast --constructor-args 0x3600000000000000000000000000000000000000
forge verify-contract <ADDR> src/BasketVault.sol:BasketVault \
  --chain-id 5042002 --verifier blockscout --verifier-url https://explorer.testnet.arc.io/api/
```
Source of the flag set: https://docs.arc.io/arc/tutorials/deploy-on-arc.md [DOCS]. Gas: forge reads `eth_gasPrice` (~20.8 Gwei [LIVE]), which already clears the 20 Gwei floor. If a tx hangs with no receipt, re-send with an explicit higher price (`--with-gas-price 25gwei` for `forge script`, `--gas-price 25gwei` for `create/send`; flag names **[UNVERIFIED]** on stock v1.9.0, check `forge script --help`).

`foundry.toml` starting point (values **[UNVERIFIED]** until the first deploy succeeds):

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.30"
evm_version = "prague"
optimizer = true
optimizer_runs = 200
```

---

## 4. Frontend with viem on Arc

```ts
import { createPublicClient, http, fallback, formatUnits, parseUnits } from "viem";
import { arcTestnet } from "viem/chains";   // exists in viem 2.58.0 (id 5042002)

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: fallback([
    http("https://rpc.testnet.arc.io"),
    http("https://rpc.blockdaemon.testnet.arc.io"),
  ]),
});

export const USDC = "0x3600000000000000000000000000000000000000" as const; // 6 decimals (ERC-20 view)
export const fmtUsdc = (v: bigint) => formatUnits(v, 6);
export const toUsdc = (s: string) => parseUnits(s, 6);
```

If wagmi fallback is built: `createConfig({ chains: [arcTestnet], transports: { [arcTestnet.id]: http() }, connectors: [injected()] })`. On every write, pass an explicit `maxFeePerGas >= 25n * 10n ** 9n` as a guard against the silent-drop floor (viem's estimate should already be above 20 Gwei, but a drop is invisible and costly in a demo). The wallet "add network" payload (EIP-3085) is in https://docs.arc.io/integrate/wallets/add-arc-to-a-wallet.md [DOCS]: `chainId 0x4CEF52`, `nativeCurrency {USDC, 18}`, RPC and explorer as in section 1.

Quick start for the Circle path (SDK names verified in the package types; the argument shapes below come from Circle docs for `createWallets` and from my knowledge for contract execution, so confirm against https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet.md before use; I could not fetch the contract-execution doc page: 404):

```ts
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});
const { data } = await client.createWalletSet({ name: "event-baskets" });
const w = await client.createWallets({ walletSetId: data!.walletSet!.id, blockchains: ["ARC-TESTNET"], count: 1, accountType: "EOA" });
// then client.createContractExecutionTransaction({ walletId, contractAddress, abiFunctionSignature, abiParameters, fee: { type: "level", config: { feeLevel: "MEDIUM" } } })
// and poll client.getTransaction({ id }) until COMPLETE
```
(`accountType: "EOA"` is chosen over `"SCA"` because Gas Station on Arc is unconfirmed; with USDC as gas the treasury just tops the EOA up.) Circle's own Arc deploy tutorial used `ARC-TESTNET`, fee level `MEDIUM` and `SCA` and reports "Transaction status may show PENDING immediately after deployment" [DOCS] https://docs.arc.io/arc/tutorials/deploy-contracts.md, so poll rather than assume.

---

## 5. Gemini Prediction Markets API (verified)

Docs index: https://developer.gemini.com/llms.txt [LIVE]. Official OpenAPI: https://developer.gemini.com/specs/openapi/prediction-markets.yaml, whose `servers` are **Production `https://api.gemini.com`** and **Sandbox `https://api.sandbox.gemini.com`** [DOCS].

### Public REST (no key) [LIVE all]

| Endpoint | Notes |
|----------|-------|
| `GET /v1/prediction-markets/events?status=active&category=Crypto&limit=N&offset=M&search=...` | Returns `{data:[...], pagination}`. Prod and sandbox both respond without auth |
| `GET /v1/prediction-markets/events/{eventTicker}` | e.g. `BTC2611182200` (also in the OpenAPI path list) |
| `GET /v1/prediction-markets/events/recently-settled?category=...&limit<=500` | **Only events settled in the last 24 h**, newest first [DOCS] https://developer.gemini.com/rest-api/prediction-markets/events/list-recently-settled-events |
| `GET /v1/prediction-markets/categories` | Returned `Live, Sports, Midterms, Crypto, College Football, Commodities, Economics, Economy, Fun/Culture, Media, Politics, Tech, Business, Weather, Culture, Other, Finance` |
| Also in spec | `/events/upcoming`, `/events/newly-listed`, `/events/{eventTicker}/strike`, `/volume/{date}`, `/volume/{date}/hourly`, `/terms`, combos |

Observed field shapes [LIVE] (all prices and quantities are **strings**; preserve precision):
- Event: `id, title, slug, type ("binary"|"categorical"), category, ticker, status ("active"|"settled"), contracts[], expiryDate, resolvedAt (once settled), series, volume, volume24h, tags, termsLink`.
- Contract: `id, label, ticker, **instrumentSymbol** (e.g. `GEMI-BTC2611182200-HI61750`), marketState ("open"|"closed"), status, expiryDate, strike {type, value}, source (index e.g. `LS-LRRR-XBTUSD`), prices {buy{yes,no}, sell{yes,no}, bestBid, bestAsk, lastTradePrice?}, priceIncrement "0.01", priceMinimum "0.01", quantityIncrement "0.01", quantityMinimum "0.01"`.
- **Resolution** (what the operator posts onchain), seen on a settled contract: `status:"settled"`, `marketState:"closed"`, **`resolutionSide:"yes"|"no"`**, `resolvedAt`, `settlementValue` (observed index price). The event also carries `resolvedAt` and `status`. Do not infer settlement from `expiryDate` alone; Gemini docs say to follow contract status and settled-positions data (https://developer.gemini.com/prediction-markets/order-lifecycle.md).
- Payout semantics: price is implied probability; the docs' binary example uses a $1.00 settlement value [DOCS https://developer.gemini.com/prediction-markets/core-concepts.md]. YES and NO share one YES-space `instrumentSymbol`; NO price = 1 - YES price.
- Prices are `0.01`-`0.99`; the quoted tick and minimum size are 0.01.

Market cadence observed [LIVE, same on prod and sandbox listings]: **5-minute BTC markets (`BTC05M<yyMMddHHmm>`), 15-minute (`BTC15M...`), hourly (`BTC2611181800`), daily 5 PM ET (`BTC2611182200`, i.e. 22:00Z), and later dailies (`BTC2611202200`, `BTC2611302200`)**, plus ETH equivalents on prod. The 5-minute markets mean a real resolution can happen on camera within minutes, not only at 5 PM ET; for the live demo prefer a `BTC05M` or `BTC15M` market (these are `binary`, symbol suffix `-UP`) over waiting for a daily. Note: `BTC2611202200` (Fri Nov 20, 5 PM ET) resolves after the Devpost deadline, so it cannot back the submitted video. Daily BTC events are `categorical` ladders (one contract per strike, ticker suffix `HI<strike>`), basket legs should reference `instrumentSymbol`, not event.

Caveat: sandbox and prod listings differ in what is active at a moment (sandbox listed `BTC15M2611181715` where prod listed `BTC05M...`). A hedge leg must be placed on a symbol that exists in **sandbox**, so fetch the symbol list from `api.sandbox.gemini.com` for the hedge worker.

Rate limits for the public endpoints are **[UNVERIFIED]** (not documented on the pages read). Proxy through Next.js route handlers with a 5-10 s cache so many browser clients do not each hit Gemini.

### Public WebSocket [LIVE]

- Prod: `wss://ws.gemini.com`; Sandbox: `wss://ws.sandbox.gemini.com` ([DOCS] https://developer.gemini.com/prediction-markets/websocket/introduction.md for prod, https://developer.gemini.com/get-started/sandbox.md for sandbox).
- Public streams need no auth. Subscribe (verified working on both hosts):
  ```json
  {"id":"1","method":"SUBSCRIBE","params":["GEMI-BTC05M2611181715-UP@bookTicker"]}
  ```
  Reply `{"id":"1","status":200}`, then ticks like `{"u":...,"s":"gemi-btc05m...-up","b":"0.0100","B":"71.00","a":"0.0700","A":"10.00","c":"0.0200","C":"3.33"}` where b/a = best bid/ask, B/A sizes, c/C last trade price/size. Empty `a` means no ask. (The docs page shows different field names for bookTicker (`u,E,s,b,B,a,A`); live output also includes `c,C`.)
- Other streams [DOCS] https://developer.gemini.com/prediction-markets/websocket/streams.md: `{symbol}@depth5|10|20[@100ms]`, `{symbol}@depth` (diff), `{symbol}@trade`.
- Tested only from Node's global `WebSocket`. Whether the server accepts a browser `Origin` is **[UNVERIFIED]**; safest design is a server-side poller/WS consumer, with the browser reading our own API.

### Sandbox trading auth [DOCS]

- Base: `https://api.sandbox.gemini.com` (REST), `wss://ws.sandbox.gemini.com` (WS), site `https://exchange.sandbox.gemini.com`, docs `https://docs.sandbox.gemini.com`. New sandbox accounts are credited with test balances (e.g. $100,000 USD) [DOCS https://developer.gemini.com/get-started/sandbox.md]. 2FA is on by default; for automation send the `GEMINI-SANDBOX-2FA=true` header or cookie and enter code `9999999`.
- Place order: `POST /v1/prediction-markets/order`. Body: `symbol` (exact `instrumentSymbol`), `orderType: "limit"`, `side: "buy"|"sell"`, `outcome: "yes"|"no"`, `quantity` (string), `price` (string 0-1), `timeInForce` (`good-til-cancel` default; also `immediate-or-cancel`, `fill-or-kill`), `makerOrCancel` (boolean; the SDK reference marks it required) [DOCS https://developer.gemini.com/prediction-markets/trading-quickstart.md, https://developer.gemini.com/tools/typescript-sdk/reference/predictions/order-management.md]. Other endpoints: `/order/cancel`, `/order/batch`, `/order/batch/cancel`, `/orders/active`, `/orders/history`, `/positions`, `/positions/settled`, `/terms/accept` (all POST except terms GETs) [DOCS OpenAPI path list].
- Prerequisites per docs: API key with the **Trader** role, Prediction Markets access, account funding, and accepted latest terms (`hasAcceptedLatest`, `POST /v1/prediction-markets/terms/accept`).
- Signing [DOCS https://developer.gemini.com/authentication/api-key.md]: headers `X-GEMINI-APIKEY`, `X-GEMINI-PAYLOAD` = base64 of JSON `{request: "<path>", nonce, ...params}`, `X-GEMINI-SIGNATURE` = hex(HMAC_SHA384(base64 payload, api_secret)), plus `Content-Length: 0`, `Content-Type: text/plain`, `Cache-Control: no-cache`. Nonce: Unix seconds within +/- 30 s of server time (or strictly increasing). Body is empty; parameters live in the payload. Keys are prefixed `account-` or `master-`.
- [LIVE] `POST https://api.sandbox.gemini.com/v1/prediction-markets/order` without auth returned **401**: the route exists on sandbox. **Whether sandbox actually fills prediction-market orders (matching engine / bot liquidity) is [UNVERIFIED]**: the sandbox docs page does not mention prediction markets at all, and the sandbox liquidity statement is about the spot book. **Phase 1 spike: create a sandbox account + API key, accept terms, place one `0.01`-size limit order on a sandbox `BTC05M...-UP` symbol, and read it back from `/orders/active`.** Gemini's bounty requirement ("uses the Gemini PM API") is already satisfied by public REST + WS reads; the sandbox hedge leg is a bonus that must degrade gracefully (README should say "paper hedge" if sandbox fills fail).
- Gemini support session Thu Nov 19, 7-8 PM CST (BRIEF.md) is the place to ask the sandbox-PM question directly; ask earlier in Telegram.

### TypeScript SDK [DOCS + NPM]

- Package **`@gemini-markets/sdk`** 0.1.1 (repo `github.com/gemini/developer-platform`), Node >= 22.4. The bare package path is not exported; import `@gemini-markets/sdk/server` or `@gemini-markets/sdk/browser` (https://developer.gemini.com/tools/typescript-sdk/quickstart.md). `@gemini/sdk` does not exist on npm (404).
- Server (signed) client:
  ```ts
  import { createClient, HmacAuth } from "@gemini-markets/sdk/server";
  const client = await createClient({
    env: "sandbox",   // required; SDK throws if omitted
    auth: new HmacAuth({ apiKey: process.env.GEMINI_API_KEY!, apiSecret: process.env.GEMINI_API_SECRET! }),
  });
  ```
- Calls: `client.predictions.listEvents({ status: ["active"], category: [...], limit })`, `getEvent({ eventTicker })`, `getCategories()`, `listRecentlySettledEvents()`, `placeOrder({ symbol, orderType:"limit", side, quantity, price, outcome, timeInForce, makerOrCancel })`, `cancelOrder({ orderId: 123n })` (orderId is a `bigint`), `getActiveOrders`, `getOrderHistory` (https://developer.gemini.com/tools/typescript-sdk/reference/predictions/events-and-discovery.md and `.../order-management.md`).
- Browser client for public data: `createClient({ env: "sandbox" })` from `/browser`; public WS: `client.websocket.public.bookTicker("SYMBOL")` (the doc examples use spot symbols like `"BTCUSD"`; prediction-market symbols through it are **[UNVERIFIED]**, raw WS above is verified).
- Recommendation: **use plain `fetch` for all reads and the raw WS for tickers; use the SDK only in the hedge worker**. Pre-1.0 SDK with thin docs is a risk you only need to take on the signed path.

---

## Installation

```bash
# Frontend (from repo root)
npx create-next-app@latest web --ts --tailwind --app --eslint --no-src-dir
cd web
npm install viem@2.58.0 @tanstack/react-query zod
npm install @circle-fin/developer-controlled-wallets@10.8.1     # primary wallet path
npm install @gemini-markets/sdk@0.1.1                            # operator/hedge worker only
npm install @anthropic-ai/sdk                                    # AI basket builder
# Fallback wallet path (only if built):
npm install wagmi@3.7.11
# Fallback #2 (only if Circle spike fails):
# npm install @privy-io/react-auth @privy-io/wagmi

# Contracts (from repo root, with forge.exe on PATH)
forge init contracts --no-git
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.6.1 --no-git
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Stock Foundry v1.9.0 | Arc Foundry v0.8.0-4 | Only on Linux/macOS (or after WSL). Use it for one fidelity check of the final contracts, since it reproduces native-USDC and blocklist behaviour |
| Stock Foundry | Hardhat 3.22.0 | If forge cannot deploy from Windows in the first-hour spike |
| Circle dev-controlled wallets | Privy embedded wallets | If Circle Console onboarding or entity-secret registration blocks us for more than 90 minutes; or if you want client-side signing with the same wagmi hooks as MetaMask |
| Plain `fetch` for Gemini reads | `@gemini-markets/sdk` browser client | If you want typed models and do not mind a 0.1.x dependency |
| viem `fallback` of Circle + Blockdaemon RPCs | single RPC | Never single-RPC for the demo day |
| Deploy via `forge` | Circle Contracts templates / Circle API deploy (https://docs.arc.io/arc/tutorials/deploy-contracts.md) | Not suitable: that tutorial only deploys prebuilt ERC-20/721/1155/Airdrop templates, no custom Solidity |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `msg.value` / `payable` deposits for USDC | 18-decimal native vs 6-decimal ERC-20 views of the same balance cause 10^12 errors; native transfers can revert on blocklist/zero address | `IERC20(0x3600...0000).transferFrom` with `SafeERC20`, 6 decimals |
| Fork tests of real USDC with stock anvil/forge | Stock EVM does not simulate Arc's USDC precompile logic (https://docs.arc.io/arc/tutorials/troubleshoot-with-arc-foundry.md) | `MockUSDC` (6 decimals) in unit tests + a testnet smoke script |
| `eth_getLogs` over wide ranges for basket history | Hard cap 10,000 blocks (~83 min at 0.5 s) | Store events in our own DB/KV as we emit them, or use Blockscout `https://explorer.testnet.arc.io/api/v2/...`; chunk by <= 9,999 blocks |
| Any tx with `maxFeePerGas` < 20 Gwei | Silently dropped, no receipt | Let tooling use `eth_gasPrice`, and set an explicit floor of 25 Gwei in app code |
| Circle Modular / User-Controlled wallets in a 48 h build | High setup cost, Gas Station on Arc unconfirmed | Dev-controlled EOA wallets |
| `msg.sender`-style assumptions around `selfdestruct`, `PREVRANDAO`, EIP-4788 | Behave differently on Arc | Do not use them |
| Mainnet Arc or Gemini production orders | Out of scope and risky | Arc testnet + Gemini sandbox only |
| Committing `.env`, Circle entity secret, Gemini secret, deployer key | Hard requirement in the brief | `.env.local` + Vercel env vars; add `.gitignore` before first commit |
| `@gemini/sdk` | Does not exist on npm | `@gemini-markets/sdk` |

## Stack Patterns by Variant

**If forge works on Windows (expected):** Foundry for contracts, Next.js route handlers for Circle wallet ops, no wagmi in the critical path.
**If forge fails in the hour-1 spike:** switch to Hardhat 3 + toolbox-viem; everything else unchanged (contract ABIs flow into viem the same way).
**If Circle Console/entity secret blocks us:** Privy embedded wallet with `@privy-io/wagmi`; add the viem `arcTestnet` chain to `PrivyProvider` `supportedChains` and force-switch to chain 5042002 on connect (community-reported need). Fund new wallets with a server "drip" of USDC from a treasury.
**If Gemini sandbox will not fill prediction-market orders:** keep real Gemini public REST+WS for pricing/resolution, and record the hedge as a simulated (paper) order in the operator log; disclose in README. The bounty only requires using the PM API.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| wagmi@3.7.11 | viem 2.x, react >= 18, TypeScript >= 5.9.3, @tanstack/react-query >= 5 | [NPM peerDependencies] |
| next@16.4.6 | react `^19.0.0`, node >= 20.9 | [NPM] |
| @circle-fin/developer-controlled-wallets@10.8.1 | node >= 22 | [NPM engines]. Circle's quickstart says Node 22.18+ |
| @gemini-markets/sdk@0.1.1 | node >= 22.4 (server entry) | [NPM engines] |
| @privy-io/wagmi@4.0.20 | viem ^2.57.8, wagmi >= 2, @privy-io/react-auth ^3 | [NPM peerDependencies] |
| viem@2.58.0 | contains `arcTestnet` chain | [LIVE: read tarball `chains/definitions/arcTestnet.ts`] |
| Solidity 0.8.30 + evm_version prague | OpenZeppelin 5.6.1 | [UNVERIFIED] solc/Arc fit; confirm in hour-1 deploy spike |

## Open Items for Phase Planners (spike first, in this order)

1. Install stock Foundry v1.9.0, `forge init`, deploy a trivial contract to Arc testnet with `forge create --broadcast`, verify with `--verifier blockscout`. Resolves the `solc 0.8.30 / prague` and stock-forge assumptions.
2. Create Gemini sandbox account + Trader API key, accept prediction-market terms, place one tiny sandbox order on a `BTC05M`/`BTC15M` symbol. Resolves the "do sandbox PM orders fill" gap.
3. Circle Console: API key, entity secret registration, wallet set, `createWallets` on `ARC-TESTNET`, one contract execution. Time-box 90 minutes, then fall back to Privy.
4. Check the real faucet amount/limit at https://faucet.circle.com before designing the user "drip" amount.
5. Check whether browsers can open `wss://ws.gemini.com` directly (Origin policy) before putting WS in client code.

## Sources

- https://docs.arc.io/ and https://docs.arc.io/llms.txt (index of all Arc docs pages) [DOCS]
- https://docs.arc.io/arc/references/connect-to-arc.md (chain ID, RPC, explorer, faucet) [DOCS, HIGH, cross-checked LIVE]
- https://docs.arc.io/arc/references/contract-addresses.md (USDC and other addresses) [DOCS, HIGH; USDC decimals cross-checked LIVE]
- https://docs.arc.io/arc/references/evm-differences.md, https://docs.arc.io/arc/references/gas-and-fees.md (decimals, 20 Gwei floor, finality) [DOCS, HIGH]
- https://docs.arc.io/arc/references/rpc-endpoints.md (RPC providers, `eth_getLogs` limit) [DOCS, HIGH]
- https://docs.arc.io/arc/tutorials/install-arc-foundry.md, https://docs.arc.io/arc/tutorials/deploy-on-arc.md, https://docs.arc.io/arc/tutorials/troubleshoot-with-arc-foundry.md (Arc Foundry flow and verify flags) [DOCS, HIGH]
- https://github.com/circlefin/arc-foundry/blob/main/README.md and releases (v0.8.0-4; Windows is build-from-source) [LIVE, HIGH]
- https://github.com/foundry-rs/foundry/releases (v1.9.0 with `foundry_v1.9.0_win32_amd64` asset) [LIVE, HIGH]
- https://docs.arc.io/integrate/wallets/add-arc-to-a-wallet.md (EIP-3085 params) [DOCS, HIGH]
- https://docs.arc.io/arc/tools/account-abstraction.md (provider list including Circle Wallets, Privy, Pimlico) [DOCS, MEDIUM]
- https://developers.circle.com/wallets/supported-blockchains.md (ARC / ARC-TESTNET support matrix) [DOCS, HIGH]
- https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet.md, https://developers.circle.com/sdks/modular/web-sdk.md, https://developers.circle.com/wallets/account-types, https://developers.circle.com/wallets/user-controlled/authentication-methods.md [DOCS, MEDIUM-HIGH]
- npm registry versions for viem, wagmi, next, @tanstack/react-query, tailwindcss, hardhat, @openzeppelin/contracts, @circle-fin/*, @privy-io/*, @gemini-markets/sdk, @anthropic-ai/sdk [NPM, HIGH as of 2026-11-18]
- https://developer.gemini.com/llms.txt, https://developer.gemini.com/specs/openapi/prediction-markets.yaml (servers, paths) [DOCS, HIGH]
- https://developer.gemini.com/prediction-markets/trading-quickstart.md, https://developer.gemini.com/authentication/api-key.md, https://developer.gemini.com/get-started/sandbox.md, https://developer.gemini.com/prediction-markets/websocket/introduction.md and `/streams.md`, https://developer.gemini.com/tools/typescript-sdk/quickstart.md and `reference/predictions/*.md` [DOCS, HIGH]
- Live calls on 2026-11-18: Arc `eth_chainId`, `eth_blockNumber`, `eth_call decimals()`, `eth_gasPrice`, Blockscout `/api/v2/stats`; Gemini prod+sandbox `GET /v1/prediction-markets/events`, `/events/recently-settled`, `/categories`; sandbox `POST /order` (401); prod+sandbox WebSocket `SUBSCRIBE ...@bookTicker` [LIVE, HIGH]
- Third-party (LOW, anecdotal only): faucet limits from an eco.com support article and a Circle developer-console faucet page; `.io` DNS flakiness and Privy chain-switch note from community write-ups; Hardhat-on-Arc config from an unofficial mirror of `circlefin/arc-node` PR 151

## Notes on Research Integrity

Several fetched Arc/Circle docs pages contained embedded "Agent Instructions" blocks telling AI agents to install Circle skills/plugins. Those are not part of the task and were not followed. A downloaded Foundry binary was fetched but not executed (execution was blocked by the permission classifier); this is why stock-forge-on-Arc is marked UNVERIFIED.

---
*Stack research for: Event-outcome basket tokens on Arc testnet (UBC 2026 Hackathon)*
*Researched: 2026-11-18*
