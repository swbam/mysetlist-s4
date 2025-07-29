import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  apiRateLimitMiddleware,
  ingestRateLimiter,
} from "~/lib/api-rate-limit";
import { ingestArtistPipeline } from "~/lib/ingest/artistPipeline";

const ParamsSchema = z.object({
  tmId: z.string().min(1),
});

type RouteParams = {
  params: Promise<{ tmId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  // Apply rate limiting
  const rateLimitResponse = await apiRateLimitMiddleware(
    req,
    ingestRateLimiter,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Await params since it's a Promise in Next.js 15
    const resolvedParams = await params;

    // Validate params
    const result = ParamsSchema.safeParse(resolvedParams);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid Ticketmaster ID" },
        { status: 400 },
      );
    }

    const { tmId } = result.data;

    // Queue the ingestion job asynchronously
    // This returns immediately while the job runs in the background
    ingestArtistPipeline(tmId).catch((error) => {
      console.error(`Failed to ingest artist ${tmId}:`, error);
      // Log to monitoring service if available
    });

    return NextResponse.json({
      queued: true,
      tmId,
      message: "Artist ingestion has been queued",
    });
  } catch (error) {
    console.error("Artist ingestion trigger error:", error);

    return NextResponse.json(
      { error: "Failed to queue artist ingestion" },
      { status: 500 },
    );
  }
}
