import fs from "fs/promises";
import path from "path";
import type { Meeting } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "meetings.json");

async function readAll(): Promise<Meeting[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const trimmed = raw.trim();
    if (!trimmed) return [];
    return JSON.parse(trimmed) as Meeting[];
  } catch (err) {
    // File or directory missing — treat as empty store.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(meetings: Meeting[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(meetings, null, 2), "utf-8");
}

/** Return all meetings, newest first by createdAt. */
export async function listMeetings(): Promise<Meeting[]> {
  const all = await readAll();
  return all.slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Return a single meeting by id, or null if not found. */
export async function getMeeting(id: string): Promise<Meeting | null> {
  const all = await readAll();
  return all.find((m) => m.id === id) ?? null;
}

/** Upsert a meeting by id (replace if exists, append if new). */
export async function saveMeeting(m: Meeting): Promise<void> {
  const all = await readAll();
  const idx = all.findIndex((existing) => existing.id === m.id);
  if (idx !== -1) {
    all[idx] = m;
  } else {
    all.push(m);
  }
  await writeAll(all);
}

/**
 * Shallow-merge patch into the meeting with the given id.
 * Returns the updated meeting, or null if not found.
 */
export async function updateMeeting(
  id: string,
  patch: Partial<Meeting>
): Promise<Meeting | null> {
  const all = await readAll();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated: Meeting = { ...all[idx], ...patch, id }; // id cannot be overwritten
  all[idx] = updated;
  await writeAll(all);
  return updated;
}
