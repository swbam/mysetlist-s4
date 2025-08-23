// NextResponse removed - unused import
import { initiateImport } from "@repo/external-apis";

export async function POST(req: Request) {
  try {
    const { tmAttractionId } = await req.json();
    if (!tmAttractionId) {
      return NextResponse.json(
        { error: "tmAttractionId required" },
        { status: 400 },
      );
    }

    console.log(`🚀 Starting import for ${tmAttractionId}`);
    
    // Use the simple approach that was working
    const result = await initiateImport(tmAttractionId);
    
    console.log(`✅ Artist created: ${result.artistId} (${result.slug})`);
    
    return NextResponse.json({
      artistId: result.artistId,
      slug: result.slug,
      success: true,
      message: "Artist created - background import will start via SSE"
    });
    
  } catch (error) {
    console.error("Artist import failed:", error);
    return NextResponse.json(
      { 
        error: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
