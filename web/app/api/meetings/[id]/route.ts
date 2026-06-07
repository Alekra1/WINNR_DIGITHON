import { NextResponse } from "next/server";
import { getMeeting, updateMeeting } from "@/lib/store";
import { computeParticipation } from "@/lib/metrics";
import { buildSnapshots } from "@/lib/pipeline";
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
  return NextResponse.json(updated);
}
