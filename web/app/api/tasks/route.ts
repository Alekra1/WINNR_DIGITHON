import { NextResponse } from "next/server";
import { listMeetings } from "@/lib/store";
import { listStandaloneTasks, addStandaloneTask } from "@/lib/standaloneTasks";
import type { TrackerTask } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [meetings, standalone] = await Promise.all([
      listMeetings(),
      listStandaloneTasks(),
    ]);

    const meetingTasks: TrackerTask[] = meetings.flatMap((m) =>
      m.tasks.map((t) => ({
        ...t,
        meetingId: m.id,
        meetingTitle: m.title,
        meetingType: m.type,
      }))
    );

    const standaloneTasks: TrackerTask[] = standalone.map((t) => ({
      ...t,
      meetingId: null,
      meetingTitle: null,
    }));

    const all = [...meetingTasks, ...standaloneTasks].sort((a, b) => {
      // Not-done before done.
      if (a.done !== b.done) return a.done ? 1 : -1;
      // Tasks with a dueDate before those without, ascending.
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    return NextResponse.json(all);
  } catch (e) {
    console.error("[GET /api/tasks]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      text?: string;
      assignee?: string;
      priority?: "high" | "medium" | "low";
      dueDate?: string;
    };

    if (!body.text || !body.text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const created = await addStandaloneTask({
      text: body.text,
      assignee: body.assignee,
      priority: body.priority,
      dueDate: body.dueDate,
    });

    const result: TrackerTask = {
      ...created,
      meetingId: null,
      meetingTitle: null,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("[POST /api/tasks]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
