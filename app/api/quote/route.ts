import { NextRequest, NextResponse } from "next/server";
import { yahoo } from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams
    .get("symbol")
    ?.trim()
    .toUpperCase();
  if (!symbol || !/^[A-Z.\-]{1,10}$/.test(symbol))
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  try {
    const result = await yahoo.quote(symbol);
    const price = result?.regularMarketPrice;
    if (typeof price !== "number")
      return NextResponse.json({ error: "Quote unavailable" }, { status: 502 });
    return NextResponse.json({
      symbol,
      price,
      bid: result.bid ?? price,
      ask: result.ask ?? price,
      currency: result.currency ?? "USD",
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      dayHigh: result.regularMarketDayHigh ?? price,
      dayLow: result.regularMarketDayLow ?? price,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Quote unavailable" }, { status: 502 });
  }
}
