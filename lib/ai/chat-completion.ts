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
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 },
    );
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "claude-haiku-5-5",
      stream: true,
      max_tokens: 1024,
      temperature: 0.2,
      system,
      messages,
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
