import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    arcTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://rpc.testnet.arc.io",
      chainId: 5042002,
      accounts: [configVariable("ARC_PRIVATE_KEY")],
    },
  },
});
