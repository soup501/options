import { NextRequest } from "next/server";
import { getProjectContext } from "@/lib/ai/project-context";
import { cleanMessages, jsonObject, streamCompletion } from "@/lib/ai/chat-completion";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = jsonObject(await request.json().catch(() => null));
  const messages = cleanMessages(body.messages);
  if (!messages.length)
    return Response.json(
      { error: "Ask a question to start the lesson." },
      { status: 400 },
    );
  const context = await getProjectContext();
  const system = `You are OptionLab's patient options tutor for a financially beginner-literate backend developer. Explain one concept at a time, use small dollar examples, and distinguish calls, puts, rights, obligations, premiums, strike, expiration, break-even, and position effects. Never give personalized investment advice. Use only the project behavior and source-backed rules in the context below. If the project is incomplete, say so. The app is a paper simulator, uses Yahoo Finance data that may be delayed, standard 100-share contracts, cash account constraints, covered calls, and cash-secured puts.\n\nPROJECT CONTEXT:\n${context}`;
  return streamCompletion(system, messages);
}
