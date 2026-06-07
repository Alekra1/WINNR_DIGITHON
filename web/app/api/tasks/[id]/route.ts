import { NextResponse } from "next/server";
import { getMeeting, updateMeeting } from "@/lib/store";
import { updateStandaloneTask, deleteStandaloneTask } from "@/lib/standaloneTasks";
import { buildSnapshots } from "@/lib/pipeline";
import type { Task, TrackerTask } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = (await req.json()) as {
      meetingId: string | null;
      done?: boolean;
      text?: string;
      assignee?: string;
      priority?: "high" | "medium" | "low";
      dueDate?: string;
    };

    // Build patch from only present keys. For priority/dueDate, an empty or
    // invalid value clears the field (so edits can remove a priority/due date).
    const patch: Partial<Task> = {};
    if (typeof body.done === "boolean") patch.done = body.done;
    if (typeof body.text === "string") patch.text = body.text.trim();
    if (typeof body.assignee === "string") patch.assignee = body.assignee.trim() || "Unassigned";
    if (body.priority !== undefined) {
      patch.priority =
        body.priority === "high" || body.priority === "medium" || body.priority === "low"
          ? body.priority
          : undefined;
    }
    if (body.dueDate !== undefined) patch.dueDate = body.dueDate ? body.dueDate : undefined;

    if (body.meetingId) {
      const meeting = await getMeeting(body.meetingId);
      if (!meeting) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const taskExists = meeting.tasks.some((t) => t.id === id);
      if (!taskExists) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const newTasks = meeting.tasks.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      );

      await updateMeeting(body.meetingId, {
        tasks: newTasks,
        snapshots: buildSnapshots(meeting.participation, newTasks),
      });

      const updatedTask = newTasks.find((t) => t.id === id)!;
      const result: TrackerTask = {
        ...updatedTask,
        meetingId: body.meetingId,
        meetingTitle: meeting.title,
        meetingType: meeting.type,
      };
      return NextResponse.json(result);
    } else {
      const updated = await updateStandaloneTask(id, patch);
      if (!updated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const result: TrackerTask = {
        ...updated,
        meetingId: null,
        meetingTitle: null,
      };
      return NextResponse.json(result);
    }
  } catch (e) {
    console.error("[PATCH /api/tasks/[id]]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meetingId = new URL(req.url).searchParams.get("meetingId");

    if (meetingId) {
      const meeting = await getMeeting(meetingId);
      if (!meeting) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const newTasks = meeting.tasks.filter((t) => t.id !== id);
      if (newTasks.length === meeting.tasks.length) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await updateMeeting(meetingId, {
        tasks: newTasks,
        snapshots: buildSnapshots(meeting.participation, newTasks),
      });

      return NextResponse.json({ ok: true });
    } else {
      const removed = await deleteStandaloneTask(id);
      if (!removed) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("[DELETE /api/tasks/[id]]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
