import { type NextRequest } from "next/server";
import { ArtistImportOrchestrator } from "~/lib/services/artist-import-orchestrator";
import { ProgressBus } from "~/lib/services/progress/ProgressBus";

/**
 * GET /api/artists/[id]/stream - SSE streaming endpoint for real-time import progress
 * Implements GROK.md SSE architecture where import work starts inside SSE route
 * to keep the function alive during the full import process
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: artistId } = await params;

  if (!artistId) {
    return new Response("Artist ID is required", { status: 400 });
  }

  // Create TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  
  // Track writer state to prevent writing to closed stream
  let isWriterClosed = false;
  let cleanupCompleted = false;

  // SSE response headers
  const responseInit: ResponseInit = {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  };

  // Helper function to safely write to stream
  const safeWrite = async (message: string): Promise<boolean> => {
    if (isWriterClosed || cleanupCompleted) {
      console.log(`[SSE] Skipping write to closed stream for artist ${artistId}`);
      return false;
    }
    
    try {
      await writer.write(encoder.encode(message));
      return true;
    } catch (error) {
      console.error(`[SSE] Failed to write to stream for artist ${artistId}:`, error);
      isWriterClosed = true;
      return false;
    }
  };

  // Helper function to safely close writer
  const safeClose = async (): Promise<void> => {
    if (isWriterClosed || cleanupCompleted) {
      return;
    }
    
    try {
      isWriterClosed = true;
      await writer.close();
    } catch (error) {
      console.error(`[SSE] Failed to close writer for artist ${artistId}:`, error);
    }
  };

  // Start the import work in queueMicrotask to keep function alive
  queueMicrotask(async () => {
    let progressListener: ((event: any) => void) | null = null;

    try {
      // Set up progress listener with safe writing
      progressListener = async (event: any) => {
        if (isWriterClosed || cleanupCompleted) {
          return;
        }
        
        try {
          const sseData = {
            stage: event.stage,
            progress: event.progress,
            message: event.message,
            at: event.at,
            error: event.error,
            phaseTimings: event.phaseTimings,
            metadata: event.metadata,
          };

          const message = `data: ${JSON.stringify(sseData)}\n\n`;
          const writeSuccess = await safeWrite(message);
          
          // Close stream when complete or failed, but only if write was successful
          if (writeSuccess && (event.stage === "completed" || event.stage === "failed")) {
            // Small delay to ensure final message is sent before closing
            setTimeout(() => {
              safeClose();
            }, 100);
          }
        } catch (error) {
          console.error(`[SSE] Error in progress listener for artist ${artistId}:`, error);
        }
      };

      // Subscribe to progress events
      ProgressBus.onProgress(artistId, progressListener);

      // Send initial status
      const initialStatus = await ProgressBus.getStatus(artistId);
      if (initialStatus) {
        await progressListener(initialStatus);
      } else {
        // Send starting message
        const startMessage = `data: ${JSON.stringify({
          stage: "initializing",
          progress: 10,
          message: "Starting full import...",
          at: new Date().toISOString(),
        })}\n\n`;
        await safeWrite(startMessage);
      }

      // Start the full import process with error handling
      let result: any;
      try {
        const orchestrator = new ArtistImportOrchestrator();
        // Assuming artistId is the tmAttractionId for this route
        result = await orchestrator.importArtist(artistId, false);
      } catch (importError) {
        console.error(`[SSE] Import error for artist ${artistId}:`, importError);
        result = {
          success: false,
          error: importError instanceof Error ? importError.message : "Unknown import error"
        };
      }

      // If import completed without progress events, send final status
      if (result?.success) {
        const finalMessage = `data: ${JSON.stringify({
          stage: "completed",
          progress: 100,
          message: `Import completed: ${result.stats?.songsImported || 0} songs, ${result.stats?.showsImported || 0} shows`,
          at: new Date().toISOString(),
          metadata: { stats: result.stats },
        })}\n\n`;
        const writeSuccess = await safeWrite(finalMessage);
        if (writeSuccess) {
          setTimeout(() => safeClose(), 100);
        }
      } else {
        const errorMessage = `data: ${JSON.stringify({
          stage: "failed",
          progress: 0,
          message: result?.error || "Import failed",
          at: new Date().toISOString(),
          error: result?.error,
        })}\n\n`;
        const writeSuccess = await safeWrite(errorMessage);
        if (writeSuccess) {
          setTimeout(() => safeClose(), 100);
        }
      }

    } catch (error) {
      console.error(`[SSE] Import stream error for artist ${artistId}:`, error);
      
      const errorMessage = `data: ${JSON.stringify({
        stage: "failed",
        progress: 0,
        message: "Internal server error during import",
        at: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      })}\n\n`;
      
      await safeWrite(errorMessage);
      setTimeout(() => safeClose(), 100);
    } finally {
      // Clean up progress listener and ensure proper cleanup
      cleanupCompleted = true;
      
      try {
        if (progressListener) {
          ProgressBus.offProgress(artistId, progressListener);
        }
      } catch (cleanupError) {
        console.error(`[SSE] Error during progress listener cleanup for artist ${artistId}:`, cleanupError);
      }
      
      // Final attempt to close if not already closed
      if (!isWriterClosed) {
        await safeClose();
      }
    }
  });

  return new Response(stream.readable, responseInit);
}