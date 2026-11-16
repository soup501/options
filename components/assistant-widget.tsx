"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { readChatStream } from "@/lib/ai/read-chat-stream";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Summarize what's on this screen",
  "How are my positions doing?",
  "What's my max loss right now?",
];

export function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  async function ask(question: string) {
    if (!question || loading) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      setMessages((current) => [...current, { role: "assistant", content: "" }]);
      await readChatStream(
        "/api/assistant",
        {
          messages: next,
          page: {
            path: pathname,
            text: document.querySelector("main")?.textContent?.replace(/\s+/g, " ").trim(),
          },
        },
        (answer) =>
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1
                ? { ...message, content: answer }
                : message,
            ),
          ),
        "Assistant unavailable.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assistant unavailable.");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input.trim());
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          className="flex h-[520px] max-h-[calc(100vh-110px)] w-[380px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-lg border border-[#dce7df] bg-white shadow-xl"
          aria-label="OptionLab assistant"
        >
          <header className="flex items-center justify-between bg-[#2f5c50] px-4 py-3 text-white">
            <div>
              <strong className="block text-sm">Ask OptionLab</strong>
              <span className="text-[11px] opacity-75">
                Sees this page and your positions
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-lg leading-none"
              aria-label="Close assistant"
            >
              ×
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {!messages.length && (
              <div className="space-y-2">
                <p className="text-sm text-[#43564d]">
                  Ask about what you&apos;re looking at, your positions, or any
                  trade.
                </p>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void ask(suggestion)}
                    className="block w-full rounded border border-[#cddbd1] px-3 py-2 text-left text-xs text-[#2f5c50] hover:bg-[#f4f8f3]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-[#2f5c50] p-3 text-sm leading-6 text-white"
                    : "max-w-[90%] whitespace-pre-wrap rounded-lg border border-[#e6eee8] bg-[#fafcf9] p-3 text-sm leading-6 text-[#43564d]"
                }
              >
                {message.content || (loading ? "Thinking..." : "")}
              </div>
            ))}
            {error && <p className="text-xs text-[#bd5b55]">{error}</p>}
            <div ref={end} />
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-[#e6eee8] p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 rounded border border-[#cddbd1] px-3 py-2 text-sm outline-none focus:border-[#438d6c]"
              placeholder="Ask a question…"
              aria-label="Ask the assistant"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded bg-[#247c60] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#247c60] text-2xl text-white shadow-lg hover:bg-[#2f5c50]"
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
