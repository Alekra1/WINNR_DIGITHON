import { NextResponse } from "next/server";
import { recallMemories } from "@/lib/muninn";
import { chat } from "@/lib/llm";
import type { Scope } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { question, scope } = (await req.json()) as {
      question: string;
      scope: Scope;
    };
    if (!question?.trim()) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }

    // company = broad recall; project = deeper graph search for cross-meeting context.
    const memories = await recallMemories([question], {
      limit: scope === "company" ? 10 : 8,
      mode: scope === "company" ? "recent" : "deep",
    });

    const answer = await chat(question, memories, scope);
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
