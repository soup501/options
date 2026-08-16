import { NextRequest, NextResponse } from "next/server";
import { yahoo } from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ quotes: [] });
  try {
    const payload = await yahoo.search(query);
    const quotes = (payload.quotes ?? []).filter(quote => quote.quoteType === "EQUITY" || quote.quoteType === "ETF").map(quote => ({ symbol: quote.symbol, name: quote.shortname ?? quote.symbol, exchange: quote.exchange ?? "", type: quote.quoteType }));
    return NextResponse.json({ quotes });
  } catch { return NextResponse.json({ error: "Search unavailable" }, { status: 502 }); }
}
