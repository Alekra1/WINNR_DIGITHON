"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Meeting, MeetingType } from "@/lib/types";
import { StatusBadge, TypeBadge } from "@/components/Badge";
import { ACCEPT_ATTR, ACCEPT_HINT, validateUploadFile } from "@/lib/constants";

const MEETING_TYPES: MeetingType[] = [
  "standup",
  "one_on_one",
  "planning",
  "retro",
  "review",
  "other",
];

const TYPE_LABELS: Record<MeetingType, string> = {
  standup:    "Standup",
  one_on_one: "1-on-1",
  planning:   "Planning",
  retro:      "Retro",
  review:     "Review",
  other:      "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day:   "numeric",
    year:  "numeric",
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
  const [participants, setParticipants] = useState("");
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      const err = validateUploadFile(selected.name, selected.size);
      setUploadError(err);
    } else {
      setUploadError(null);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    // Re-validate on submit
    const validationErr = validateUploadFile(file.name, file.size);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }

    setUploading(true);
    setUploadError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    form.append("type", type);
    form.append("participants", participants.trim());

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
      {/* ── Page header ── */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
          Upload a recording to get AI-powered meeting insights.
        </p>
      </div>

      {/* ── Upload card ── */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <span
            className="material-symbols-outlined"
            style={{ color: "var(--accent)", fontSize: 20 }}
          >
            upload_file
          </span>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
            Upload a recording
          </h2>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1.5">
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
            <div className="space-y-1.5">
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
              Expected participants
            </label>
            <textarea
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Alice Johnson, Bob Smith, Yani Petrova"
              className="input min-h-20 resize-y"
            />
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              Optional. Add names separated by commas or new lines to improve automatic speaker and task assignment.
            </p>
          </div>

          {/* File drop zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
              Audio / video file
            </label>
            <div
              className="flex items-center gap-3 rounded-xl p-5 cursor-pointer transition-all duration-200"
              style={{
                border:     `2px dashed ${uploadError ? "var(--red)" : "var(--border)"}`,
                background: "var(--bg-surface)",
              }}
              onClick={() => fileRef.current?.click()}
            >
              <span
                className="material-symbols-outlined shrink-0"
                style={{
                  fontSize: 24,
                  color: file ? "var(--accent)" : "var(--text-3)",
                }}
              >
                {file ? "audio_file" : "cloud_upload"}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  className="text-sm block truncate"
                  style={{ color: file ? "var(--text-1)" : "var(--text-3)" }}
                >
                  {file ? file.name : "Click to select a file…"}
                </span>
                <span className="text-xs mt-0.5 block" style={{ color: "var(--text-3)" }}>
                  Supported: {ACCEPT_HINT}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Inline error */}
          {uploadError && (
            <div
              className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                border:     "1px solid rgba(239,68,68,0.25)",
                color:      "var(--red)",
              }}
            >
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18 }}>
                error
              </span>
              {uploadError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !file || !title.trim() || !!uploadError}
              className="btn-primary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {uploading ? "hourglass_top" : "analytics"}
              </span>
              {uploading ? "Uploading…" : "Upload & analyse"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Meeting list ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
            All meetings
          </h2>
          {meetings.length > 0 && (
            <span className="badge" style={{ background: "var(--bg-surface-high)", color: "var(--text-2)" }}>
              {meetings.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card p-5 h-36 animate-pulse"
                style={{ background: "var(--bg-card)" }}
              />
            ))}
          </div>
        ) : fetchError ? (
          <div
            className="card p-8 text-center"
            style={{ color: "var(--text-2)" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 36, color: "var(--text-3)", display: "block", marginBottom: 8 }}
            >
              cloud_off
            </span>
            <p className="text-sm">Failed to load meetings: {fetchError}</p>
            <button onClick={fetchMeetings} className="btn-ghost mt-4 text-xs">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>
              Retry
            </button>
          </div>
        ) : meetings.length === 0 ? (
          <div className="card p-14 text-center">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 44, color: "var(--text-3)", display: "block", marginBottom: 12 }}
            >
              calendar_today
            </span>
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
                className="card card-hover p-5 flex flex-col gap-3 group"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="text-sm font-semibold leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-[var(--accent)]"
                    style={{ color: "var(--text-1)" }}
                  >
                    {m.title}
                  </h3>
                  <StatusBadge status={m.status} />
                </div>

                {/* Meta row */}
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
                  <div
                    className="flex items-center gap-1.5 text-xs mt-auto pt-2"
                    style={{
                      color:     "var(--text-2)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>
                      person
                    </span>
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
