"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Meeting, MeetingType } from "@/lib/types";
import { StatusBadge, TypeBadge } from "@/components/Badge";

const MEETING_TYPES: MeetingType[] = [
  "standup",
  "one_on_one",
  "planning",
  "retro",
  "review",
  "other",
];

const TYPE_LABELS: Record<MeetingType, string> = {
  standup: "Standup",
  one_on_one: "1-on-1",
  planning: "Planning",
  retro: "Retro",
  review: "Review",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function topTalker(meeting: Meeting): string | null {
  if (!meeting.participation || meeting.participation.length === 0) return null;
  const top = [...meeting.participation].sort((a, b) => b.talkPct - a.talkPct)[0];
  return `${top.employeeName} (${Math.round(top.talkPct)}%)`;
}

export default function MeetingsDashboard() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MeetingType>("standup");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  async function fetchMeetings() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Meeting[] = await res.json();
      setMeetings(data);
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    setUploadError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    form.append("type", type);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { id } = await res.json();
      router.push(`/meetings/${id}`);
    } catch (err) {
      setUploadError((err as Error).message);
      setUploading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>
          Meetings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
          Upload an audio recording to get AI-powered insights.
        </p>
      </div>

      {/* Upload card */}
      <section className="card p-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-1)" }}>
          Upload a recording
        </h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                Meeting title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly team standup"
                className="input"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MeetingType)}
                className="input"
              >
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File input */}
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
              Audio file
            </label>
            <div
              className="flex items-center gap-3 rounded-lg p-4 cursor-pointer transition-colors"
              style={{ border: "2px dashed var(--border)", background: "var(--bg-input)" }}
              onClick={() => fileRef.current?.click()}
            >
              <svg
                className="h-5 w-5 shrink-0"
                style={{ color: "var(--text-3)" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-sm" style={{ color: file ? "var(--text-1)" : "var(--text-3)" }}>
                {file ? file.name : "Click to select audio (mp3, wav, m4a, …)"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {uploadError && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
              {uploadError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="btn-primary"
            >
              {uploading ? "Uploading…" : "Upload & analyse"}
            </button>
          </div>
        </form>
      </section>

      {/* Meeting list */}
      <section>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-1)" }}>
          All meetings
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card p-5 h-32 animate-pulse"
                style={{ background: "var(--bg-card)" }}
              />
            ))}
          </div>
        ) : fetchError ? (
          <div
            className="card p-6 text-center"
            style={{ color: "var(--text-2)" }}
          >
            <p className="text-sm">Failed to load meetings: {fetchError}</p>
            <button onClick={fetchMeetings} className="btn-ghost mt-3 text-xs">
              Retry
            </button>
          </div>
        ) : meetings.length === 0 ? (
          <div
            className="card p-12 text-center"
          >
            <svg
              className="mx-auto h-10 w-10 mb-3"
              style={{ color: "var(--text-3)" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
              No meetings yet — upload one above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="card p-5 flex flex-col gap-3 hover:border-[var(--accent)] transition-colors group"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="text-sm font-semibold leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2"
                    style={{ color: "var(--text-1)" }}
                  >
                    {m.title}
                  </h3>
                  <StatusBadge status={m.status} />
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-2 items-center">
                  <TypeBadge type={m.type} />
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>
                    {formatDate(m.createdAt)}
                  </span>
                  {m.durationSec > 0 && (
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>
                      · {formatDuration(m.durationSec)}
                    </span>
                  )}
                </div>

                {/* Top talker */}
                {topTalker(m) && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-2)" }}>
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {topTalker(m)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
