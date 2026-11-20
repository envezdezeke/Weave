// Deploys WeaveBasket to Arc testnet with the operator key from the repo .env.
//   cd contracts && npx hardhat build && node --env-file=../.env scripts/deploy-arc.ts
// Prints the address to put in .env (WEAVE_ADDRESS) and web/.env.local
// (NEXT_PUBLIC_WEAVE_ADDRESS). The deployer is also the operator.
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";

const USDC = "0x3600000000000000000000000000000000000000"; // Arc testnet USDC (ERC-20, 6 dp)
const key = process.env.OPERATOR_KEY as Hex | undefined;
if (!key) throw new Error("Set OPERATOR_KEY in the repo .env");

const art = JSON.parse(readFileSync(new URL("../artifacts/contracts/WeaveBasket.sol/WeaveBasket.json", import.meta.url), "utf8"));
const account = privateKeyToAccount(key);
const pub = createPublicClient({ chain: arcTestnet, transport: http() });
const wallet = createWalletClient({ account, chain: arcTestnet, transport: http() });

console.log(`deployer/operator ${account.address}`);
const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, args: [USDC, account.address, ""] });
console.log(`tx ${arcTestnet.blockExplorers.default.url}/tx/${hash}`);
const r = await pub.waitForTransactionReceipt({ hash });
if (r.status !== "success" || !r.contractAddress) throw new Error("deploy failed");
console.log(`WEAVE_ADDRESS=${r.contractAddress}`);
console.log(`${arcTestnet.blockExplorers.default.url}/address/${r.contractAddress}`);
