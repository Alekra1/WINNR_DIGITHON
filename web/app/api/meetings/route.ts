import { NextResponse } from "next/server";
import { listMeetings } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const meetings = await listMeetings();
    return NextResponse.json(meetings);
  } catch (e) {
    console.error("[GET /api/meetings]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
