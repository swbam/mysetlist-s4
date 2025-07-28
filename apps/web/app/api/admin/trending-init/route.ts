import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get("authorization")
    const adminToken = process.env["ADMIN_API_KEY"]

    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const baseUrl = process.env["NEXT_PUBLIC_URL"] || "http://localhost:3001"
    const seedResponse = await fetch(
      `${baseUrl}/api/admin/seed-trending?type=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    )

    if (!seedResponse.ok) {
      throw new Error("Failed to seed trending data")
    }

    const seedResult = await seedResponse.json()
    const calculateResponse = await fetch(
      `${baseUrl}/api/admin/calculate-trending?type=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    )

    if (!calculateResponse.ok) {
      throw new Error("Failed to calculate trending scores")
    }

    const calculateResult = await calculateResponse.json()

    return NextResponse.json({
      success: true,
      message: "Trending system initialized successfully",
      results: {
        seeding: seedResult.results,
        calculation: calculateResult.results,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to initialize trending system",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  // Provide instructions for using this endpoint
  return NextResponse.json({
    message: "Trending System Initialization Endpoint",
    usage: {
      method: "POST",
      headers: {
        Authorization: "Bearer <ADMIN_API_KEY>",
      },
      description:
        "Initializes the trending system by seeding data and calculating scores",
    },
    steps: [
      "1. Seeds realistic metrics (views, votes, followers) to existing data",
      "2. Calculates trending scores based on these metrics",
      "3. Updates database with calculated scores",
      "4. Makes trending page show real data",
    ],
  })
}
