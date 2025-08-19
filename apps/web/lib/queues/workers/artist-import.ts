import { Job } from "bullmq";
import { ingestShowsAndVenues } from "@repo/external-apis/src/services/ingest/TicketmasterIngest";
import { ingestStudioCatalog } from "@repo/external-apis/src/services/ingest/SpotifyCatalogIngest";
import { db } from "@repo/database";
import { artists } from "@repo/database";
import { eq } from "drizzle-orm";

interface ArtistImportJobData {
  artistId: string;
  tmAttractionId: string;
  spotifyArtistId: string;
  artistName: string;
}

export const artistImportWorker = async (job: Job<ArtistImportJobData>) => {
  const { artistId, tmAttractionId, spotifyArtistId, artistName } = job.data;

  try {
    await job.updateProgress(30);
    await job.log("Importing shows and venues...");
    await ingestShowsAndVenues(artistId, tmAttractionId);

    await job.updateProgress(70);
    await job.log("Importing studio catalog...");
    await ingestStudioCatalog(artistId, spotifyArtistId);

    await db
      .update(artists)
      .set({ importStatus: "completed" })
      .where(eq(artists.id, artistId));

    await job.updateProgress(100);
    await job.log("Artist import completed successfully.");
  } catch (error) {
    console.error(`Failed to import artist ${artistName}:`, error);
    await db
      .update(artists)
      .set({ importStatus: "failed" })
      .where(eq(artists.id, artistId));
    throw error;
  }
};
