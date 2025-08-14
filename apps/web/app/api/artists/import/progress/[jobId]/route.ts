import { type NextRequest, NextResponse } from "next/server";
import { getImportStatus } from "~/lib/import-status";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	const { jobId } = await params;

	if (!jobId) {
		return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
	}

	// Check for SSE support
	const acceptHeader = request.headers.get("accept");
	if (acceptHeader && acceptHeader.includes("text/event-stream")) {
		// Return Server-Sent Events stream
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start(controller) {
				const sendUpdate = async () => {
					try {
						const status = await getImportStatus(jobId);

						if (status) {
							const data = `data: ${JSON.stringify(status)}\n\n`;
							controller.enqueue(encoder.encode(data));

							// Close stream if completed or failed
							if (status.stage === "completed" || status.stage === "failed") {
								controller.close();
								return;
							}
						} else {
							// Send initial status if not found
							const initialData = `data: ${JSON.stringify({
								stage: "initializing",
								progress: 0,
								message: "Preparing import...",
							})}\n\n`;
							controller.enqueue(encoder.encode(initialData));
						}

						// Continue polling every 2 seconds
						setTimeout(sendUpdate, 2000);
					} catch (error) {
						console.error("Error in SSE stream:", error);
						const errorData = `data: ${JSON.stringify({
							stage: "failed",
							progress: 0,
							message: "Error checking import status",
							error: error instanceof Error ? error.message : "Unknown error",
						})}\n\n`;
						controller.enqueue(encoder.encode(errorData));
						controller.close();
					}
				};

				// Send initial update
				sendUpdate();
			},

			cancel() {
				// Cleanup when client disconnects
				console.log("SSE stream cancelled for job:", jobId);
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Cache-Control",
			},
		});
	}

	// Regular JSON response for polling
	try {
		const status = await getImportStatus(jobId);

		if (!status) {
			return NextResponse.json(
				{ error: "Import job not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(status);
	} catch (error) {
		console.error("Failed to get import status:", error);
		return NextResponse.json({ error: "Failed to get import status" }, { status: 500 });
	}
}
