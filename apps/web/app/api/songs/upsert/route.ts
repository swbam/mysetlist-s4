import { type NextRequest, NextResponse } from "next/server";
import { db, songs } from "@repo/database";
import { eq, and } from "drizzle-orm";

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
      // Build update set only with provided fields
      const updateSet: Record<string, any> = { updatedAt: new Date() };
      if (name != null) updateSet['name'] = name;
      if (artist != null) updateSet['artist'] = artist;
      if (album != null) updateSet['albumName'] = album;
      if (albumArtUrl != null) updateSet['albumArtUrl'] = albumArtUrl;
      if (durMs != null) updateSet['durationMs'] = durMs;
      if (typeof popularity === "number") updateSet['popularity'] = popularity;
      if (previewUrl != null) updateSet['previewUrl'] = previewUrl;
      if (typeof isExplicit === "boolean") updateSet['isExplicit'] = isExplicit;
      if (releaseDate != null) updateSet['releaseDate'] = releaseDate;
      if (albumType != null) updateSet['albumType'] = albumType;
      if (externalUrls != null) updateSet['externalUrls'] = externalUrls;
      if (spotifyUri != null) updateSet['spotifyUri'] = spotifyUri;

      const [row] = await db
        .insert(songs)
        .values({
          spotifyId,
          name: name ?? null,
          artist: artist ?? null,
          albumName: album ?? null,
          albumArtUrl: albumArtUrl ?? null,
          durationMs: durMs ?? null,
          popularity: typeof popularity === "number" ? popularity : null,
          previewUrl: previewUrl ?? null,
          isExplicit: typeof isExplicit === "boolean" ? isExplicit : null,
          releaseDate: releaseDate ?? null,
          albumType: albumType ?? null,
          externalUrls: externalUrls ?? null,
          spotifyUri: spotifyUri ?? null,
        })
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: updateSet,
        })
        .returning();
      upserted = row;
    } else {
      // Fallback upsert by name + artist if no spotifyId
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
        const updateSet: Record<string, any> = { updatedAt: new Date() };
        if (album != null) updateSet['albumName'] = album;
        if (albumArtUrl != null) updateSet['albumArtUrl'] = albumArtUrl;
        if (durMs != null) updateSet['durationMs'] = durMs;
        if (typeof popularity === "number") updateSet['popularity'] = popularity;
        if (previewUrl != null) updateSet['previewUrl'] = previewUrl;
        if (typeof isExplicit === "boolean") updateSet['isExplicit'] = isExplicit;
        if (releaseDate != null) updateSet['releaseDate'] = releaseDate;
        if (albumType != null) updateSet['albumType'] = albumType;
        if (externalUrls != null) updateSet['externalUrls'] = externalUrls;
        if (spotifyUri != null) updateSet['spotifyUri'] = spotifyUri;

        const [row] = await db
          .update(songs)
          .set(updateSet)
          .where(eq(songs.id, existing[0]!.id))
          .returning();
        upserted = row;
      } else {
        const [row] = await db
          .insert(songs)
          .values({
            name,
            artist,
            albumName: album ?? null,
            albumArtUrl: albumArtUrl ?? null,
            durationMs: durMs ?? null,
            popularity: typeof popularity === "number" ? popularity : null,
            previewUrl: previewUrl ?? null,
            isExplicit: typeof isExplicit === "boolean" ? isExplicit : null,
            releaseDate: releaseDate ?? null,
            albumType: albumType ?? null,
            externalUrls: externalUrls ?? null,
            spotifyUri: spotifyUri ?? null,
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
