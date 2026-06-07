import { NextResponse } from "next/server";
import { getMeeting, updateMeeting } from "@/lib/store";
import { computeParticipation } from "@/lib/metrics";
import { buildSnapshots, syncMemories } from "@/lib/pipeline";
import type { Meeting, SpeakerMap, Task } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(meeting);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await getMeeting(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      speakerMap?: SpeakerMap;
      tasks?: Task[];
    };

    const patch: Partial<Meeting> = {};

    // Renaming speakers: recompute participation labels + snapshots.
    if (body.speakerMap) {
      patch.speakerMap = body.speakerMap;
      const participation = computeParticipation(
        existing.utterances,
        body.speakerMap,
      );
      patch.participation = participation;
      patch.snapshots = buildSnapshots(
        participation,
        body.tasks ?? existing.tasks,
      );
    }

    // Editing tasks: persist + re-group snapshots.
    if (body.tasks) {
      patch.tasks = body.tasks;
      const participation = patch.participation ?? existing.participation;
      patch.snapshots = buildSnapshots(participation, body.tasks);
    }

    const updated = await updateMeeting(id, patch);
    if (updated === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Keep Muninn in sync with the edit — evolves existing memories in place.
    // Renamed speakers create fresh snapshot memories (old name left as-is).
    const report = await syncMemories(updated);
    console.log(
      `[muninn] patch ${id}: ${report.created} created, ${report.updated} updated, ${report.failed} failed`,
    );

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/meetings/[id]]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
