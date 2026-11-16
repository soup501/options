"use client";

import { FormEvent, useState } from "react";
import { readChatStream } from "@/lib/ai/read-chat-stream";

type Message = { role: "user" | "assistant"; content: string };

export function LearnChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask me about calls, puts, premiums, break-even, or any action in this simulator. I will use the project's actual rules and small examples.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      setMessages((current) => [...current, { role: "assistant", content: "" }]);
      await readChatStream(
        "/api/learn-chat",
        { messages: next },
        (answer) =>
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1
                ? { ...message, content: answer }
                : message,
            ),
          ),
        "Tutor unavailable.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tutor unavailable.");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section
      className="mt-7 overflow-hidden rounded-lg border border-[#dce7df] bg-white shadow-sm"
      id="learn-chat"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6eee8] bg-[#f4f8f3] p-5">
        <div>
          <span className="text-[10px] font-bold tracking-[1.5px] text-[#718279]">
            PROJECT TUTOR
          </span>
          <h2 className="mt-1 font-serif text-[24px] font-medium text-[#1c322c]">
            Ask the learning agent
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-[#718078]">
            The tutor knows the simulator&apos;s rules, routes, source docs, and
            educational examples. It is a teaching aid, not financial advice.
          </p>
        </div>
        <span className="rounded-full bg-[#e4f1e8] px-3 py-1 text-[10px] font-bold text-[#27765a]">
          Context-aware
        </span>
      </div>
      <div
        className="max-h-[420px] space-y-3 overflow-y-auto p-5"
        aria-live="polite"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-[#2f5c50] p-3 text-sm leading-6 text-white"
                : "max-w-[90%] rounded-lg border border-[#e6eee8] bg-[#fafcf9] p-3 text-sm leading-6 text-[#43564d]"
            }
          >
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[1px] opacity-60">
              {message.role === "user" ? "You" : "Tutor"}
            </span>
            <div className="whitespace-pre-wrap">
              {message.content || (loading ? "Thinking..." : "")}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={submit}
        className="flex gap-2 border-t border-[#e6eee8] p-4"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-w-0 flex-1 rounded border border-[#cddbd1] bg-white px-3 py-2 text-sm outline-none focus:border-[#438d6c]"
          placeholder="Why is buy to close different from sell to close?"
          aria-label="Ask the learning tutor"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-[#247c60] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Answering" : "Ask"}
        </button>
      </form>
      {error && <p className="px-4 pb-4 text-xs text-[#bd5b55]">{error}</p>}
    </section>
  );
}
