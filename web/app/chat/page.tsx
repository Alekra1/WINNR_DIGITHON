"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, Scope } from "@/lib/types";

const SCOPE_LABELS: Record<Scope, string> = {
  company: "Company-wide",
  project: "Project",
};

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2.5 max-w-[80%]">
        <div
          className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
          style={{ background: "var(--accent)" }}
        >
          W
        </div>
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2.5">
        <div
          className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ background: "var(--accent)" }}
        >
          W
        </div>
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{
                background: "var(--text-3)",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<Scope>("company");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, scope }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { answer } = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer },
      ]);
    } catch (err) {
      setError((err as Error).message);
      // remove the optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>
            AI Chat
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            Ask questions about your meetings, team performance, or action items.
          </p>
        </div>

        {/* Scope toggle */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                scope === s
                  ? {
                      background: "var(--accent)",
                      color: "#fff",
                    }
                  : {
                      background: "transparent",
                      color: "var(--text-2)",
                    }
              }
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              W
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                WINNR AI
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                Ask me anything about your meetings and team.
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {[
                "Who spoke the most last week?",
                "Summarise outstanding action items",
                "What topics came up in planning sessions?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="btn-ghost text-xs rounded-full px-4 py-1.5"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <UserBubble key={i} content={msg.content} />
          ) : (
            <AssistantBubble key={i} content={msg.content} />
          )
        )}

        {loading && <ThinkingBubble />}

        {error && (
          <div
            className="text-sm text-center rounded-lg px-4 py-2"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-6 pb-6 pt-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl p-3"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your meetings… (Enter to send)"
            disabled={loading}
            className="flex-1 bg-transparent resize-none text-sm outline-none max-h-40"
            style={{ color: "var(--text-1)" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-opacity"
            style={{
              background: "var(--accent)",
              opacity: !input.trim() || loading ? 0.4 : 1,
              cursor: !input.trim() || loading ? "not-allowed" : "pointer",
            }}
            aria-label="Send"
          >
            <svg
              className="h-4 w-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-[10px] text-center" style={{ color: "var(--text-3)" }}>
          Scope: <strong style={{ color: "var(--text-2)" }}>{SCOPE_LABELS[scope]}</strong>
          &nbsp;· Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
