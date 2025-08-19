import { NextResponse } from "next/server";
import { db, syncProgress } from "@repo/database";
import { eq } from "drizzle-orm";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const status = await db.select().from(syncProgress).where(eq(syncProgress.jobId, id)).limit(1);
  const result = status[0];
  return NextResponse.json(
    result ?? { stage: "unknown", progress: 0, message: "No status" },
  );
}
