import { NextResponse } from "next/server";
import { db, artists } from "@repo/database";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, params.id),
    });

    if (!artist) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(artist);
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}