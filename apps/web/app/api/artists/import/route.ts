import { NextResponse } from "next/server";
import { initiateImport } from "@repo/external-apis";
import { queueManager, QueueName, Priority } from "~/lib/queues/queue-manager";

export async function POST(req: Request) {
  const { tmAttractionId } = await req.json();
  if (!tmAttractionId) {
    return NextResponse.json(
      { error: "tmAttractionId required" },
      { status: 400 },
    );
  }

  try {
    // Create artist record and get info
    const artistInfo = await initiateImport(tmAttractionId);
    
    // Queue the import job
    const job = await queueManager.addJob(
      QueueName.ARTIST_IMPORT,
      "import-artist",
      {
        artistId: artistInfo.artistId,
        tmAttractionId: artistInfo.tmAttractionId,
        spotifyArtistId: artistInfo.spotifyArtistId,
        artistName: artistInfo.artistName,
      },
      {
        priority: Priority.CRITICAL,
        jobId: `import-${artistInfo.artistId}`,
      }
    );

    return NextResponse.json({
      ...artistInfo,
      jobId: job.id,
    });
  } catch (error) {
    console.error("Import initiation failed:", error);
    return NextResponse.json(
      { error: "Failed to initiate import" },
      { status: 500 }
    );
  }
}
