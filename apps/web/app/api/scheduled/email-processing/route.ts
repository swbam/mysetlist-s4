import { db } from "@repo/database"
import { emailLogs, emailQueue } from "@repo/database"
import { lte } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import {
  processQueuedEmails,
  sendDailyShowReminders,
  sendWeeklyDigests,
} from "~/actions/email-notifications"
import { processEmailAutomation } from "~/lib/email/automation-engine"

// Protect the cron endpoint
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env["CRON_SECRET"]

  if (!cronSecret) {
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

// Process queued emails every 5 minutes
export async function GET(request: NextRequest) {
  // Check authorization for cron jobs
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Process queued emails (legacy system)
    const queueResult = await processQueuedEmails()

    // Process intelligent email automation
    const automationResult = await processEmailAutomation()

    return NextResponse.json({
      success: true,
      legacy_queue: {
        processed: queueResult.processed,
        successful: queueResult.successful,
        failed: queueResult.failed,
      },
      automation_engine: {
        processed: automationResult.processed,
        sent: automationResult.sent,
        failed: automationResult.failed,
        errors: automationResult.errors,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Email processing failed", details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Alternative POST endpoint for manual triggering
export async function POST(request: NextRequest) {
  // Check authorization
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action } = await request.json()

  try {
    switch (action) {
      case "process_queue": {
        const queueResult = await processQueuedEmails()
        return NextResponse.json(queueResult)
      }

      case "process_automation": {
        const automationResult = await processEmailAutomation()
        return NextResponse.json(automationResult)
      }

      case "daily_reminders": {
        const reminderResult = await sendDailyShowReminders()
        return NextResponse.json(reminderResult)
      }

      case "weekly_digest": {
        const digestResult = await sendWeeklyDigests()
        return NextResponse.json(digestResult)
      }

      case "full_processing": {
        // Run both legacy and new automation systems
        const [queueResult, automationResult] = await Promise.all([
          processQueuedEmails(),
          processEmailAutomation(),
        ])

        return NextResponse.json({
          success: true,
          legacy_queue: queueResult,
          automation_engine: automationResult,
          timestamp: new Date().toISOString(),
        })
      }

      case "cleanup": {
        // Clean up old email logs (older than 90 days)
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        await db
          .delete(emailLogs)
          .where(lte(emailLogs.createdAt, ninetyDaysAgo))

        // Clean up old sent/failed queue items (older than 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        await db
          .delete(emailQueue)
          .where(lte(emailQueue.createdAt, sevenDaysAgo))

        return NextResponse.json({
          success: true,
          deletedLogs: 0, // Drizzle doesn't return rowCount
          deletedQueue: 0,
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Action '${action}' failed`, details: (error as Error).message },
      { status: 500 }
    )
  }
}
