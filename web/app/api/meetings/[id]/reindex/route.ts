import { NextResponse } from "next/server";
import { getMeeting, updateMeeting } from "@/lib/store";
import { writeMemories } from "@/lib/pipeline";

export const runtime = "nodejs";

// Re-write a meeting's memories to Muninn. Returns a per-job report (surfaces errors).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const report = await writeMemories(meeting);
  if (report.ids.length > 0) {
    await updateMeeting(id, { memoryIds: report.ids });
  }
  return NextResponse.json(report);
}
