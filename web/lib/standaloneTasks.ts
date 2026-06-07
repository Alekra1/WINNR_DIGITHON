import fs from "fs/promises";
import path from "path";
import type { Task } from "@/lib/types";

export type StandaloneTask = Task & { createdAt: string };

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "standalone-tasks.json");

// Async write mutex — serializes all write operations (read-modify-write is atomic).
let chain: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<StandaloneTask[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const trimmed = raw.trim();
    if (!trimmed) return [];
    return JSON.parse(trimmed) as StandaloneTask[];
  } catch (err) {
    // File or directory missing — treat as empty store.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(tasks: StandaloneTask[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

/** Return all standalone tasks, newest first by createdAt. */
export async function listStandaloneTasks(): Promise<StandaloneTask[]> {
  const all = await readAll();
  return all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Create and persist a new standalone task. Serialized via mutex. */
export function addStandaloneTask(input: {
  text: string;
  assignee?: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
}): Promise<StandaloneTask> {
  const result = chain.then(async () => {
    const all = await readAll();
    const task: StandaloneTask = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      done: false,
      assignee: input.assignee?.trim() || "Unassigned",
      text: input.text.trim(),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    };
    all.push(task);
    await writeAll(all);
    return task;
  });
  chain = result.catch(() => undefined);
  return result as Promise<StandaloneTask>;
}

/**
 * Shallow-merge patch into the standalone task with the given id.
 * Returns the updated task, or null if not found. Serialized via mutex.
 */
export function updateStandaloneTask(
  id: string,
  patch: Partial<Task>
): Promise<StandaloneTask | null> {
  const result = chain.then(async () => {
    const all = await readAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const updated: StandaloneTask = { ...all[idx], ...patch, id }; // id cannot be overwritten
    all[idx] = updated;
    await writeAll(all);
    return updated;
  });
  chain = result.catch(() => undefined);
  return result;
}

/**
 * Permanently remove a standalone task by id. Serialized via mutex.
 * Returns true if a record was removed, false if no such task existed.
 */
export function deleteStandaloneTask(id: string): Promise<boolean> {
  const result = chain.then(async () => {
    const all = await readAll();
    const next = all.filter((t) => t.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  });
  chain = result.catch(() => undefined);
  return result;
}
