import { NextRequest, NextResponse } from "next/server";
import { withAccountTransaction } from "@/lib/db";
import { exerciseLongOption } from "@/lib/trading/exercise";
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
    contractSymbol?: string;
    quantity?: number;
    idempotencyKey?: string;
  } | null;
  if (
    !body?.contractSymbol ||
    body.quantity === undefined ||
    !Number.isInteger(body.quantity) ||
    body.quantity < 1 ||
    !body.idempotencyKey
  )
    return NextResponse.json(
      {
        error: "A valid contract, quantity, and idempotency key are required.",
      },
      { status: 400 },
    );
  try {
    const result = await withAccountTransaction(identity, (client) =>
      exerciseLongOption(client, {
        contractSymbol: body.contractSymbol!,
        quantity: body.quantity!,
        idempotencyKey: body.idempotencyKey!,
      }),
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Exercise could not be completed.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
