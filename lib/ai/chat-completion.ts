export type ChatMessage = { role: "user" | "assistant"; content: string };

export function jsonObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function cleanMessages(value: unknown): ChatMessage[] {
  return (Array.isArray(value) ? value : [])
    .map(jsonObject)
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim(),
    )
    .map((message) => ({
      role: message.role as ChatMessage["role"],
      content: String(message.content).slice(0, 6_000),
    }))
    .slice(-12);
}

export async function streamCompletion(system: string, messages: ChatMessage[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key)
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
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
  });
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
