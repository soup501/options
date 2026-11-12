import { NextRequest, NextResponse } from "next/server";
import { withAccountTransaction } from "@/lib/db";
import { yahoo } from "@/lib/yahoo";
import { executeOptionTrade } from "@/lib/trading/options";
import { getAuthenticatedIdentity } from "@/lib/auth-account";
import { TradeConflictError } from "@/lib/trading/errors";

export const runtime = "nodejs";

const effects = [
  "Buy to open",
  "Sell to close",
  "Sell to open",
  "Buy to close",
] as const;

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
    contractSymbol?: string;
    underlying?: string;
    kind?: "Call" | "Put";
    strike?: number;
    expiration?: number;
    effect?: (typeof effects)[number];
    quantity?: number;
    idempotencyKey?: string;
  } | null;
  const underlying = body?.underlying?.trim().toUpperCase();
  const quantity = body?.quantity;
  const effect = body?.effect;
  if (
    !body ||
    !body.contractSymbol ||
    !underlying ||
    !/^[A-Z.\-]{1,10}$/.test(underlying) ||
    !body.kind ||
    !["Call", "Put"].includes(body.kind) ||
    !Number.isFinite(body.strike) ||
    !body.expiration ||
    !effect ||
    !effects.includes(effect) ||
    quantity === undefined ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  )
    return NextResponse.json(
      { error: "Invalid option contract or order details." },
      { status: 400 },
    );
  const idempotencyKey = body.idempotencyKey?.trim();
  if (!idempotencyKey || idempotencyKey.length > 100)
    return NextResponse.json(
      { error: "A valid idempotency key is required." },
      { status: 400 },
    );
  try {
    const expired = body.expiration * 1000 < Date.now();
    let premium = 0;
    if (!expired || effect.includes("open")) {
      const chain = await yahoo.options(underlying, {
        date: new Date(body.expiration * 1000),
      });
      const contracts =
        body.kind === "Call"
          ? (chain.options?.[0]?.calls ?? [])
          : (chain.options?.[0]?.puts ?? []);
      const contract = contracts.find(
        (item) => item.contractSymbol === body.contractSymbol,
      );
      if (!contract)
        return NextResponse.json(
          { error: "Selected option quote is no longer available." },
          { status: 409 },
        );
      premium = effect.startsWith("Sell")
        ? contract.bid && contract.bid > 0
          ? contract.bid
          : contract.lastPrice
        : contract.ask && contract.ask > 0
          ? contract.ask
          : contract.lastPrice;
    }
    if (typeof premium !== "number" || premium <= 0)
      return NextResponse.json(
        { error: "The required option quote side is unavailable." },
        { status: 502 },
      );
    const result = await withAccountTransaction(identity, (client) =>
      executeOptionTrade(client, {
        contractSymbol: body.contractSymbol!,
        underlying,
        kind: body.kind!,
        strike: body.strike!,
        expiration: new Date(body.expiration! * 1000).toISOString(),
        effect,
        quantity,
        premium,
        idempotencyKey,
      }),
    );
    return NextResponse.json({ ...result, fillPremium: premium });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Option trade could not be completed.";
    return NextResponse.json(
      { error: message },
      {
        status: error instanceof TradeConflictError ? 409 : 503,
      },
    );
  }
}
