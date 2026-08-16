import { NextRequest, NextResponse } from "next/server";
import { yahoo } from "@/lib/yahoo";
import { withAccountTransaction } from "@/lib/db";
import { executeStockTrade } from "@/lib/trading/stocks";
import { getAuthenticatedIdentity } from "@/lib/auth-account";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  const identity = await getAuthenticatedIdentity();
  if (!identity)
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    symbol?: string;
    side?: "buy" | "sell";
    quantity?: number;
    idempotencyKey?: string;
  } | null;
  const symbol = body?.symbol?.trim().toUpperCase();
  const quantity = body?.quantity;
  const side = body?.side;
  if (
    !body ||
    !symbol ||
    !/^[A-Z.\-]{1,10}$/.test(symbol) ||
    (side !== "buy" && side !== "sell") ||
    quantity === undefined ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100000
  )
    return NextResponse.json(
      { error: "Enter a valid symbol, side, and whole-share quantity." },
      { status: 400 },
    );
  const idempotencyKey = body?.idempotencyKey?.trim();
  if (!idempotencyKey || idempotencyKey.length > 100)
    return NextResponse.json(
      { error: "A valid idempotency key is required." },
      { status: 400 },
    );

  try {
    const quote = (await yahoo.quote(symbol)) as {
      regularMarketPrice?: number;
      regularMarketAsk?: number;
      regularMarketBid?: number;
    };
    const price =
      side === "buy"
        ? (quote.regularMarketAsk ?? quote.regularMarketPrice)
        : (quote.regularMarketBid ?? quote.regularMarketPrice);
    if (typeof price !== "number" || price <= 0)
      return NextResponse.json(
        { error: "A tradable quote is unavailable." },
        { status: 502 },
      );
    const result = await withAccountTransaction(identity, (client) =>
      executeStockTrade(client, {
        symbol,
        side,
        quantity,
        price,
        idempotencyKey,
      }),
    );
    return NextResponse.json({ ...result, fillPrice: price });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Trade could not be completed.";
    const status = /Insufficient|initialized|valid/i.test(message) ? 409 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
