import { NextRequest, NextResponse } from "next/server";
import { yahoo } from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z.\-]{1,10}$/.test(symbol));
  if (!symbols.length || symbols.length > 25)
    return NextResponse.json({ error: "Invalid symbols" }, { status: 400 });
  try {
    const quotes = await yahoo.quote(symbols);
    return NextResponse.json({
      quotes: quotes.map((result) => ({
        symbol: result.symbol,
        price: result.regularMarketPrice ?? 0,
        currency: result.currency ?? "USD",
        change: result.regularMarketChange ?? 0,
        changePercent: result.regularMarketChangePercent ?? 0,
        fetchedAt: new Date().toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Quotes unavailable" }, { status: 502 });
  }
}
