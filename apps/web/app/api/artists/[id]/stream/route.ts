import { NextResponse } from "next/server";
import { onProgress, offProgress, report } from "@repo/external-apis/src/services/progress/ProgressBus";
import { runFullImport } from "@repo/external-apis/src/services/orchestrators/ArtistImportOrchestrator";

export async function GET(_: Request, { params }: any) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  
  // Transform the payload to match ImportProgressData format
  const write = (payload: any) => {
    const transformedPayload = {
      stage: payload.stage,
      progress: payload.percentage || payload.progress || 0,
      message: payload.message,
      at: new Date().toISOString(),
      error: payload.error,
      metadata: payload.metadata,
    };
    writer.write(enc.encode(`data: ${JSON.stringify(transformedPayload)}\n\n`));
  };

  const listener = (p: any) => write(p);
  onProgress(params.id, listener);

  // Kick off work tied to this open stream
  queueMicrotask(async () => {
    try {
      await runFullImport(params.id);
    } catch (error) {
      // Report error through the progress bus
      await report(params.id, "failed", 0, `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up the listener when import is done
      offProgress(params.id, listener);
    }
  });

  // Send initial hello
  await report(params.id, "initializing", 0, "Streaming progress…");

  // Clean-up when client disconnects
  // (Router runtime will GC writer; optional: offProgress in a try/finally)
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
