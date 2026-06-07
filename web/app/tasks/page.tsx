"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TrackerTask } from "@/lib/types";
import { formatDate } from "@/lib/utils";

// ── Priority badge ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority?: "high" | "medium" | "low" }) {
  if (!priority) return null;

  const styles: Record<"high" | "medium" | "low", React.CSSProperties> = {
    high: {
      color: "var(--red)",
      background: "rgba(239,68,68,0.12)",
    },
    medium: {
      color: "#f59e0b",
      background: "rgba(245,158,11,0.12)",
    },
    low: {
      color: "var(--text-3)",
      background: "var(--bg-surface-high)",
    },
  };

  return (
    <span
      className="badge text-xs"
      style={styles[priority]}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

// ── Task row ────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: TrackerTask;
  onToggleDone: (task: TrackerTask) => Promise<void>;
  onEdit: (task: TrackerTask) => void;
  onDelete: (task: TrackerTask) => void;
}

function TaskRow({ task, onToggleDone, onEdit, onDelete }: TaskRowProps) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await onToggleDone(task);
    setToggling(false);
  }

  return (
    <div
      className="group flex items-start gap-3 py-3 px-2 rounded-xl transition-colors duration-150"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.done}
        disabled={toggling}
        onChange={handleToggle}
        aria-label={`Mark "${task.text}" as ${task.done ? "not done" : "done"}`}
        className="mt-0.5 shrink-0 h-4 w-4 cursor-pointer accent-[var(--accent)]"
        style={{ accentColor: "var(--accent)" }}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Task text */}
        <p
          className="text-sm leading-snug"
          style={{
            color: task.done ? "var(--text-3)" : "var(--text-1)",
            textDecoration: task.done ? "line-through" : "none",
          }}
        >
          {task.text}
        </p>

        {/* Chips row */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <PriorityBadge priority={task.priority} />

          {task.dueDate && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-3)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                event
              </span>
              {formatDate(task.dueDate)}
            </span>
          )}

          {task.assignee && task.assignee !== "Unassigned" && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-3)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                person
              </span>
              {task.assignee}
            </span>
          )}

          {/* Source */}
          {task.meetingId ? (
            <Link
              href={`/meetings/${task.meetingId}`}
              className="flex items-center gap-1 text-xs transition-colors hover:text-[var(--accent)]"
              style={{ color: "var(--text-3)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                link
              </span>
              {task.meetingTitle ?? "Meeting"}
            </Link>
          ) : (
            <span
              className="badge text-xs"
              style={{
                color: "var(--text-3)",
                background: "var(--bg-surface-high)",
                fontSize: 11,
              }}
            >
              Manual
            </span>
          )}
        </div>
      </div>

      {/* Action buttons (revealed on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        <button
          type="button"
          aria-label={`Edit task: ${task.text}`}
          onClick={() => onEdit(task)}
          className="flex items-center justify-center rounded-lg h-7 w-7 transition-colors"
          style={{
            color: "var(--text-2)",
            background: "transparent",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface-high)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
          }
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            edit
          </span>
        </button>
        <button
          type="button"
          aria-label={`Delete task: ${task.text}`}
          onClick={() => onDelete(task)}
          className="flex items-center justify-center rounded-lg h-7 w-7 transition-colors"
          style={{
            color: "var(--red)",
            background: "transparent",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
          }
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            delete
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Inline edit form ─────────────────────────────────────────────────────────

interface TaskEdit {
  text: string;
  assignee: string;
  priority: string; // "" clears priority
  dueDate: string; // "" clears due date
}

interface EditFormProps {
  task: TrackerTask;
  onSave: (updates: TaskEdit) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ task, onSave, onCancel }: EditFormProps) {
  const [text, setText] = useState(task.text);
  const [assignee, setAssignee] = useState(task.assignee ?? "");
  const [priority, setPriority] = useState<"high" | "medium" | "low" | "">(
    task.priority ?? ""
  );
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await onSave({
      text: text.trim(),
      assignee: assignee.trim() || "Unassigned",
      priority,
      dueDate,
    });
    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSave}
      className="py-3 px-2 flex flex-col gap-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Task text <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Assignee
          </label>
          <input
            className="input"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="e.g. Alice"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Priority
          </label>
          <select
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
          >
            <option value="">— None —</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Due date
          </label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving || !text.trim()}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Add task form ────────────────────────────────────────────────────────────

interface AddTaskFormProps {
  onAdd: (fields: {
    text: string;
    assignee?: string;
    priority?: "high" | "medium" | "low";
    dueDate?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

function AddTaskForm({ onAdd, onCancel }: AddTaskFormProps) {
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low" | "">("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [textError, setTextError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setTextError(true);
      return;
    }
    setTextError(false);
    setSubmitting(true);
    await onAdd({
      text: text.trim(),
      assignee: assignee.trim() || undefined,
      priority: priority || undefined,
      dueDate: dueDate || undefined,
    });
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-1)" }}>
        New Manual Task
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Task text <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <input
            className="input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) setTextError(false);
            }}
            placeholder="Describe the task…"
            aria-invalid={textError}
          />
          {textError && (
            <p className="text-xs" style={{ color: "var(--red)" }}>
              Task text is required.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Assignee
          </label>
          <input
            className="input"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="e.g. Alice"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Priority
          </label>
          <select
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
          >
            <option value="">— None —</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Due date
          </label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button type="submit" className="btn-primary" disabled={submitting}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            add
          </span>
          {submitting ? "Adding…" : "Add Task"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<TrackerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "done">("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all");

  // Edit state: maps task id → boolean (is in edit mode)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add task form visibility
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TrackerTask[] = await res.json();
      setTasks(data);
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleDone(task: TrackerTask) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: task.meetingId, done: !task.done }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t))
      );
    }
  }

  async function handleEditSave(task: TrackerTask, updates: TaskEdit) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: task.meetingId,
          text: updates.text,
          assignee: updates.assignee,
          priority: updates.priority,
          dueDate: updates.dueDate,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: TrackerTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      setFetchError((err as Error).message);
    }
  }

  async function handleDelete(task: TrackerTask) {
    const qs = task.meetingId ? `?meetingId=${encodeURIComponent(task.meetingId)}` : "";
    try {
      const res = await fetch(`/api/tasks/${task.id}${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setFetchError((err as Error).message);
    }
  }

  async function handleAddTask(fields: {
    text: string;
    assignee?: string;
    priority?: "high" | "medium" | "low";
    dueDate?: string;
  }) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setShowAddForm(false);
      await fetchTasks();
    } catch (err) {
      setFetchError((err as Error).message);
    }
  }

  // Distinct assignees for filter
  const assignees = Array.from(
    new Set(tasks.map((t) => t.assignee).filter((a) => a && a !== "Unassigned"))
  ).sort();

  // Distinct meeting count (non-null meetingIds)
  const distinctMeetingCount = new Set(
    tasks.map((t) => t.meetingId).filter(Boolean)
  ).size;

  // Client-side filtering
  const filtered = tasks.filter((t) => {
    if (filterStatus === "open" && t.done) return false;
    if (filterStatus === "done" && !t.done) return false;
    if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-1)" }}
          >
            Execution Command Center
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
            Review extracted tasks across your meetings.
          </p>
        </div>

        {/* Right-aligned actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sync with Jira — disabled, coming soon */}
          <button
            type="button"
            disabled
            className="btn-ghost cursor-not-allowed opacity-60 flex items-center gap-2"
            title="Jira integration coming soon"
            aria-label="Sync with Jira (coming soon)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              sync
            </span>
            Sync with Jira
            <span
              className="badge ml-1"
              style={{
                fontSize: 10,
                color: "var(--text-3)",
                background: "var(--bg-surface-high)",
                padding: "1px 6px",
              }}
            >
              Soon
            </span>
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-3)" }}>
          Filter:
        </span>

        <select
          className="input"
          style={{ width: "auto", minWidth: 120 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          aria-label="Filter by status"
        >
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>

        <select
          className="input"
          style={{ width: "auto", minWidth: 140 }}
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          aria-label="Filter by assignee"
        >
          <option value="all">All assignees</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          className="input"
          style={{ width: "auto", minWidth: 130 }}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
          aria-label="Filter by priority"
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* ── Task list card ── */}
      <section className="glass-card p-6">
        {/* Card header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--accent)", fontSize: 20 }}
            >
              auto_awesome
            </span>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
              Extracted Action Items
            </h2>
          </div>
          <span
            className="badge"
            style={{
              color: "var(--text-2)",
              background: "var(--bg-surface-high)",
              whiteSpace: "nowrap",
            }}
          >
            From {distinctMeetingCount} meeting{distinctMeetingCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Content states */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 rounded-xl animate-pulse"
                style={{ background: "var(--bg-surface)" }}
              />
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-8">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 36, color: "var(--text-3)", display: "block", marginBottom: 8 }}
            >
              cloud_off
            </span>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              Failed to load tasks: {fetchError}
            </p>
            <button onClick={fetchTasks} className="btn-ghost mt-4 text-xs">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                refresh
              </span>
              Retry
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 44, color: "var(--text-3)", display: "block", marginBottom: 12 }}
            >
              task_alt
            </span>
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
              No tasks yet — upload a meeting or add one manually.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 36, color: "var(--text-3)", display: "block", marginBottom: 8 }}
            >
              filter_list_off
            </span>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              No tasks match the current filters.
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((task) =>
              editingId === task.id ? (
                <EditForm
                  key={task.id}
                  task={task}
                  onSave={(updates) => handleEditSave(task, updates)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggleDone={handleToggleDone}
                  onEdit={(t) => setEditingId(t.id)}
                  onDelete={handleDelete}
                />
              )
            )}
          </div>
        )}

        {/* Add manual task */}
        {!loading && !fetchError && (
          <>
            {showAddForm ? (
              <AddTaskForm
                onAdd={handleAddTask}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button
                type="button"
                className="btn-ghost mt-4 w-full justify-center"
                onClick={() => setShowAddForm(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  add
                </span>
                Add Manual Task
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
