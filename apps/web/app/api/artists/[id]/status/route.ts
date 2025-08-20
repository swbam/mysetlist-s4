import { NextResponse } from "next/server";
import { db, syncProgress } from "@repo/database";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: any,
) {
  const status = await db.query.syncProgress.findFirst({
    where: eq(syncProgress.jobId, params.id),
  });
  return NextResponse.json(
    status ?? { stage: "unknown", progress: 0, message: "No status" },
  );
}
