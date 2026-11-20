// Weave operator: opens the hourly Crash Cover basket, keeps its price fresh,
// and posts Gemini's results onchain. Run with Node 22+ (type stripping):
//
//   node --env-file=../.env operator/operator.ts
//
// Env: OPERATOR_KEY (0x... private key of the operator account), WEAVE_ADDRESS,
// optional RPC_URL (default Arc testnet), FUND_USDC (collateral per basket, default 20).
// The operator account needs testnet USDC, which is also Arc's gas token.

import { readFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  http,
  parseAbiItem,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { crashLegs, getEvent, type CrashLeg } from "../../web/src/lib/gemini.ts";
import { hedgeEnabled, hedgeMint } from "./hedger.ts";

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`missing env ${k}`);
  return v;
};

const RPC = env("RPC_URL", "https://rpc.testnet.arc.io");
const WEAVE = env("WEAVE_ADDRESS") as Address;
const FUND = parseUnits(env("FUND_USDC", "20"), 6);
const WEIGHTS = [7000, 3000]; // decision Q17: 70% BTC, 30% ETH
const CUTOFF_S = 5 * 60; // buying closes 5 minutes before the hour
const MAX_STALE_S = 120;
const FEE = 0.02;
const TICK_MS = 30_000;

const abi = JSON.parse(
  readFileSync(new URL("../artifacts/contracts/WeaveBasket.sol/WeaveBasket.json", import.meta.url), "utf8"),
).abi as Abi;

