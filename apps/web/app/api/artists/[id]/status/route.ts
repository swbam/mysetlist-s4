import { NextResponse } from "next/server";
import { db, syncProgress, eq } from "@repo/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [status] = await db
    .select()
    .from(syncProgress)
    .where(eq(syncProgress.jobId, id))
    .limit(1);
    
  return NextResponse.json(
    status ?? { stage: "unknown", progress: 0, message: "No status" },
  );
}
