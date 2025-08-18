import { NextResponse } from "next/server";
import {
  onProgress,
  offProgress,
  report,
  runFullImport,
} from "@repo/external-apis";

export async function GET(
  _: Request,
  { params }: { params: { id: string } },
) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const write = (o: any) =>
    writer.write(enc.encode(`data: ${JSON.stringify(o)}\n\n`));

  const listener = (p: any) => write(p);
  onProgress(params.id, listener);

  queueMicrotask(async () => {
    try {
      await runFullImport(params.id);
    } catch {}
  });

  await report(params.id, "initializing", 0, "Streaming progress…");

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
