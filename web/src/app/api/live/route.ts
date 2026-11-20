import { connection, NextResponse } from "next/server";
import { onchain, recentBaskets } from "@/lib/chain";
import { live } from "@/lib/gemini";
import { catalog } from "@/lib/markets";

const tickers = [...new Set(Object.values(catalog).map((l) => l.ticker).filter(Boolean))];

// Live Gemini books plus, when the vault is deployed, the Crash Cover basket
// the operator has open onchain (its legs pin the strikes shown in the app).
export async function GET() {
  await connection();
  try {
    const basket = onchain ? ((await recentBaskets("crash-1h", 1))[0] ?? null) : null;
    const open = basket && !basket.settled && Date.now() < basket.closeTime ? basket : null;
    const data = await live(tickers, open?.meta.legs);
    return NextResponse.json({ ...data, basket });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