const account = privateKeyToAccount(env("OPERATOR_KEY") as Hex);
const pub = createPublicClient({ transport: http(RPC) });
const chain = defineChain({
  id: await pub.getChainId(),
  name: "weave",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const wallet = createWalletClient({ account, chain, transport: http(RPC) });

// side: the outcome the basket holds on that leg (Crash Cover holds "no"; default "no").
type MetaLeg = { symbol: string; ticker: string; label: string; side?: "yes" | "no" };
type Meta = { series: string; expires: string; legs: MetaLeg[] };
type Onchain = { id: bigint; meta: Meta; weights: number[]; results: number[]; closeTime: bigint; settled: boolean; extra: bigint };

// Recession Hedge (curated, decision Q5): YES legs priced from production,
// resolving Dec 2026 to Feb 2027, so it stays open through the demo.
const RECESSION: { weights: number[]; close: string; legs: MetaLeg[] } = {
  weights: [3500, 3500, 3000],
  close: "2026-12-31T00:00:00.000Z",
  legs: [
    { symbol: "GEMI-RECESSION26-2026", ticker: "RECESSION26", label: "US recession in 2026", side: "yes" },
    { symbol: "GEMI-SPXLOW26-SPXLE6300", ticker: "SPXLOW26", label: "S&P 500 low at or below 6,300", side: "yes" },
    { symbol: "GEMI-UNEMP2026-GT7", ticker: "UNEMP2026", label: "Unemployment above 7%", side: "yes" },
  ],
};
const RECESSION_FUND = parseUnits(env("RECESSION_FUND_USDC", "3"), 6);

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function send(functionName: string, args: unknown[]) {
  const hash = await wallet.writeContract({ address: WEAVE, abi, functionName, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  log(`  ${functionName} ok ${hash}`);
  return r;
}

// Recent baskets of every series, newest first (the chain is the source of truth).
async function recent(n = 14): Promise<Onchain[]> {
  const next = (await pub.readContract({ address: WEAVE, abi, functionName: "nextId" })) as bigint;
  const out: Onchain[] = [];
  for (let id = next - 1n; id >= 1n && out.length < n; id--) {
    const meta = JSON.parse((await pub.readContract({ address: WEAVE, abi, functionName: "metaOf", args: [id] })) as string) as Meta;
    const b = (await pub.readContract({ address: WEAVE, abi, functionName: "basket", args: [id] })) as readonly unknown[];
    out.push({ id, meta, weights: (b[0] as number[]).map(Number), results: (b[1] as number[]).map(Number), closeTime: b[2] as bigint, settled: b[8] as boolean, extra: (b[6] as bigint) - (b[5] as bigint) * (b[7] as bigint) });
  }
  return out;
}

async function ensureAllowance() {
  const usdc = (await pub.readContract({ address: WEAVE, abi, functionName: "usdc" })) as Address;
  const a = await pub.readContract({ address: usdc, abi: erc20Abi, functionName: "allowance", args: [account.address, WEAVE] });
  if (a < FUND * 100n) {
    const hash = await wallet.writeContract({ address: usdc, abi: erc20Abi, functionName: "approve", args: [WEAVE, 2n ** 255n] });
    await pub.waitForTransactionReceipt({ hash });
    log("approved USDC");
  }
}

async function open(legs: CrashLeg[]) {
  const expires = legs[0].expires;
  const meta: Meta = {
    series: "crash-1h",
    expires,
    legs: legs.map((l) => ({ symbol: l.symbol, ticker: l.ticker, label: l.label })),
  };
  const close = BigInt(Math.floor(Date.parse(expires) / 1000) - CUTOFF_S);
  log(`open Crash Cover for ${expires}: ${legs.map((l) => `${l.asset} ${l.label}`).join(", ")}`);
  const r = await send("createBasket", [WEIGHTS, close, MAX_STALE_S, JSON.stringify(meta)]);
  const next = (await pub.readContract({ address: WEAVE, abi, functionName: "nextId" })) as bigint;
  await send("fund", [next - 1n, FUND]);
  return r;
}

// Ask for the side the basket holds. NO ask = 1 - YES bid. No ask: no price.
async function legAsk(l: MetaLeg) {
  const e = await getEvent(l.ticker);
  const c = e.contracts.find((x) => x.instrumentSymbol === l.symbol);
  const v = (l.side ?? "no") === "yes" ? c?.prices?.bestAsk : c?.prices?.bestBid;
  if (v == null || v === "") return null;
  return (l.side ?? "no") === "yes" ? Number(v) : 1 - Number(v);
}

async function price(b: Onchain) {
  const asks = await Promise.all(b.meta.legs.map(legAsk));
  if (asks.some((a) => a === null)) return log(`  basket ${b.id}: a leg has no ask, price not posted`);
  const p = asks.reduce((s, a, i) => s + (a as number) * (b.weights[i] / 10_000), 0) * (1 + FEE);
  const units = BigInt(Math.ceil(p * 1e6));
  await send("postPrice", [b.id, units]);
}

async function resolve(b: Onchain) {
  for (const [i, l] of b.meta.legs.entries()) {
    if (b.results[i] !== 0) continue;
    const e = await getEvent(l.ticker);
    const c = e.contracts.find((x) => x.instrumentSymbol === l.symbol);
    const side = c?.resolutionSide?.toLowerCase();
    if (side !== "yes" && side !== "no") continue; // not resolved yet
    // The leg pays when Gemini resolves to the side the basket holds.
    const evidence = `${l.symbol} resolutionSide=${side} resolvedAt=${(c as { resolvedAt?: string }).resolvedAt ?? ""}`;
    log(`resolve basket ${b.id} leg ${i}: ${evidence}`);
    await send("resolveLeg", [b.id, i, side === (l.side ?? "no"), evidence]);
  }
}

// Hedge every new mint on the Gemini sandbox. Arc caps getLogs at 10k blocks.
let lastBlock: bigint | null = null;
const minted = parseAbiItem("event Minted(uint256 indexed id, address indexed to, uint256 amount, uint256 cost)");
async function hedgeNewMints() {
  const head = await pub.getBlockNumber();
  if (lastBlock === null) lastBlock = head;
  if (head <= lastBlock) return;
  const from = head - lastBlock > 9_000n ? head - 9_000n : lastBlock + 1n;
  const logs = await pub.getLogs({ address: WEAVE, event: minted, fromBlock: from, toBlock: head });
  lastBlock = head;
  for (const l of logs) {
    const id = l.args.id!;
    const meta = JSON.parse((await pub.readContract({ address: WEAVE, abi, functionName: "metaOf", args: [id] })) as string) as Meta;
    const tokens = Number(l.args.amount);
    if (!hedgeEnabled) {
      log(`mint ${tokens} on basket ${id}: unhedged (no sandbox key)`);
      continue;
    }
    if (meta.series !== "crash-1h") {
      log(`mint ${tokens} on basket ${id} (${meta.series}): not hedged; sandbox lists only crypto markets`);
      continue;
    }
    const fills = await hedgeMint({ id, tokens, tx: l.transactionHash }, meta.legs, WEIGHTS);
    log(`hedged mint ${tokens} on basket ${id}: ${fills.map((f) => (f.orderId ? `${f.qty} NO ${f.symbol} @${f.price}` : `FAILED ${f.symbol}: ${f.error}`)).join("; ")}`);
  }
}

// Set once Recession Hedge is seen onchain, so it is never opened twice even
// after it scrolls out of the recent-basket scan. Restarting the operator rescans.
let recessionOpen = false;

async function tick() {
  await hedgeNewMints().catch((e) => log("hedge scan failed:", (e as Error).message.split("\n")[0]));
  const now = Date.now();
  const baskets = await recent();
  const legs = await crashLegs(now, CUTOFF_S * 1000);
  if (legs.length === 2 && !baskets.some((b) => b.meta.expires === legs[0].expires)) {
    await open(legs);
  }
  if (baskets.some((b) => b.meta.series === "recession")) recessionOpen = true;
  if (!recessionOpen) {
    recessionOpen = true;
    log("open Recession Hedge");
    const meta: Meta = { series: "recession", expires: RECESSION.close, legs: RECESSION.legs };
    await send("createBasket", [RECESSION.weights, BigInt(Date.parse(RECESSION.close) / 1000), MAX_STALE_S, JSON.stringify(meta)]);
    const next = (await pub.readContract({ address: WEAVE, abi, functionName: "nextId" })) as bigint;
    await send("fund", [next - 1n, RECESSION_FUND]);
  }
  for (const b of baskets) {
    // After settlement, take back collateral holders are not owed so it can fund the next hour.
    if (b.settled && b.extra > 0n) await send("sweep", [b.id, account.address]);
    if (b.settled) continue;
    const exp = Date.parse(b.meta.expires);
    // Crash legs settle at the hour; Recession legs settle on their own dates.
    if (now >= exp || b.meta.series === "recession") await resolve(b);
    if (now / 1000 < Number(b.closeTime) && b.results.every((r) => r === 0)) await price(b);
  }
}

log(`operator ${account.address} on chain ${chain.id}, vault ${WEAVE}`);
await ensureAllowance();
recessionOpen = (await recent(1000)).some((b) => b.meta.series === "recession");
for (;;) {
  try {
    await tick();
  } catch (e) {
    log("tick failed:", (e as Error).message.split("\n")[0]);
  }
  await new Promise((r) => setTimeout(r, TICK_MS));
}
