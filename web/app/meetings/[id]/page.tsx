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
    month: "short",
    day: "numeric",
    year: "numeric",
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6 space-y-4">
      <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
        {title}
      </h2>
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
      if (data.status !== "processing") {
        stopPolling();
      }
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

  // Start polling once we know status === processing
  useEffect(() => {
    if (meeting?.status === "processing" && !pollingRef.current) {
      pollingRef.current = setInterval(fetchMeeting, 4000);
    }
  }, [meeting?.status, fetchMeeting]);

  async function handlePatch(body: { speakerMap?: SpeakerMap; tasks?: Task[] }) {
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  /* ── Render states ── */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (fetchError || !meeting) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
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
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      {/* ── (a) Header ── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--text-1)" }}>
              {meeting.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={meeting.type} />
              <StatusBadge status={meeting.status} />
              {meeting.status === "processing" && <Spinner small />}
            </div>
          </div>
          <div className="text-right space-y-1">
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

        {meeting.status === "error" && meeting.error && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}
          >
            {meeting.error}
          </div>
        )}
      </div>

      {/* ── Processing placeholder ── */}
      {meeting.status === "processing" && (
        <div className="card p-10 text-center space-y-3">
          <Spinner />
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Analysis in progress — this usually takes 1–2 minutes.
          </p>
        </div>
      )}

      {meeting.status !== "processing" && (
        <>
          {/* ── (b) Talk-time chart ── */}
          <SectionCard title="Talk time">
            <TalkTimeChart participation={meeting.participation} />
          </SectionCard>

          {/* ── (c) Speaker naming ── */}
          {diarizationLabels.length > 0 && (
            <SectionCard title="Name speakers">
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                Map diarization labels to real names. Changes are reflected in
                charts and snapshots.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {diarizationLabels.map((label) => (
                  <div key={label} className="flex items-center gap-3">
                    <span
                      className="shrink-0 w-16 text-xs font-mono rounded px-2 py-1 text-center"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {label}
                    </span>
                    <input
                      type="text"
                      value={speakerMap[label] ?? ""}
                      placeholder={`Speaker ${label}`}
                      onChange={(e) =>
                        setSpeakerMap((prev) => ({
                          ...prev,
                          [label]: e.target.value,
                        }))
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
                  {savingMap ? "Saving…" : "Save names"}
                </button>
                {mapSaved && (
                  <span className="text-xs" style={{ color: "var(--green)" }}>
                    Saved!
                  </span>
                )}
              </div>
            </SectionCard>
          )}

          {/* ── (d) Summary ── */}
          {meeting.summary && (
            <SectionCard title="Summary">
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-2)" }}
              >
                {meeting.summary}
              </div>
            </SectionCard>
          )}

          {/* ── (e) Tasks ── */}
          <SectionCard title="Action items">
            <TaskList
              tasks={meeting.tasks}
              onSave={saveTasks}
              saving={savingTasks}
            />
          </SectionCard>

          {/* ── (f) Per-employee snapshots ── */}
          {meeting.snapshots && meeting.snapshots.length > 0 && (
            <SectionCard title="Employee snapshots">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {meeting.snapshots.map((snap) => (
                  <div
                    key={snap.employeeName}
                    className="rounded-lg p-4 space-y-3"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-1)" }}
                      >
                        {snap.employeeName}
                      </span>
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
                      <ul className="space-y-1">
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
                                  : "var(--accent)",
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
                        className="text-xs italic border-t pt-2"
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
      className={`${size} rounded-full border-t-transparent animate-spin inline-block`}
      style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
    />
  );
}
