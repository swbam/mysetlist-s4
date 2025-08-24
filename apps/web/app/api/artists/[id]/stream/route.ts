import { onProgress, report, runFullImport } from "@repo/external-apis";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const write = (o: any) => writer.write(enc.encode(`data: ${JSON.stringify(o)}\n\n`));

  const listener = (p: any) => write(p);
  onProgress(id, listener);

  // Kick off work tied to this open stream (GROK.md approach)
  queueMicrotask(async () => {
    try {
      await runFullImport(id);
    } catch (error) {
      console.error("Import failed in SSE route:", error);
    }
  });

  // Send initial hello
  await report(id, "initializing", 0, "Streaming progress…");

  // Clean-up when client disconnects
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
