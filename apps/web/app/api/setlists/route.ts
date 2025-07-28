import { getUser } from "@repo/auth/server";
import { db } from "@repo/database";
import { setlists } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { showId, artistId, type, name } = await request.json();

    if (!showId || !artistId || !type || !name) {
      return NextResponse.json(
        { error: "Missing required fields: showId, artistId, type, name" },
        { status: 400 },
      );
    }

    if (!["predicted", "actual"].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "predicted" or "actual"' },
        { status: 400 },
      );
    }

    // Create the setlist
    const newSetlist = await db
      .insert(setlists)
      .values({
        showId,
        artistId,
        type,
        name,
        orderIndex: 0,
        isLocked: false,
        totalVotes: 0,
        accuracyScore: 0,
        createdBy: user.id,
      })
      .returning();

    return NextResponse.json(newSetlist[0]);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to create setlist" },
      { status: 500 },
    );
  }
}
