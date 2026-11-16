import { NextRequest } from "next/server";
import { getProjectContext } from "@/lib/ai/project-context";
import { cleanMessages, streamCompletion } from "@/lib/ai/chat-completion";
import { getAuthenticatedIdentity } from "@/lib/auth-account";
import { withAccountTransaction } from "@/lib/db";
import { jsonObject } from "@/lib/execution-policy";
import { getPortfolio } from "@/lib/trading/stocks";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const identity = await getAuthenticatedIdentity();
  if (!identity)
    return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = jsonObject(await request.json().catch(() => null));
  const messages = cleanMessages(body.messages);
  if (!messages.length)
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  const page = jsonObject(body.page);
  const screen = typeof page.text === "string" ? page.text.slice(0, 6_000) : "";
  const path = typeof page.path === "string" ? page.path.slice(0, 200) : "";
  const portfolio = await withAccountTransaction(identity, (client) =>
    getPortfolio(client),
  ).catch(() => null);
  const context = await getProjectContext();
  const system = `You are the OptionLab assistant, a chat helper inside a paper-trading simulator for stocks and options. Answer questions about what the user sees on screen and about their own positions, cash, and trades using the data below. Be concise. Do the math when asked (break-even, max loss, P/L) and show it briefly. Never give personalized investment advice; frame answers as education about this simulated account. If the data below does not contain the answer, say so instead of guessing. Market data may be delayed.\n\nCURRENT PAGE: ${path}\nVISIBLE SCREEN TEXT:\n${screen}\n\nUSER PORTFOLIO (JSON):\n${JSON.stringify(portfolio)?.slice(0, 12_000) ?? "unavailable"}\n\nPROJECT CONTEXT:\n${context}`;
  return streamCompletion(system, messages);
}
