import { NextResponse } from "next/server";
import { onProgress, offProgress, report } from "@repo/external-apis/src/services/progress/ProgressBus";
import { runFullImport } from "@repo/external-apis/src/services/orchestrators/ArtistImportOrchestrator";

export async function GET(_: Request, { params }: any) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const write = (o: any) => writer.write(enc.encode(`data: ${JSON.stringify(o)}\n\n`));

  const listener = (p: any) => write(p);
  onProgress(params.id, listener);

  // Kick off work tied to this open stream
  queueMicrotask(async () => {
    try {
      await runFullImport(params.id);
    } catch {}
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
