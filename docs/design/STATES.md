# State machines

Every path must end in a clear final state.
The most common wallet failure is a dropped or replaced transaction that the UI keeps showing as pending.

## Transactions (buy and redeem)

| State | Copy | Next |
|---|---|---|
| Review | "Buy basket · $50.00" | Confirm -> Submitting |
| Submitting | "Placing your order…" | Hash returned -> Confirming; error -> Failed |
| Confirming | "Confirming on Arc. Usually a few seconds." | Receipt -> Done; about 60 s with no receipt -> Slow |
| Slow | "Taking longer than usual. View on Arc explorer ->" | Receipt -> Done; dropped -> Failed |
| Done | "Done. You own 200 Slowdown Hedge tokens. Receipt ->" | final |
| Failed | "Didn't go through. No money moved. Try again." | Retry -> Review |

Arc-specific rules:

- Arc silently drops transactions with `maxFeePerGas` below 20 gwei.
  Always send 25+ gwei, and map a dropped transaction to Failed with its own message instead of leaving it in Confirming.
- USDC: use the ERC-20 interface (6 decimals); native gas balance uses 18 decimals.
  Never show both.
- Write the position to Portfolio as soon as the order is submitted, labeled "Confirming", and switch it to "Open" on the receipt.
- If a buy needs more than one transaction, show "2 of 3 steps done" with "Retry last step", never one green check over a partial result.

## Positions

| State | Copy | Redeem button |
|---|---|---|
| Confirming | "Confirming on Arc" | hidden |
| Open | "Open · 0 of 3 legs resolved" | hidden |
| Closing soon | "A leg resolves in 3 days" | hidden |
| Waiting for result | "2 of 3 legs resolved · waiting for Gemini" | hidden |
| Under review | "Gemini is reviewing this result. This can take a few days." | hidden |
| Ready to redeem | "Ready · $80.00" | "Redeem $80.00" |
| Redeemed | "Redeemed $80.00 · Receipt ->" | hidden |
| Ended, no payout | "All legs resolved NO. This basket paid $0.00." | hidden |

Never show a Redeem button before resolution; it would revert onchain and confuse the demo.

## Legs (inside a position)

| State | Chip |
|---|---|
| Open | "Open" (neutral) |
| Resolved YES | "Resolved YES" (positive wash) |
| Resolved NO | "Resolved NO" (neutral, not red: a NO is expected for most hedge legs) |
| Voided | "Voided" (warning wash); the basket pauses and uses the refund path |

Each resolved leg links to its evidence: Gemini's `resolutionSide`, `resolvedAt`, `settlementValue`, and the market's terms link.
