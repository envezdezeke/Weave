// Local end-to-end rehearsal against `npx hardhat node`:
// deploy, open a basket on an hourly Gemini market that has ALREADY resolved,
// mint as a user, then let operator.ts resolve it and redeem.
//   npx hardhat run scripts/rehearse.ts --network localhost -- <BTC ticker> <ETH ticker>
import { network } from "hardhat";
import { parseUnits } from "viem";

const [btcTicker, ethTicker] = (process.env.REHEARSE_TICKERS ?? "").split(",");
const ev = async (t: string) => (await fetch(`https://api.gemini.com/v1/prediction-markets/events/${t}`)).json();
const [btc, eth] = await Promise.all([ev(btcTicker), ev(ethTicker)]);
// Pick a contract near the money on each so the result is interesting.
const near = (e: { contracts: { label: string; instrumentSymbol: string; settlementValue?: string }[] }) => {
  const v = Number(e.contracts[0].settlementValue);
  return e.contracts
    .map((c) => ({ c, d: Math.abs(Number(c.label.replace(/[^0-9.]/g, "")) - v) }))
    .sort((a, b) => a.d - b.d)[0].c;
};
const legs = [btc, eth].map((e) => {
  const c = near(e);
  return { symbol: c.instrumentSymbol, ticker: e.ticker, label: c.label };
});

const { viem } = await network.create();
const pub = await viem.getPublicClient();
const [op, user] = await viem.getWalletClients();
const usdc = await viem.deployContract("MockUSDC");
const weave = await viem.deployContract("WeaveBasket", [usdc.address, op.account.address, ""]);
for (const a of [op.account.address, user.account.address]) await usdc.write.mint([a, parseUnits("1000", 6)]);
await usdc.write.approve([weave.address, 2n ** 255n]);
const now = Number((await pub.getBlock()).timestamp);
const meta = { series: "crash-1h", expires: btc.expiryDate, legs };
await weave.write.createBasket([[7000, 3000], BigInt(now + 3600), 3600, JSON.stringify(meta)]);
await weave.write.fund([1n, parseUnits("20", 6)]);
await weave.write.postPrice([1n, 250_000n]);
const asUser = await viem.getContractAt("WeaveBasket", weave.address, { client: { wallet: user } });
const usdcUser = await viem.getContractAt("MockUSDC", usdc.address, { client: { wallet: user } });
await usdcUser.write.approve([weave.address, 2n ** 255n]);
await asUser.write.mint([1n, 10n, parseUnits("3", 6)]);
console.log(`legs: ${legs.map((l) => `${l.symbol}`).join(", ")}`);
console.log(`user holds ${await weave.read.balanceOf([user.account.address, 1n])} tokens; solvency ${await weave.read.solvencyBps([1n])} bps`);
console.log(`WEAVE_ADDRESS=${weave.address}`);
