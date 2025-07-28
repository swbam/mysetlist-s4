import { type NextRequest, NextResponse } from "next/server"
import { sendWeeklyDigests } from "~/actions/email-notifications"

// Protect the cron endpoint
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env["CRON_SECRET"]

  if (!cronSecret) {
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

// Send weekly digests every Monday at 8 AM
export async function GET(request: NextRequest) {
  // Check authorization for cron jobs
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendWeeklyDigests()

    return NextResponse.json({
      success: true,
      usersNotified: result.usersNotified,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Weekly digest failed", details: (error as Error).message },
      { status: 500 }
    )
  }
}
