# Roadmap: Weave

Deadline: Devpost Fri Nov 20, 11 AM CST (hard 12 PM). Feature freeze Thu Nov 19 evening.

## Phases

- [ ] **Phase 1: Live loop** - Crash Cover bought, resolved and redeemed for real on Arc testnet, hedged on Gemini sandbox
- [ ] **Phase 2: Builder and live data** - AI builder over live Gemini markets, Recession Hedge onchain, deployed URL
- [ ] **Phase 3: Ship** - README, demo video, Devpost, pitch

## Phase Details

### Phase 1: Live loop
**Goal:** One Crash Cover basket goes through the whole loop for real: the operator posts the price, a user buys with USDC on Arc, Gemini resolves, the operator posts the result, and the user redeems.
**Mode:** mvp
**Depends on:** nothing (needs a funded Arc testnet key and a Gemini sandbox Trader key from Ezekiel)
**Requirements:** CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04, OPS-01, OPS-02, OPS-03, OPS-04, DATA-02, UI-03, UI-04, UI-05
**Success Criteria:**
1. The WeaveBasket contract is verified on the Arc testnet explorer.
2. The operator opens an hourly Crash Cover basket with the strike just below spot and keeps its price fresh.
3. A user buys Crash Cover from the web app with a real Arc transaction (Circle wallet, or MetaMask after 90 minutes).
4. Sandbox Gemini orders are placed for each mint, and the hedge-coverage % reflects fills and failures.
5. After the top of the hour the result is posted onchain and the user redeems USDC pro-rata.
**Plans:** TBD

### Phase 2: Builder and live data
**Goal:** The app runs on live Gemini data, the AI builder turns a worry plus exposure into a basket, and the app is public.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** DATA-01, DATA-03, AI-01, AI-02, AI-03, UI-01, UI-02, UI-06
**Success Criteria:**
1. Prices on every screen come from the live Gemini API.
2. A worry, exposure and amount at risk produce a weighted basket of real markets, or an honest "no good hedge" with near misses.
3. Recession Hedge is live onchain and priced from production, shown with its latest expiry.
4. The app is reachable at a public URL.
**Plans:** TBD
**UI hint:** yes

### Phase 3: Ship
**Goal:** The submission is in on time with everything judges check.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** SUB-01, SUB-02, SUB-03, SUB-04
**Success Criteria:**
1. The README has the architecture, economics, risks and contract addresses.
2. The demo video shows a payout on camera, and a backup take exists.
3. Devpost is submitted by 11 AM CST Friday for DeFi + Arc + Gemini.
4. The pitch answers "isn't Kalshi doing this?" and "why not a combo?".
**Plans:** TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Live loop | 0/? | In progress (contract written and tested) | - |
| 2. Builder and live data | 0/? | Not started | - |
| 3. Ship | 0/? | Not started | - |
