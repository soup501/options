import { NextResponse } from "next/server";
import { withAccountTransaction } from "@/lib/db";
import { getPortfolio } from "@/lib/trading/stocks";
import { getAuthenticatedIdentity } from "@/lib/auth-account";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  const identity = await getAuthenticatedIdentity();
  if (!identity)
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    return NextResponse.json(
      await withAccountTransaction(identity, (client) => getPortfolio(client)),
    );
  } catch {
    return NextResponse.json(
      { error: "Portfolio unavailable. Run setup_db.py first." },
      { status: 503 },
    );
  }
}
