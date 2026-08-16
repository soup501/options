import { NextResponse } from "next/server";
import { runOptionSettlement } from "@/lib/trading/run-settlement";
import { getAuthenticatedIdentity } from "@/lib/auth-account";
import { withAccountTransaction } from "@/lib/db";
import { ensureAccount } from "@/lib/accounts";

export const runtime = "nodejs";

export async function POST() {
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  const identity = await getAuthenticatedIdentity();
  if (!identity)
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const accountId = await withAccountTransaction(identity, (client) =>
      ensureAccount(client, identity),
    );
    const settled = await runOptionSettlement(accountId);
    return NextResponse.json({ settled });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Expiration settlement failed.",
      },
      { status: 503 },
    );
  }
}
