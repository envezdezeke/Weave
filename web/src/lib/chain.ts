// Arc testnet reads and writes for the WeaveBasket vault. Works on the server
// (reads) and in the browser (reads + MetaMask writes). When
// NEXT_PUBLIC_WEAVE_ADDRESS is unset the app falls back to its demo mocks.

import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  erc20Abi,
  http,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";
import { weaveAbi } from "./weave-abi";

export const WEAVE = (process.env.NEXT_PUBLIC_WEAVE_ADDRESS || "") as Address | "";
export const onchain = WEAVE !== "";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 5042002);
const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.testnet.arc.io";
export const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER || "https://explorer.testnet.arc.io";

export const arc = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 5042002 ? "Arc Testnet" : "Weave local",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "Arc explorer", url: EXPLORER } },
});

export const pub = createPublicClient({ chain: arc, transport: http(RPC) });

const ONE = 1_000_000; // USDC has 6 decimals

export type Meta = { series: string; expires: string; legs: { symbol: string; ticker: string; label: string }[] };

export type OnchainBasket = {
  id: number;
  meta: Meta;
  results: number[]; // 0 open, 1 hit, 2 miss
  closeTime: number; // ms
  price: number; // USDC per token
  priceAt: number; // ms
  supply: number;
  reserve: number; // USDC
  payout: number; // USDC per token
  settled: boolean;
};

export async function readBasket(id: number): Promise<OnchainBasket> {
  const W = WEAVE as Address;
  const [b, meta] = await Promise.all([
    pub.readContract({ address: W, abi: weaveAbi, functionName: "basket", args: [BigInt(id)] }),
    pub.readContract({ address: W, abi: weaveAbi, functionName: "metaOf", args: [BigInt(id)] }),
  ]);
  const [, results, closeTime, price, priceAt, supply, reserve, payout, settled] = b;
  return {
    id,
    meta: JSON.parse(meta) as Meta,
    results: results.map(Number),
    closeTime: Number(closeTime) * 1000,
    price: Number(price) / ONE,
    priceAt: Number(priceAt) * 1000,
    supply: Number(supply),
    reserve: Number(reserve) / ONE,
    payout: Number(payout) / ONE,
    settled,
  };
}

// Newest baskets of a series, newest first.
export async function recentBaskets(series: string, n = 6): Promise<OnchainBasket[]> {
  if (!onchain) return [];
  const next = Number(await pub.readContract({ address: WEAVE as Address, abi: weaveAbi, functionName: "nextId" }));
  const out: OnchainBasket[] = [];
  for (let id = next - 1; id >= 1 && out.length < n && next - id <= 40; id--) {
    const b = await readBasket(id);
    if (b.meta.series === series) out.push(b);
  }
  return out;
}

// --- browser wallet ---------------------------------------------------------

function provider(): EIP1193Provider {
  const eth = (globalThis as { ethereum?: EIP1193Provider }).ethereum;
  if (!eth) throw new Error("No wallet found. Install MetaMask to buy on Arc testnet.");
  return eth;
}

export async function connect(): Promise<Address> {
  const eth = provider();
  const [account] = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
  const hex = `0x${CHAIN_ID.toString(16)}`;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: hex, chainName: arc.name, nativeCurrency: arc.nativeCurrency, rpcUrls: [RPC], blockExplorerUrls: [EXPLORER] }],
    });
  }
  return account;
}

const wallet = (account: Address) => createWalletClient({ account, chain: arc, transport: custom(provider()) });

async function usdcAddress() {
  return pub.readContract({ address: WEAVE as Address, abi: weaveAbi, functionName: "usdc" });
}

export async function usdcBalance(account: Address) {
  const bal = await pub.readContract({ address: await usdcAddress(), abi: erc20Abi, functionName: "balanceOf", args: [account] });
  return Number(bal) / ONE;
}

export async function tokenBalance(account: Address, id: number) {
  return Number(await pub.readContract({ address: WEAVE as Address, abi: weaveAbi, functionName: "balanceOf", args: [account, BigInt(id)] }));
}

async function confirm(hash: Hash) {
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("Transaction reverted");
  return hash;
}

// Approves USDC if needed, then mints. maxCost caps slippage against the posted price.
export async function buy(id: number, tokens: number, maxCost: number, onHash?: (h: Hash) => void): Promise<Hash> {
  const account = await connect();
  const w = wallet(account);
  const usdc = await usdcAddress();
  const max = BigInt(Math.ceil(maxCost * ONE));
  const allowance = await pub.readContract({ address: usdc, abi: erc20Abi, functionName: "allowance", args: [account, WEAVE as Address] });
  if (allowance < max) {
    await confirm(await w.writeContract({ address: usdc, abi: erc20Abi, functionName: "approve", args: [WEAVE as Address, max * BigInt(100)] }));
  }
  const hash = await w.writeContract({ address: WEAVE as Address, abi: weaveAbi, functionName: "mint", args: [BigInt(id), BigInt(tokens), max] });
  onHash?.(hash);
  return confirm(hash);
}

export async function redeem(id: number, tokens: number): Promise<Hash> {
  const account = await connect();
  return confirm(await wallet(account).writeContract({ address: WEAVE as Address, abi: weaveAbi, functionName: "redeem", args: [BigInt(id), BigInt(tokens)] }));
}

export async function sendTokens(id: number, to: Address, tokens: number): Promise<Hash> {
  const account = await connect();
  return confirm(
    await wallet(account).writeContract({
      address: WEAVE as Address,
      abi: weaveAbi,
      functionName: "safeTransferFrom",
      args: [account, to, BigInt(id), BigInt(tokens), "0x"],
    }),
  );
}
