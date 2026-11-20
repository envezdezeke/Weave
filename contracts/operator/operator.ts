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

type Meta = { series: string; expires: string; legs: { symbol: string; ticker: string; label: string }[] };
type Onchain = { id: bigint; meta: Meta; results: number[]; closeTime: bigint; settled: boolean };

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function send(functionName: string, args: unknown[]) {
  const hash = await wallet.writeContract({ address: WEAVE, abi, functionName, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  log(`  ${functionName} ok ${hash}`);
  return r;
}

// Recent Crash Cover baskets, newest first (the chain is the source of truth).
async function recent(n = 12): Promise<Onchain[]> {
  const next = (await pub.readContract({ address: WEAVE, abi, functionName: "nextId" })) as bigint;
  const out: Onchain[] = [];
  for (let id = next - 1n; id >= 1n && out.length < n; id--) {
    const meta = JSON.parse((await pub.readContract({ address: WEAVE, abi, functionName: "metaOf", args: [id] })) as string) as Meta;
    if (meta.series !== "crash-1h") continue;
    const b = (await pub.readContract({ address: WEAVE, abi, functionName: "basket", args: [id] })) as readonly unknown[];
    out.push({ id, meta, results: (b[1] as number[]).map(Number), closeTime: b[2] as bigint, settled: b[8] as boolean });
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

// NO-side ask for a "$X or above" leg is 1 - YES bid. No YES bid: no ask, no price.
async function noAsk(ticker: string, symbol: string) {
  const e = await getEvent(ticker);
  const c = e.contracts.find((x) => x.instrumentSymbol === symbol);
  const bid = c?.prices?.bestBid;
  return bid == null || bid === "" ? null : 1 - Number(bid);
}

async function price(b: Onchain) {
  const asks = await Promise.all(b.meta.legs.map((l) => noAsk(l.ticker, l.symbol)));
  if (asks.some((a) => a === null)) return log(`  basket ${b.id}: a leg has no ask, price not posted`);
  const p = asks.reduce((s, a, i) => s + (a as number) * (WEIGHTS[i] / 10_000), 0) * (1 + FEE);
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
    // The basket holds NO, so the leg pays when Gemini resolves NO.
    const evidence = `${l.symbol} resolutionSide=${side} resolvedAt=${(c as { resolvedAt?: string }).resolvedAt ?? ""}`;
    log(`resolve basket ${b.id} leg ${i}: ${evidence}`);
    await send("resolveLeg", [b.id, i, side === "no", evidence]);
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
    const fills = await hedgeMint({ id, tokens, tx: l.transactionHash }, meta.legs, WEIGHTS);
    log(`hedged mint ${tokens} on basket ${id}: ${fills.map((f) => (f.orderId ? `${f.qty} NO ${f.symbol} @${f.price}` : `FAILED ${f.symbol}: ${f.error}`)).join("; ")}`);
  }
}

async function tick() {
  await hedgeNewMints().catch((e) => log("hedge scan failed:", (e as Error).message.split("\n")[0]));
  const now = Date.now();
  const baskets = await recent();
  const legs = await crashLegs(now, CUTOFF_S * 1000);
  if (legs.length === 2 && !baskets.some((b) => b.meta.expires === legs[0].expires)) {
    await open(legs);
  }
  for (const b of baskets) {
    const exp = Date.parse(b.meta.expires);
    if (!b.settled && now >= exp) await resolve(b);
    else if (!b.settled && now / 1000 < Number(b.closeTime)) await price(b);
  }
}

log(`operator ${account.address} on chain ${chain.id}, vault ${WEAVE}`);
await ensureAllowance();
for (;;) {
  try {
    await tick();
  } catch (e) {
    log("tick failed:", (e as Error).message.split("\n")[0]);
  }
  await new Promise((r) => setTimeout(r, TICK_MS));
}
