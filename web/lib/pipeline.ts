// Ingest pipeline: ties transcription → metrics → summary/tasks → snapshots →
// store + Muninn memory. Used by /api/ingest (full run) and /api/meetings/[id]
// (speaker-rename recompute).

import { transcribeAudio, deleteTranscript } from "@/lib/assembly";
import { computeParticipation } from "@/lib/metrics";
import { resolveName } from "@/lib/metrics";
import { summarizeMeeting, generateTasks } from "@/lib/llm";
import { rememberMemory } from "@/lib/muninn";
import { getMeeting, updateMeeting } from "@/lib/store";
import type {
  Meeting,
  EmployeeSnapshot,
  Task,
  Participation,
} from "@/lib/types";

function formatSpeakerTranscript(
  utterances: { speaker: string; text: string }[],
  speakerMap: Record<string, string>
): string {
  return utterances
    .map((u) => `${resolveName(u.speaker, speakerMap)}: ${u.text}`)
    .join("\n");
}

function normalizeTaskAssignees(tasks: Task[], participantNames: string[]): Task[] {
  const byLowerName = new Map(
    participantNames.map((name) => [name.toLowerCase(), name])
  );

  return tasks.map((task) => {
    const assignee = byLowerName.get(task.assignee.toLowerCase());
    return assignee ? { ...task, assignee } : task;
  });
}

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
      // Muninn recall surfaces the `summary` field — put the substance there.
      args: {
        content: `Meeting "${m.title}" (${m.type}) summary:\n${m.summary}`,
        type: "meeting_summary",
        summary: `Summary of "${m.title}" (${m.type}): ${m.summary
          .replace(/\s+/g, " ")
          .slice(0, 450)}`,
        entities: baseEntities,
      },
    },
    ...m.snapshots.map((s) => {
      const taskLine = s.tasks.length
        ? ` Action items: ${s.tasks.map((t) => t.text).join("; ")}.`
        : "";
      const line = `In "${m.title}", ${s.employeeName} spoke ${s.talkPct}% of the time (sentiment score ${s.avgSentimentScore}).${taskLine}`;
      return {
        label: `snapshot:${s.employeeName}`,
        args: {
          content: line,
          type: "participation_snapshot",
          summary: line,
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
    const initialMeeting = await getMeeting(id);
    if (!initialMeeting) return;

    const {
      transcriptText,
      utterances,
      speakerMap: identifiedSpeakerMap,
      durationSec,
      transcriptId,
    } = await transcribeAudio({
      buffer,
      expectedParticipants: initialMeeting.expectedParticipants,
    });

    // Recording is now transcribed — remove it from AssemblyAI so no audio is
    // retained on the third party. Fail-soft: never block the pipeline on this.
    deleteTranscript(transcriptId).catch((e) =>
      console.error(`[assemblyai] failed to delete transcript ${transcriptId}:`, e),
    );

    const meeting = await getMeeting(id);
    if (!meeting) return;

    const speakerMap = {
      ...identifiedSpeakerMap,
      ...(meeting.speakerMap ?? {}),
    };
    const participation = computeParticipation(utterances, speakerMap);
    const speakerNames = participation.map((p) => p.employeeName);
    const speakerTranscript = formatSpeakerTranscript(utterances, speakerMap);

    const [summary, extractedTasks] = await Promise.all([
      summarizeMeeting(speakerTranscript || transcriptText, meeting.type),
      generateTasks(speakerTranscript || transcriptText, speakerNames),
    ]);
    const tasks = normalizeTaskAssignees(extractedTasks, speakerNames);
    const snapshots = buildSnapshots(participation, tasks);

    const updated = await updateMeeting(id, {
      transcriptText,
      utterances,
      speakerMap,
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
    try {
      await updateMeeting(id, {
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    } catch (writeErr) {
      console.error(
        `[pipeline] Failed to write error status for meeting ${id}:`,
        writeErr
      );
    }
  }
}
