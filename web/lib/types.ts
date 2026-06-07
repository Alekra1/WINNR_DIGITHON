// Shared domain types for the WINNR meeting-intelligence MVP.
// All modules build against these. Do not change shapes without coordinating.

export type MeetingType =
  | "standup"
  | "one_on_one"
  | "planning"
  | "retro"
  | "review"
  | "other";

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

/** One contiguous speaker turn from AssemblyAI diarization. */
export interface Utterance {
  speaker: string; // diarization label: "A", "B", ...
  text: string;
  start: number; // ms
  end: number; // ms
  confidence?: number;
  sentiment?: Sentiment;
}

/** Maps a diarization label ("A") to a human name ("Yani"). User-edited in UI. */
export type SpeakerMap = Record<string, string>;

/** Names expected to appear in a meeting, provided before transcription. */
export type ExpectedParticipant = string;

/** Per-speaker participation metrics, computed from utterances. */
export interface Participation {
  speaker: string; // diarization label
  employeeName: string; // resolved via SpeakerMap, falls back to "Speaker A"
  talkTimeSec: number;
  talkPct: number; // 0..100, share of total speaking time
  turns: number;
  words: number;
  avgSentimentScore: number; // -1..1 (POSITIVE=1, NEUTRAL=0, NEGATIVE=-1 averaged)
}

export interface Task {
  id: string;
  assignee: string; // employee name or "Unassigned"
  text: string;
  done: boolean;
  dueDate?: string; // ISO date, optional
}

/** Per-employee snapshot for one meeting. */
export interface EmployeeSnapshot {
  employeeName: string;
  talkPct: number;
  avgSentimentScore: number;
  tasks: Task[];
  recommendation?: string; // optional one-line coaching note
}

/** The full structured meeting object — UI source of truth, persisted via store.ts. */
export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  createdAt: string; // ISO
  durationSec: number;
  project?: string;
  department?: string;
  expectedParticipants?: ExpectedParticipant[];
  transcriptText: string;
  utterances: Utterance[];
  speakerMap: SpeakerMap;
  summary: string;
  tasks: Task[];
  participation: Participation[];
  snapshots: EmployeeSnapshot[];
  status: "processing" | "ready" | "error";
  error?: string;
  archived?: boolean; // soft-delete: hidden from default list, recoverable
  memoryIds?: string[]; // Muninn memory ids written for this meeting (for forget-on-delete)
  excludedSpeakers?: string[]; // diarization labels marked as bot / non-participant — dropped from metrics
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Chat memory scope. company = unscoped recall; project = entity-scoped. */
export type Scope = "company" | "project";
