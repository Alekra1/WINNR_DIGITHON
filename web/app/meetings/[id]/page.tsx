"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Task, SpeakerMap } from "@/lib/types";
import { StatusBadge, TypeBadge, SentimentDot } from "@/components/Badge";
import TaskList from "@/components/TaskList";
import Markdown from "@/components/Markdown";
import { useMeeting } from "@/hooks/useMeeting";
import { formatDuration, formatDate } from "@/lib/utils";

const TalkTimeChart = dynamic(() => import("@/components/TalkTimeChart"), {
  ssr: false,
});

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
  const { meeting, loading, error: fetchError, setMeeting } = useMeeting(id);

  // ── Speaker map draft (B2 fix) ─────────────────────────────────────────────
  // Initialised once from the first "ready" meeting; never overwritten by polls.
  const [speakerMap, setSpeakerMap] = useState<SpeakerMap>({});
  const speakerMapInitialisedRef = useRef(false);

  useEffect(() => {
    if (
      !speakerMapInitialisedRef.current &&
      meeting !== null &&
      meeting.status !== "processing"
    ) {
      speakerMapInitialisedRef.current = true;
      setSpeakerMap(meeting.speakerMap ?? {});
    }
  }, [meeting]);

  // ── Speaker-map save state ─────────────────────────────────────────────────
  const [savingMap, setSavingMap] = useState(false);
  const [mapSaved, setMapSaved] = useState(false);
  const [mapSaveError, setMapSaveError] = useState<string | null>(null);

  // ── Tasks save state ───────────────────────────────────────────────────────
  const [savingTasks, setSavingTasks] = useState(false);
  const [taskSaveError, setTaskSaveError] = useState<string | null>(null);

  // ── Deduplicated diarization labels (B3/perf fix) ──────────────────────────
  const diarizationLabels = useMemo(() => {
    if (!meeting) return [];
    const seen = new Set<string>();
    for (const u of meeting.utterances) seen.add(u.speaker);
    return Array.from(seen).sort();
  }, [meeting]);

  // ── PATCH helper ──────────────────────────────────────────────────────────
  const handlePatch = useCallback(
    async (body: { speakerMap?: SpeakerMap; tasks?: Task[] }) => {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`PATCH failed: HTTP ${res.status}`);
      return res.json();
    },
    [id]
  );

  // ── Save speaker map (B3 fix: surfaces error inline) ──────────────────────
  async function saveSpeakerMap() {
    setSavingMap(true);
    setMapSaveError(null);
    try {
      const updated = await handlePatch({ speakerMap });
      setMeeting(updated);
      setMapSaved(true);
      setTimeout(() => setMapSaved(false), 2000);
    } catch (err) {
      setMapSaveError((err as Error).message);
    } finally {
      setSavingMap(false);
    }
  }

  // ── Save tasks (B3 fix: surfaces error inline) ─────────────────────────────
  async function saveTasks(tasks: Task[]) {
    setSavingTasks(true);
    setTaskSaveError(null);
    try {
      const updated = await handlePatch({ tasks });
      setMeeting(updated);
    } catch (err) {
      setTaskSaveError((err as Error).message);
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
            {/* Status badges only — no redundant inline Spinner here (B1 fix).
                The full processing card below is the single processing indicator. */}
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={meeting.type} />
              <StatusBadge status={meeting.status} />
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
              border: "1px solid rgba(239,68,68,0.3)",
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

      {/* ── Processing placeholder (sole processing indicator) ── */}
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
                        color: "var(--accent)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {label}
                    </span>
                    <input
                      type="text"
                      aria-label={`Name for speaker ${label}`}
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
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    save
                  </span>
                  {savingMap ? "Saving…" : "Save names"}
                </button>
                {mapSaved && (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--green)" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      check_circle
                    </span>
                    Saved!
                  </span>
                )}
                {/* B3 fix: inline save error for speaker map */}
                {mapSaveError && (
                  <span className="text-xs" style={{ color: "var(--red)" }}>
                    {mapSaveError}
                  </span>
                )}
              </div>
            </SectionCard>
          )}

          {/* (d) Summary */}
          {meeting.summary && (
            <SectionCard title="Summary" icon="summarize">
              <div className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                <Markdown text={meeting.summary} />
              </div>
            </SectionCard>
          )}

          {/* (e) Tasks */}
          <SectionCard title="Action items" icon="task_alt">
            <TaskList tasks={meeting.tasks} onSave={saveTasks} saving={savingTasks} />
            {/* B3 fix: inline save error for tasks */}
            {taskSaveError && (
              <p className="text-xs mt-2" style={{ color: "var(--red)" }}>
                {taskSaveError}
              </p>
            )}
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
                      border: "1px solid var(--border)",
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
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-1)" }}
                        >
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
                        <span style={{ color: "var(--text-2)" }}>{snap.tasks.length}</span>
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
                                background: t.done
                                  ? "var(--green)"
                                  : "var(--accent-container)",
                                marginTop: "5px",
                              }}
                            />
                            <span
                              style={
                                t.done
                                  ? {
                                      textDecoration: "line-through",
                                      color: "var(--text-3)",
                                    }
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
                          color: "var(--text-3)",
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
        borderColor: "var(--accent-container)",
        borderTopColor: "transparent",
      }}
    />
  );
}
