import { NextResponse } from "next/server";
import { listMeetings } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const meetings = await listMeetings();
  return NextResponse.json(meetings);
}
