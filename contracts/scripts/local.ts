// Local rehearsal: deploys MockUSDC + WeaveBasket to a running `npx hardhat node`
// and funds the first two dev accounts. Prints the env for the operator and web app.
//   npx hardhat run scripts/local.ts --network localhost
import { network } from "hardhat";
import { parseUnits } from "viem";

const { viem } = await network.connect();
const [op, user] = await viem.getWalletClients();
const usdc = await viem.deployContract("MockUSDC");
const weave = await viem.deployContract("WeaveBasket", [usdc.address, op.account.address, ""]);
for (const a of [op.account.address, user.account.address]) await usdc.write.mint([a, parseUnits("1000", 6)]);
console.log(`WEAVE_ADDRESS=${weave.address}`);
console.log(`USDC_ADDRESS=${usdc.address}`);
console.log(`OPERATOR=${op.account.address}`);
console.log(`USER=${user.account.address}`);
