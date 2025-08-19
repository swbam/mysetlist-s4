import { NextResponse } from "next/server";
import { db, shows, eq, asc } from "@repo/database";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const rows = await db.query.shows.findMany({
    where: eq(shows.headlinerArtistId, params.id),
    orderBy: asc(shows.date),
    with: { venue: true },
  });
  return NextResponse.json(rows);
}

