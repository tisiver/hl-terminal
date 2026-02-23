import { NextResponse } from "next/server";

const HL_API = "https://api.hyperliquid.xyz/info";
const BUILDER_ADDRESS = "0x78c04383dcE7376f5baE0282E8c759486d94AB55";

export interface Signal {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
  score: number; // composite signal score
  tags: string[];
}

export async function GET() {
  try {
    const res = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      next: { revalidate: 30 }, // cache for 30s
    });

    if (!res.ok) throw new Error("HL API error");

    const [meta, ctxs] = await res.json();

    const signals: Signal[] = meta.universe
      .map((asset: { name: string }, i: number) => {
        const ctx = ctxs[i];
        if (!ctx) return null;

        const price = parseFloat(ctx.markPx || "0");
        const prevPrice = parseFloat(ctx.prevDayPx || price.toString());
        const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
        const volume24h = parseFloat(ctx.dayNtlVlm || "0");
        const openInterest = parseFloat(ctx.openInterest || "0") * price;
        const fundingRate = parseFloat(ctx.funding || "0") * 100;

        if (price === 0 || volume24h === 0) return null;

        // Composite score: turnover activity, funding extremity, momentum, and OI
        const turnoverRatio = volume24h / Math.max(openInterest, 1);
        const turnoverScore = Math.min(turnoverRatio, 5) * 2;
        const fundingScore = Math.min(Math.abs(fundingRate) / 0.1, 1) * 3;
        const momentumScore = Math.min(Math.abs(change24h) * 0.4, 8);
        const oiScore = Math.min(openInterest / 500_000_000, 1) * 2;
        const score = turnoverScore + fundingScore + momentumScore + oiScore;

        const tags: string[] = [];
        if (Math.abs(change24h) > 3) tags.push(change24h > 0 ? "🚀 Pumping" : "📉 Dumping");
        if (Math.abs(fundingRate) > 0.05) tags.push(fundingRate > 0 ? "🔥 High Funding" : "❄️ Neg Funding");
        if (turnoverRatio > 2) tags.push("⚡ High Turnover");
        if (fundingRate > 0.1) tags.push("🌡️ Overheated");
        if (fundingRate < -0.1) tags.push("❄️ Short Squeeze Risk");
        if (volume24h > 30_000_000) tags.push("💰 High Volume");

        return {
          symbol: asset.name,
          price,
          change24h,
          volume24h,
          fundingRate,
          openInterest,
          score,
          tags,
        };
      })
      .filter(Boolean)
      .sort((a: Signal, b: Signal) => b.score - a.score)
      .slice(0, 20);

    return NextResponse.json({
      signals,
      builderAddress: BUILDER_ADDRESS,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
