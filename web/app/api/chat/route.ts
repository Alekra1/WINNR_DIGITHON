import { NextResponse } from "next/server";
import { recallStructured } from "@/lib/muninn";
import { chat, fitTranscript } from "@/lib/llm";
import { getMeeting } from "@/lib/store";
import type { Scope } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { question, scope, meetingId } = (await req.json()) as {
      question: string;
      scope: Scope;
      meetingId?: string;
    };
    if (!question?.trim()) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }

    // Meeting scope: load that meeting's transcript (budgeted) + a deep,
    // structure-following recall for cross-meeting context.
    if (scope === "meeting") {
      if (!meetingId) {
        return NextResponse.json({ error: "Select a meeting first" }, { status: 400 });
      }
      const meeting = await getMeeting(meetingId);
      if (!meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }

      const { text: transcript, truncated } = fitTranscript(
        meeting.transcriptText,
        meeting.summary,
      );
      const memories = await recallStructured([question, meeting.title], {
        mode: "deep",
        profile: "structural",
        limit: 8,
      });

      const answer = await chat(question, {
        memories,
        scope,
        transcript,
        transcriptTruncated: truncated,
      });
      return NextResponse.json({ answer });
    }

    // Company scope: broad recall across all meeting memories.
    const memories = await recallStructured([question], {
      mode: "balanced",
      limit: 12,
    });
    const answer = await chat(question, { memories, scope });
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
