"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";

interface Props {
  tasks: Task[];
  onSave: (tasks: Task[]) => Promise<void>;
  saving?: boolean;
}

export default function TaskList({ tasks, onSave, saving = false }: Props) {
  const [local, setLocal] = useState<Task[]>(tasks);

  function update(id: string, patch: Partial<Task>) {
    setLocal((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  return (
    <div className="space-y-3">
      {local.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--text-3)" }}>
          No tasks extracted from this meeting.
        </p>
      ) : (
        <ul className="space-y-2">
          {local.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-lg p-3"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
            >
              {/* Done checkbox */}
              <input
                type="checkbox"
                checked={task.done}
                onChange={(e) => update(task.id, { done: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--accent)] cursor-pointer"
              />

              {/* Text */}
              <input
                type="text"
                value={task.text}
                onChange={(e) => update(task.id, { text: e.target.value })}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{
                  color: task.done ? "var(--text-3)" : "var(--text-1)",
                  textDecoration: task.done ? "line-through" : "none",
                }}
              />

              {/* Assignee */}
              <input
                type="text"
                value={task.assignee}
                onChange={(e) => update(task.id, { assignee: e.target.value })}
                placeholder="Assignee"
                className="w-28 shrink-0 bg-transparent text-xs text-right outline-none"
                style={{ color: "var(--text-2)" }}
              />
            </li>
          ))}
        </ul>
      )}

      {local.length > 0 && (
        <button
          onClick={() => onSave(local)}
          disabled={saving}
          className="btn-primary text-sm"
        >
          {saving ? "Saving…" : "Save tasks"}
        </button>
      )}
    </div>
  );
}
