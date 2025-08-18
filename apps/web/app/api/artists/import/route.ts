import { NextResponse } from "next/server";
import { initiateImport } from "@repo/external-apis";

export async function POST(req: Request) {
  const { tmAttractionId } = await req.json();
  if (!tmAttractionId) {
    return NextResponse.json(
      { error: "tmAttractionId required" },
      { status: 400 },
    );
  }
  const result = await initiateImport(tmAttractionId);
  return NextResponse.json(result);
}
