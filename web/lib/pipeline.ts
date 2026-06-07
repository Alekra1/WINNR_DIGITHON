// Ingest pipeline: ties transcription → metrics → summary/tasks → snapshots →
// store + Muninn memory. Used by /api/ingest (full run) and /api/meetings/[id]
// (speaker-rename recompute).

import { transcribeAudio } from "@/lib/assembly";
import { computeParticipation } from "@/lib/metrics";
import { summarizeMeeting, generateTasks } from "@/lib/llm";
import { rememberMemory } from "@/lib/muninn";
import { getMeeting, updateMeeting } from "@/lib/store";
import type {
  Meeting,
  EmployeeSnapshot,
  Task,
  Participation,
} from "@/lib/types";

/** Group tasks under each participant to form per-employee snapshots. */
export function buildSnapshots(
  participation: Participation[],
  tasks: Task[],
): EmployeeSnapshot[] {
  return participation.map((p) => ({
    employeeName: p.employeeName,
    talkPct: p.talkPct,
    avgSentimentScore: p.avgSentimentScore,
    tasks: tasks.filter((t) => t.assignee === p.employeeName),
  }));
}

export interface MemoryWriteReport {
  written: number;
  failed: number;
  errors: string[];
}

/**
 * Persist atomic, entity-tagged memories to Muninn.
 * Sequential (avoids MCP session-init races) and logged (no silent failures).
 * Returns a report; callers decide whether to surface it.
 */
export async function writeMemories(m: Meeting): Promise<MemoryWriteReport> {
  const people = m.participation.map((p) => ({
    name: p.employeeName,
    type: "person",
  }));
  const baseEntities = [
    { name: m.title, type: "meeting" },
    ...(m.project ? [{ name: m.project, type: "project" }] : []),
    ...(m.department ? [{ name: m.department, type: "department" }] : []),
    ...people,
  ];

  const jobs: { label: string; args: Parameters<typeof rememberMemory>[0] }[] = [
    {
      label: "summary",
      args: {
        content: `Meeting "${m.title}" (${m.type}) summary:\n${m.summary}`,
        type: "meeting_summary",
        summary: m.title,
        entities: baseEntities,
      },
    },
    ...m.snapshots.map((s) => {
      const taskLine = s.tasks.length
        ? ` Action items: ${s.tasks.map((t) => t.text).join("; ")}.`
        : "";
      return {
        label: `snapshot:${s.employeeName}`,
        args: {
          content: `In "${m.title}", ${s.employeeName} spoke ${s.talkPct}% of the time (sentiment ${s.avgSentimentScore}).${taskLine}`,
          type: "participation_snapshot",
          summary: `${s.employeeName} in ${m.title}`,
          entities: [
            { name: s.employeeName, type: "person" },
            { name: m.title, type: "meeting" },
            ...(m.project ? [{ name: m.project, type: "project" }] : []),
          ],
        },
      };
    }),
  ];

  const report: MemoryWriteReport = { written: 0, failed: 0, errors: [] };
  for (const job of jobs) {
    try {
      await rememberMemory(job.args);
      report.written++;
    } catch (e) {
      report.failed++;
      const msg = `${job.label}: ${e instanceof Error ? e.message : String(e)}`;
      report.errors.push(msg);
      console.error("[muninn write failed]", msg);
    }
  }
  return report;
}

/** Full pipeline for a freshly uploaded meeting. Run fire-and-forget. */
export async function processMeeting(id: string, buffer: Buffer): Promise<void> {
  try {
    const { transcriptText, utterances, durationSec } = await transcribeAudio({
      buffer,
    });
    const meeting = await getMeeting(id);
    if (!meeting) return;

    const speakerMap = meeting.speakerMap ?? {};
    const participation = computeParticipation(utterances, speakerMap);
    const speakerNames = participation.map((p) => p.employeeName);

    const [summary, tasks] = await Promise.all([
      summarizeMeeting(transcriptText, meeting.type),
      generateTasks(transcriptText, speakerNames),
    ]);
    const snapshots = buildSnapshots(participation, tasks);

    const updated = await updateMeeting(id, {
      transcriptText,
      utterances,
      durationSec,
      participation,
      summary,
      tasks,
      snapshots,
      status: "ready",
    });

    if (updated) {
      const report = await writeMemories(updated);
      console.log(
        `[muninn] meeting ${id}: ${report.written} written, ${report.failed} failed`,
      );
    }
  } catch (e) {
    await updateMeeting(id, {
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
