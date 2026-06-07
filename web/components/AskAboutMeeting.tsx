"use client";

// Placeholder for the meeting-scoped Muninn Q&A. Intentionally inert — the
// input + send button render the affordance, but no request is made yet.
// TODO(muninn): wire to a meeting-scoped chat endpoint (analogous to /app/chat
// but bound to this meeting id + its memories).

export default function AskAboutMeeting({ title }: { title: string }) {
  return (
    <section
      className="card p-6 space-y-4"
      style={{
        background:
          "linear-gradient(145deg, rgba(37,99,235,0.10) 0%, var(--bg-card) 60%)",
        borderColor: "rgba(37,99,235,0.35)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined"
          style={{ color: "var(--accent)", fontSize: 20 }}
        >
          forum
        </span>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
          Ask about this meeting
        </h2>
        <span
          className="badge ml-1"
          style={{
            background: "rgba(141,144,160,0.15)",
            color: "var(--text-3)",
            fontSize: "10px",
            padding: "1px 6px",
          }}
        >
          Soon
        </span>
      </div>

      <p className="text-xs" style={{ color: "var(--text-3)" }}>
        Powered by the Knowledge Vault — ask follow-ups, pull decisions, or
        check what was committed. Aware of this meeting&apos;s full context.
      </p>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="text"
          disabled
          placeholder={`e.g. "What did we decide in ${title || "this meeting"}?"`}
          className="input flex-1"
          style={{ cursor: "not-allowed" }}
        />
        <button
          type="submit"
          disabled
          className="btn-primary shrink-0"
          aria-label="Send (coming soon)"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            send
          </span>
        </button>
      </form>
    </section>
  );
}
