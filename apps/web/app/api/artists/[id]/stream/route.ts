import { NextResponse } from "next/server";
import {
  onProgress,
  offProgress,
  report,
  runFullImport,
} from "@repo/external-apis";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const write = (o: any) =>
    writer.write(enc.encode(`data: ${JSON.stringify(o)}\n\n`));

  const listener = (p: any) => write(p);
  onProgress(id, listener);

  queueMicrotask(async () => {
    try {
      await runFullImport(id);
    } catch {}
  });

  await report(id, "initializing", 0, "Streaming progress…");

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
