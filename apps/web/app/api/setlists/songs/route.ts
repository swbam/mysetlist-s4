import { db, setlistSongs, setlists } from "@repo/database";
import { eq, desc, and } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@repo/auth/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

const addSongSchema = z.object({
  setlistId: z.string().uuid("Invalid setlist ID"),
  songId: z.string().uuid("Invalid song ID"),
  position: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = addSongSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: parsed.error.errors 
        },
        { status: 400 }
      );
    }

    const { setlistId, songId, notes } = parsed.data;

    // Verify setlist exists and user has permission
    const existingSetlist = await db
      .select({ id: setlists.id, createdBy: setlists.createdBy })
      .from(setlists)
      .where(eq(setlists.id, setlistId))
      .limit(1);

    if (!existingSetlist.length) {
      return NextResponse.json(
        { error: "Setlist not found" },
        { status: 404 }
      );
    }

    // For now, allow any authenticated user to add songs to setlists
    // TODO: Add proper permission checking based on setlist type/ownership
    
    // Check if this specific song is already in the setlist
    const existingSong = await db
      .select({ id: setlistSongs.id })
      .from(setlistSongs)
      .where(and(eq(setlistSongs.setlistId, setlistId), eq(setlistSongs.songId, songId)))
      .limit(1);

    if (existingSong.length) {
      return NextResponse.json(
        { error: "Song already exists in this setlist" },
        { status: 409 }
      );
    }

    // Get the next position if not provided
    let position = parsed.data.position;
    if (!position) {
      const lastPosition = await db
        .select({ position: setlistSongs.position })
        .from(setlistSongs)
        .where(eq(setlistSongs.setlistId, setlistId))
        .orderBy(desc(setlistSongs.position))
        .limit(1);
      
      position = (lastPosition[0]?.position || 0) + 1;
    }

    // Add song to setlist
    const newSetlistSong = await db
      .insert(setlistSongs)
      .values({
        setlistId,
        songId,
        position,
        notes,
      })
      .returning();

    const setlistSong = newSetlistSong[0];

    return NextResponse.json({
      setlistSong: {
        id: setlistSong.id,
        setlist_id: setlistSong.setlistId,
        song_id: setlistSong.songId,
        position: setlistSong.position,
        notes: setlistSong.notes,
        created_at: setlistSong.createdAt,
      },
      message: "Song added to setlist successfully"
    });

  } catch (error) {
    console.error("Error adding song to setlist:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// GET method to retrieve setlist songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setlistId = searchParams.get("setlistId");

    if (!setlistId) {
      return NextResponse.json(
        { error: "setlistId parameter is required" },
        { status: 400 }
      );
    }

    // Get setlist songs with song details
    const setlistSongsData = await db
      .select({
        id: setlistSongs.id,
        position: setlistSongs.position,
        notes: setlistSongs.notes,
        createdAt: setlistSongs.createdAt,
        updatedAt: setlistSongs.updatedAt,
      })
      .from(setlistSongs)
      .where(eq(setlistSongs.setlistId, setlistId))
      .orderBy(setlistSongs.position);

    return NextResponse.json({
      setlistSongs: setlistSongsData,
      total: setlistSongsData.length,
    });

  } catch (error) {
    console.error("Error fetching setlist songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch setlist songs" },
      { status: 500 }
    );
  }
}

// DELETE method to remove song from setlist
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const setlistSongId = searchParams.get("id");

    if (!setlistSongId) {
      return NextResponse.json(
        { error: "Setlist song ID is required" },
        { status: 400 }
      );
    }

    // Verify the setlist song exists
    const existing = await db
      .select({ id: setlistSongs.id })
      .from(setlistSongs)
      .where(eq(setlistSongs.id, setlistSongId))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json(
        { error: "Setlist song not found" },
        { status: 404 }
      );
    }

    // Remove the song from setlist
    await db.delete(setlistSongs).where(eq(setlistSongs.id, setlistSongId));

    return NextResponse.json({
      message: "Song removed from setlist successfully"
    });

  } catch (error) {
    console.error("Error removing song from setlist:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}