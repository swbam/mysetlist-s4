import { type NextRequest, NextResponse } from "next/server";
import {
  getPersonalizedEmailData,
  processEmailAutomation,
  trackEmailEngagement,
} from "~/lib/email/automation-engine";
import { createServiceClient } from "~/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protect the automation endpoints
function isValidAutomationRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const automationSecret =
    process.env["EMAIL_AUTOMATION_SECRET"] || process.env["CRON_SECRET"];

  if (!automationSecret) {
    return false;
  }

  return authHeader === `Bearer ${automationSecret}`;
}

// POST: Trigger email automation processing
export async function POST(request: NextRequest) {
  try {
    // Check authorization for automated systems
    if (!isValidAutomationRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, metadata } = body;

    switch (action) {
      case "process_triggers": {
        const results = await processEmailAutomation();
        return NextResponse.json({
          success: true,
          message: "Email automation processing completed",
          results,
          timestamp: new Date().toISOString(),
        });
      }

      case "get_personalized_data": {
        if (!userId) {
          return NextResponse.json(
            { error: "userId is required for personalized data" },
            { status: 400 },
          );
        }

        const personalizedData = await getPersonalizedEmailData(userId);
        return NextResponse.json({
          success: true,
          data: personalizedData,
          timestamp: new Date().toISOString(),
        });
      }

      case "track_engagement":
        if (!userId || !metadata?.emailId || !metadata?.action) {
          return NextResponse.json(
            {
              error:
                "userId, emailId, and action are required for engagement tracking",
            },
            { status: 400 },
          );
        }

        await trackEmailEngagement(
          metadata.emailId,
          userId,
          metadata.action,
          metadata.metadata,
        );

        return NextResponse.json({
          success: true,
          message: "Email engagement tracked successfully",
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Email automation error:", error);
    return NextResponse.json(
      {
        error: "Email automation processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET: Get automation status and analytics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "status";
    const period = searchParams.get("period") || "week";

    switch (type) {
      case "status": {
        // Get automation status (simplified - no grouping for now)
        const { data: emailQueue } = await supabase
          .from("email_queue_enhanced")
          .select("status");

        const { data: recentEmails } = await supabase
          .from("email_queue_enhanced")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        return NextResponse.json({
          success: true,
          data: {
            queue_status: emailQueue || [],
            recent_emails: recentEmails || [],
            last_check: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "analytics": {
        // Get email analytics
        const endDate = new Date();
        const startDate = new Date();
        if (period === "week") {
          startDate.setDate(startDate.getDate() - 7);
        } else if (period === "month") {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === "year") {
          startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const { data: emailStats } = await supabase
          .from("email_queue_enhanced")
          .select(
            `
            status,
            template_id,
            sent_at,
            opened_at,
            clicked_at,
            bounced_at,
            complained_at
          `,
          )
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        const { data: engagementStats } = await supabase
          .from("email_engagement")
          .select("action")
          .gte("timestamp", startDate.toISOString())
          .lte("timestamp", endDate.toISOString());

        // Calculate key metrics
        const totalSent =
          emailStats?.filter((e) => e.status === "sent").length || 0;
        const totalOpened = emailStats?.filter((e) => e.opened_at).length || 0;
        const totalClicked =
          emailStats?.filter((e) => e.clicked_at).length || 0;
        const totalBounced =
          emailStats?.filter((e) => e.bounced_at).length || 0;
        const totalComplained =
          emailStats?.filter((e) => e.complained_at).length || 0;

        return NextResponse.json({
          success: true,
          data: {
            period,
            metrics: {
              total_sent: totalSent,
              total_opened: totalOpened,
              total_clicked: totalClicked,
              total_bounced: totalBounced,
              total_complained: totalComplained,
              open_rate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
              click_rate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
              bounce_rate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
              complaint_rate:
                totalSent > 0 ? (totalComplained / totalSent) * 100 : 0,
            },
            engagement_breakdown: engagementStats || [],
            email_stats: emailStats || [],
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "user_preferences": {
        // Get user's email preferences
        const { data: preferences } = await supabase
          .from("user_notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        const { data: emailHistory } = await supabase
          .from("email_queue_enhanced")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        return NextResponse.json({
          success: true,
          data: {
            preferences: preferences || {},
            recent_emails: emailHistory || [],
            user_id: user.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Email automation GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch automation data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PUT: Update user email preferences
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json(
        { error: "Preferences object is required" },
        { status: 400 },
      );
    }

    // Update user notification preferences
    const { data: updatedPreferences, error: updateError } = await supabase
      .from("user_notification_preferences")
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "Email preferences updated successfully",
      data: updatedPreferences,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email preferences update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update email preferences",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// DELETE: Unsubscribe user from all emails
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    let userId = user.id;

    // If token is provided, validate it for unsubscribe
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token, "base64url").toString());
        userId = payload.userId;

        // Check if token is not too old (30 days)
        if (Date.now() - payload.timestamp > 30 * 24 * 60 * 60 * 1000) {
          return NextResponse.json(
            { error: "Unsubscribe token expired" },
            { status: 400 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid unsubscribe token" },
          { status: 400 },
        );
      }
    }

    // Disable all email notifications for the user
    const { error: updateError } = await supabase
      .from("user_notification_preferences")
      .upsert({
        user_id: userId,
        global_email_enabled: false,
        preferences: {},
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      throw updateError;
    }

    // Log the unsubscribe action
    await supabase.from("email_engagement").insert({
      user_id: userId,
      action: "unsubscribe",
      timestamp: new Date().toISOString(),
      metadata: { method: token ? "token" : "authenticated" },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from all emails",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email unsubscribe error:", error);
    return NextResponse.json(
      {
        error: "Failed to unsubscribe from emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
