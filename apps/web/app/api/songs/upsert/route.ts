import { type NextRequest, NextResponse } from "next/server";
import { db, songs } from "@repo/database";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      spotifyId,
      title,
      artist,
      album,
      albumArtUrl,
      duration,
      durationMs,
      popularity,
      previewUrl,
      isExplicit,
      releaseDate,
      albumType,
      externalUrls,
      spotifyUri,
    } = body || {};

    if (!spotifyId && !(title && artist)) {
      return NextResponse.json(
        { error: "spotifyId or (title and artist) required" },
        { status: 400 },
      );
    }

    const name = title;
    const durMs = typeof durationMs === "number" ? durationMs : typeof duration === "number" ? duration : null;

    let upserted;

    if (spotifyId) {
      const [row] = await db
        .insert(songs)
        .values({
          spotifyId,
          name: name ?? undefined,
          artist: artist ?? undefined,
          albumName: album ?? undefined,
          albumArtUrl: albumArtUrl ?? undefined,
          durationMs: durMs ?? undefined,
          popularity: typeof popularity === "number" ? popularity : undefined,
          previewUrl: previewUrl ?? undefined,
          isExplicit: typeof isExplicit === "boolean" ? isExplicit : undefined,
          releaseDate: releaseDate ?? undefined,
          albumType: albumType ?? undefined,
          externalUrls: externalUrls ?? undefined,
          spotifyUri: spotifyUri ?? undefined,
        })
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            name: name ?? sql`COALESCE(${songs.name}, ${name})`,
            artist: artist ?? sql`COALESCE(${songs.artist}, ${artist})`,
            albumName: album ?? sql`COALESCE(${songs.albumName}, ${album})`,
            albumArtUrl: albumArtUrl ?? sql`COALESCE(${songs.albumArtUrl}, ${albumArtUrl})`,
            durationMs: durMs ?? sql`COALESCE(${songs.durationMs}, ${durMs})`,
            popularity: typeof popularity === "number" ? popularity : sql`${songs.popularity}`,
            previewUrl: previewUrl ?? sql`COALESCE(${songs.previewUrl}, ${previewUrl})`,
            isExplicit: typeof isExplicit === "boolean" ? isExplicit : sql`${songs.isExplicit}`,
            releaseDate: releaseDate ?? sql`COALESCE(${songs.releaseDate}, ${releaseDate})`,
            albumType: albumType ?? sql`COALESCE(${songs.albumType}, ${albumType})`,
            externalUrls: externalUrls ?? sql`COALESCE(${songs.externalUrls}, ${externalUrls})`,
            spotifyUri: spotifyUri ?? sql`COALESCE(${songs.spotifyUri}, ${spotifyUri})`,
            updatedAt: new Date(),
          },
        })
        .returning();
      upserted = row;
    } else {
      // Fallback upsert by name + artist + duration if no spotifyId
      // Try to find an existing song first
      const existing = await db
        .select({ id: songs.id })
        .from(songs)
        .where(
          and(
            eq(songs.name, name!),
            eq(songs.artist, artist!),
          ),
        )
        .limit(1);

      if (existing.length) {
        const [row] = await db
          .update(songs)
          .set({
            albumName: album ?? undefined,
            albumArtUrl: albumArtUrl ?? undefined,
            durationMs: durMs ?? undefined,
            popularity: typeof popularity === "number" ? popularity : undefined,
            previewUrl: previewUrl ?? undefined,
            isExplicit: typeof isExplicit === "boolean" ? isExplicit : undefined,
            releaseDate: releaseDate ?? undefined,
            albumType: albumType ?? undefined,
            externalUrls: externalUrls ?? undefined,
            spotifyUri: spotifyUri ?? undefined,
            updatedAt: new Date(),
          })
          .where(eq(songs.id, existing[0]!.id))
          .returning();
        upserted = row;
      } else {
        const [row] = await db
          .insert(songs)
          .values({
            name,
            artist,
            albumName: album ?? undefined,
            albumArtUrl: albumArtUrl ?? undefined,
            durationMs: durMs ?? undefined,
            popularity: typeof popularity === "number" ? popularity : undefined,
            previewUrl: previewUrl ?? undefined,
            isExplicit: typeof isExplicit === "boolean" ? isExplicit : undefined,
            releaseDate: releaseDate ?? undefined,
            albumType: albumType ?? undefined,
            externalUrls: externalUrls ?? undefined,
            spotifyUri: spotifyUri ?? undefined,
          })
          .returning();
        upserted = row;
      }
    }

    if (!upserted) {
      return NextResponse.json({ error: "Failed to upsert song" }, { status: 500 });
    }

    return NextResponse.json({ song: upserted });
  } catch (error) {
    console.error("Song upsert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
