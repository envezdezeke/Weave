import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Arc testnet USDC (ERC-20 interface, 6 decimals). Never use msg.value: native gas is 18 dp.
const ARC_USDC = "0x3600000000000000000000000000000000000000";

export default buildModule("Weave", (m) => {
  const operator = m.getParameter("operator", m.getAccount(0));
  const basket = m.contract("WeaveBasket", [ARC_USDC, operator, ""]);
  return { basket };
});
