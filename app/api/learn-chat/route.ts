import { NextRequest } from "next/server";
import { getProjectContext } from "@/lib/ai/project-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key)
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  const body = (await request.json().catch(() => null)) as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  } | null;
  const messages = body?.messages
    ?.filter((message) => message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 6_000),
    }))
    .slice(-12);
  if (!messages?.length)
    return Response.json(
      { error: "Ask a question to start the lesson." },
      { status: 400 },
    );
  const context = await getProjectContext();
  const system = `You are OptionLab's patient options tutor for a financially beginner-literate backend developer. Explain one concept at a time, use small dollar examples, and distinguish calls, puts, rights, obligations, premiums, strike, expiration, break-even, and position effects. Never give personalized investment advice. Use only the project behavior and source-backed rules in the context below. If the project is incomplete, say so. The app is a paper simulator, uses Yahoo Finance data that may be delayed, standard 100-share contracts, cash account constraints, covered calls, and cash-secured puts.\n\nPROJECT CONTEXT:\n${context}`;
  const upstream = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        stream: true,
        max_tokens: 700,
        temperature: 0.2,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    },
  );
  if (!upstream.ok || !upstream.body) {
    const providerError = await upstream.json().catch(() => null);
    const message =
      typeof providerError?.error?.message === "string"
        ? providerError.error.message
        : `AI provider error (${upstream.status}).`;
    return Response.json({ error: message }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
