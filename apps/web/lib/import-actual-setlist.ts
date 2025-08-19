import { db, shows, setlistSongs, songs, eq } from "@repo/database";
import slugify from "slugify";
import type { SetlistFM } from "@repo/external-apis/src/types/index";

export async function importActualSetlist(showId: string, sl: SetlistFM.Setlist) {
  await db.transaction(async (tx) => {
    const parts = sl.sets?.set ?? [];
    let position = 0;
    for (const part of parts) {
      const songsInPart = part.song ?? [];
      for (const s of songsInPart) {
        const [song] = await tx
          .insert(songs)
          .values({
            name: s.name,
            artist: sl.artist?.name ?? "",
            slug: slugify(s.name, { lower: true }),
          } as any)
          .onConflictDoUpdate({ target: songs.name, set: { name: s.name } })
          .returning();

        await tx
          .insert(setlistSongs)
          .values({
            setlistId: showId,
            songId: song.id,
            position: position++,
            notes: s.info,
            isPlayed: true,
          } as any)
          .onConflictDoNothing();
      }
    }
    await tx.update(shows).set({ status: "completed", setlistReady: true }).where(eq(shows.id, showId));
  });
}

