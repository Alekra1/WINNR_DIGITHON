"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Meeting, Task, SpeakerMap } from "@/lib/types";
import { StatusBadge, TypeBadge, SentimentDot } from "@/components/Badge";
import TaskList from "@/components/TaskList";

const TalkTimeChart = dynamic(() => import("@/components/TalkTimeChart"), {
  ssr: false,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6 space-y-5">
      <div className="flex items-center gap-2">
        {icon && (
          <span
            className="material-symbols-outlined"
            style={{ color: "var(--accent)", fontSize: 18 }}
          >
            {icon}
          </span>
        )}
        <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Speaker map editing
  const [speakerMap, setSpeakerMap] = useState<SpeakerMap>({});
  const [savingMap, setSavingMap] = useState(false);
  const [mapSaved, setMapSaved] = useState(false);

  // Tasks saving
  const [savingTasks, setSavingTasks] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchMeeting = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Meeting = await res.json();
      setMeeting(data);
      setSpeakerMap(data.speakerMap ?? {});
      if (data.status !== "processing") stopPolling();
      setFetchError(null);
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, stopPolling]);

  useEffect(() => {
    fetchMeeting();
    return () => stopPolling();
  }, [fetchMeeting, stopPolling]);

  useEffect(() => {
    if (meeting?.status === "processing" && !pollingRef.current) {
      pollingRef.current = setInterval(fetchMeeting, 4000);
    }
  }, [meeting?.status, fetchMeeting]);

  async function handlePatch(body: { speakerMap?: SpeakerMap; tasks?: Task[] }) {
    const res = await fetch(`/api/meetings/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH failed: HTTP ${res.status}`);
    const updated: Meeting = await res.json();
    setMeeting(updated);
    return updated;
  }

  async function saveSpeakerMap() {
    setSavingMap(true);
    try {
      await handlePatch({ speakerMap });
      setMapSaved(true);
      setTimeout(() => setMapSaved(false), 2000);
    } catch {
      // silently fail; user can retry
    } finally {
      setSavingMap(false);
    }
  }

  async function saveTasks(tasks: Task[]) {
    setSavingTasks(true);
    try {
      await handlePatch({ tasks });
    } catch {
      // silently fail
    } finally {
      setSavingTasks(false);
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  /* ── Fetch error state ── */
  if (fetchError || !meeting) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 48, color: "var(--text-3)", display: "block" }}
        >
          error_outline
        </span>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          {fetchError ?? "Meeting not found."}
        </p>
      </div>
    );
  }

  const diarizationLabels = Object.keys(
    meeting.utterances.reduce<Record<string, true>>((acc, u) => {
      acc[u.speaker] = true;
      return acc;
    }, {})
  ).sort();

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-5">
      {/* ── (a) Header ── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <h1
              className="text-xl font-bold leading-snug"
              style={{ color: "var(--text-1)" }}
            >
              {meeting.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={meeting.type} />
              <StatusBadge status={meeting.status} />
              {meeting.status === "processing" && <Spinner small />}
            </div>
          </div>
          <div className="text-right space-y-1 shrink-0">
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              {formatDate(meeting.createdAt)}
            </p>
            {meeting.durationSec > 0 && (
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                {formatDuration(meeting.durationSec)}
              </p>
            )}
          </div>
        </div>

        {/* ── Error banner (processing failed) ── */}
        {meeting.status === "error" && (
          <div
            className="mt-5 flex items-start gap-3 rounded-xl px-4 py-4"
            style={{
              background: "rgba(239,68,68,0.1)",
              border:     "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <span
              className="material-symbols-outlined shrink-0 mt-0.5"
              style={{ color: "var(--red)", fontSize: 20 }}
            >
              error
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={{ color: "var(--red)" }}>
                Processing failed
              </p>
              {meeting.error && (
                <p className="text-xs leading-relaxed" style={{ color: "#fca5a5" }}>
                  {meeting.error}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Processing placeholder ── */}
      {meeting.status === "processing" && (
        <div className="card p-12 text-center space-y-4">
          <Spinner />
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Analysis in progress — this usually takes 1–2 minutes.
          </p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            This page refreshes automatically.
          </p>
        </div>
      )}

      {/* ── Ready sections ── */}
      {meeting.status !== "processing" && meeting.status !== "error" && (
        <>
          {/* (b) Talk-time chart */}
          <SectionCard title="Talk time" icon="record_voice_over">
            <TalkTimeChart participation={meeting.participation} />
          </SectionCard>

          {/* (c) Speaker naming */}
          {diarizationLabels.length > 0 && (
            <SectionCard title="Name speakers" icon="badge">
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                Map diarization labels to real names. Changes are reflected in charts and snapshots.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {diarizationLabels.map((label) => (
                  <div key={label} className="flex items-center gap-3">
                    <span
                      className="shrink-0 w-16 text-xs font-mono rounded-lg px-2 py-1 text-center"
                      style={{
                        background: "var(--bg-surface)",
                        color:      "var(--accent)",
                        border:     "1px solid var(--border)",
                      }}
                    >
                      {label}
                    </span>
                    <input
                      type="text"
                      value={speakerMap[label] ?? ""}
                      placeholder={`Speaker ${label}`}
                      onChange={(e) =>
                        setSpeakerMap((prev) => ({ ...prev, [label]: e.target.value }))
                      }
                      className="input flex-1"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveSpeakerMap}
                  disabled={savingMap}
                  className="btn-primary text-sm"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                  {savingMap ? "Saving…" : "Save names"}
                </button>
                {mapSaved && (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--green)" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                    Saved!
                  </span>
                )}
              </div>
            </SectionCard>
          )}

          {/* (d) Summary */}
          {meeting.summary && (
            <SectionCard title="Summary" icon="summarize">
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-2)" }}
              >
                {meeting.summary}
              </div>
            </SectionCard>
          )}

          {/* (e) Tasks */}
          <SectionCard title="Action items" icon="task_alt">
            <TaskList tasks={meeting.tasks} onSave={saveTasks} saving={savingTasks} />
          </SectionCard>

          {/* (f) Per-employee snapshots */}
          {meeting.snapshots && meeting.snapshots.length > 0 && (
            <SectionCard title="Employee snapshots" icon="group">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {meeting.snapshots.map((snap) => (
                  <div
                    key={snap.employeeName}
                    className="rounded-xl p-4 space-y-3"
                    style={{
                      background: "var(--bg-surface)",
                      border:     "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 18, color: "var(--accent)" }}
                        >
                          account_circle
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                          {snap.employeeName}
                        </span>
                      </div>
                      <SentimentDot score={snap.avgSentimentScore} />
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span style={{ color: "var(--text-3)" }}>
                        Talk:&nbsp;
                        <span style={{ color: "var(--text-2)" }}>
                          {Math.round(snap.talkPct)}%
                        </span>
                      </span>
                      <span style={{ color: "var(--text-3)" }}>
                        Tasks:&nbsp;
                        <span style={{ color: "var(--text-2)" }}>
                          {snap.tasks.length}
                        </span>
                      </span>
                    </div>

                    {snap.tasks.length > 0 && (
                      <ul className="space-y-1.5">
                        {snap.tasks.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-start gap-2 text-xs"
                            style={{ color: "var(--text-2)" }}
                          >
                            <span
                              className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0"
                              style={{
                                background: t.done ? "var(--green)" : "var(--accent-container)",
                                marginTop:  "5px",
                              }}
                            />
                            <span
                              style={
                                t.done
                                  ? { textDecoration: "line-through", color: "var(--text-3)" }
                                  : {}
                              }
                            >
                              {t.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {snap.recommendation && (
                      <p
                        className="text-xs italic border-t pt-3 leading-relaxed"
                        style={{
                          color:       "var(--text-3)",
                          borderColor: "var(--border)",
                        }}
                      >
                        {snap.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  const size = small ? "h-4 w-4 border-2" : "h-8 w-8 border-2";
  return (
    <div
      className={`${size} rounded-full animate-spin inline-block`}
      style={{
        borderColor:    "var(--accent-container)",
        borderTopColor: "transparent",
      }}
    />
  );
}
