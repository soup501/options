import { NextRequest, NextResponse } from "next/server";
import { yahoo } from "@/lib/yahoo";

const ranges = { "1d": 2, "1w": 7, "1m": 30, "3m": 90 } as const;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams
    .get("symbol")
    ?.trim()
    .toUpperCase();
  const range = (request.nextUrl.searchParams.get("range") ??
    "1m") as keyof typeof ranges;
  if (!symbol || !/^[A-Z.\-]{1,10}$/.test(symbol) || !ranges[range])
    return NextResponse.json(
      { error: "Invalid history request" },
      { status: 400 },
    );
  try {
    const days = ranges[range];
    const period1 = new Date(Date.now() - days * 86400000);
    const interval = range === "1d" ? "5m" : range === "1w" ? "1h" : "1d";
    const result = await yahoo.chart(symbol, {
      period1,
      period2: new Date(),
      interval,
    });
    const points = result.quotes
      .filter((point) => typeof point.close === "number")
      .map((point) => ({ date: point.date.toISOString(), close: point.close }));
    return NextResponse.json({
      symbol,
      range,
      points,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "History unavailable" }, { status: 502 });
  }
}
