import { BASE_PATH } from "@/lib/base-path";

// POSTs to an AI chat route and reports the accumulated answer after each token.
export async function readChatStream(
  path: string,
  body: unknown,
  onAnswer: (answer: string) => void,
  fallbackError: string,
) {
  const response = await fetch(`${BASE_PATH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error ?? fallbackError);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let answer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split("\n")) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      try {
        answer += JSON.parse(data).delta?.text ?? "";
        onAnswer(answer);
      } catch {
        /* Ignore keep-alive and incomplete SSE frames. */
      }
    }
  }
}
