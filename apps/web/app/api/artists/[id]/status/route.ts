import { NextResponse } from "next/server";
import { db, syncProgress } from "@repo/database";
import { eq } from "drizzle-orm";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const status = await db.query.syncProgress.findFirst({
    where: eq(syncProgress.jobId, id),
  });
  return NextResponse.json(
    status ?? { stage: "unknown", progress: 0, message: "No status" },
  );
}
