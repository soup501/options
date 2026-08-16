import { NextRequest, NextResponse } from "next/server";
import { yahoo } from "@/lib/yahoo";

type YahooOption = {
  contractSymbol?: string;
  strike?: number;
  bid?: number;
  ask?: number;
  lastPrice?: number;
  impliedVolatility?: number;
  volume?: number;
  openInterest?: number;
  expiration?: Date | number;
};

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams
    .get("symbol")
    ?.trim()
    .toUpperCase();
  const date = request.nextUrl.searchParams.get("date");
  if (!symbol || !/^[A-Z.\-]{1,10}$/.test(symbol))
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  try {
    const result = await yahoo.options(
      symbol,
      date ? { date: new Date(Number(date) * 1000) } : {},
    );
    const normalize = (option: YahooOption) => {
      const last = option.lastPrice ?? 0;
      const bid = option.bid && option.bid > 0 ? option.bid : last;
      const ask = option.ask && option.ask > 0 ? option.ask : last;
      return {
        symbol: option.contractSymbol ?? "",
        strike: option.strike ?? 0,
        bid,
        ask,
        last,
        iv: option.impliedVolatility ?? 0,
        volume: option.volume ?? 0,
        openInterest: option.openInterest ?? 0,
        expiration:
          option.expiration instanceof Date
            ? option.expiration.toISOString()
            : (option.expiration ?? 0),
      };
    };
    return NextResponse.json({
      symbol,
      expirations:
        result.expirationDates?.map((date) =>
          Math.floor(date.getTime() / 1000),
        ) ?? [],
      calls: (result.options?.[0]?.calls ?? []).map(normalize),
      puts: (result.options?.[0]?.puts ?? []).map(normalize),
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Options unavailable" }, { status: 502 });
  }
}
