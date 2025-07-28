import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/api/supabase/server";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Type definitions
interface BulkActionRequest {
  action:
    | "approve_content"
    | "reject_content"
    | "ban_users"
    | "verify_venues"
    | "update_show_status"
    | "delete_content";
  items: BulkActionItem[];
  options?: BulkActionOptions;
}

interface BulkActionItem {
  id: string;
  type: ContentType;
  user_id?: string;
}

interface BulkActionOptions {
  reason?: string;
  duration_days?: number;
  status?: "upcoming" | "cancelled" | "completed" | "in_progress";
  hard_delete?: boolean;
}

type ContentType =
  | "setlist"
  | "review"
  | "photo"
  | "tip"
  | "user"
  | "venue"
  | "show"
  | "artist";

interface BulkActionResult {
  id: string;
  status: string;
  error?: string;
}

interface BulkActionResponse {
  success: boolean;
  results: BulkActionResult[];
  message: string;
}

interface ModerationAction {
  moderator_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
}

interface UserData {
  role: "admin" | "moderator" | "user";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or moderator
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single<UserData>();

    if (
      userError ||
      !userData ||
      (userData.role !== "admin" && userData.role !== "moderator")
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const requestData = (await request.json()) as BulkActionRequest;
    const { action, items, options } = requestData;

    switch (action) {
      case "approve_content":
        return await approveContent(supabase, items, user.id);

      case "reject_content": {
        if (!options?.reason) {
          return NextResponse.json(
            { error: "Reason is required for rejection" },
            { status: 400 },
          );
        }
        return await rejectContent(supabase, items, options, user.id);
      }

      case "ban_users":
        return await banUsers(supabase, items, options || {}, user.id);

      case "verify_venues":
        return await verifyVenues(supabase, items, user.id);

      case "update_show_status": {
        if (!options?.status) {
          return NextResponse.json(
            { error: "Status is required for update" },
            { status: 400 },
          );
        }
        return await updateShowStatus(supabase, items, options, user.id);
      }

      case "delete_content":
        return await deleteContent(supabase, items, options || {}, user.id);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Operation failed", details: (error as Error).message },
      { status: 500 },
    );
  }
}

async function approveContent(
  supabase: SupabaseClient,
  items: BulkActionItem[],
  userId: string,
): Promise<NextResponse<BulkActionResponse>> {
  const results: BulkActionResult[] = [];

  for (const item of items) {
    try {
      // Update moderation status based on content type
      const tableName = getTableName(item.type);
      const { error } = await supabase
        .from(tableName)
        .update({
          moderation_status: "approved",
          moderated_at: new Date().toISOString(),
          moderated_by: userId,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: "approved",
        target_type: item.type,
        target_id: item.id,
        reason: "Bulk approval",
      });

      results.push({ id: item.id, status: "approved" });
    } catch (error) {
      results.push({
        id: item.id,
        status: "error",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter((r) => r.status === "approved").length} items approved`,
  });
}

async function rejectContent(
  supabase: SupabaseClient,
  items: BulkActionItem[],
  options: BulkActionOptions,
  userId: string,
): Promise<NextResponse<BulkActionResponse>> {
  const { reason = "No reason provided" } = options;
  const results: BulkActionResult[] = [];

  for (const item of items) {
    try {
      const tableName = getTableName(item.type);
      const { error } = await supabase
        .from(tableName)
        .update({
          moderation_status: "rejected",
          moderated_at: new Date().toISOString(),
          moderated_by: userId,
          rejection_reason: reason,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: "rejected",
        target_type: item.type,
        target_id: item.id,
        reason: reason || "Bulk rejection",
      });

      results.push({ id: item.id, status: "rejected" });
    } catch (error) {
      results.push({
        id: item.id,
        status: "error",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter((r) => r.status === "rejected").length} items rejected`,
  });
}

async function banUsers(
  supabase: SupabaseClient,
  items: BulkActionItem[],
  options: BulkActionOptions,
  userId: string,
): Promise<NextResponse<BulkActionResponse>> {
  const { reason, duration_days } = options;
  const results: BulkActionResult[] = [];

  for (const item of items) {
    try {
      if (!item.user_id) {
        throw new Error("User ID is required for ban action");
      }

      // Create user ban record
      const banExpiry = duration_days
        ? new Date(
            Date.now() + duration_days * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;

      const { error: banError } = await supabase.from("user_bans").insert({
        user_id: item.user_id,
        banned_by: userId,
        reason: reason || "Bulk ban action",
        expires_at: banExpiry,
      });

      if (banError) {
        throw banError;
      }

      // Update user warning count
      const { error: rpcError } = await supabase.rpc(
        "increment_user_warnings",
        {
          target_user_id: item.user_id,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: "banned_user",
        target_type: "user",
        target_id: item.user_id,
        reason: reason || "Bulk ban action",
      });

      results.push({ id: item.user_id, status: "banned" });
    } catch (error) {
      results.push({
        id: item.user_id || item.id,
        status: "error",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter((r) => r.status === "banned").length} users banned`,
  });
}

async function verifyVenues(
  supabase: SupabaseClient,
  items: BulkActionItem[],
  userId: string,
): Promise<NextResponse<BulkActionResponse>> {
  const results: BulkActionResult[] = [];

  for (const item of items) {
    try {
      const { error } = await supabase
        .from("venues")
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
          verified_by: userId,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: "verified_venue",
        target_type: "venue",
        target_id: item.id,
        reason: "Bulk venue verification",
      });

      results.push({ id: item.id, status: "verified" });
    } catch (error) {
      results.push({
        id: item.id,
        status: "error",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter((r) => r.status === "verified").length} venues verified`,
  });
}

async function updateShowStatus(
  supabase: SupabaseClient,
  items: BulkActionItem[],
  options: BulkActionOptions,
  userId: string,
): Promise<NextResponse<BulkActionResponse>> {
  const { status } = options;
  if (!status) {
    throw new Error("Status is required");
  }

  const results: BulkActionResult[] = [];

  for (const item of items) {
    try {
      const { error } = await supabase
        .from("shows")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: "updated_show_status",
        target_type: "show",
        target_id: item.id,
        reason: `Updated status to ${status}`,
      });

      results.push({ id: item.id, status: "updated" });
    } catch (error) {
      results.push({
        id: item.id,
        status: "error",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter((r) => r.status === "updated").length} shows updated`,
  });
}

async function deleteContent(
  supabase: SupabaseClient,
  items: BulkActionItem[],
  options: BulkActionOptions,
  userId: string,
): Promise<NextResponse<BulkActionResponse>> {
  const { hard_delete = false } = options;
  const results: BulkActionResult[] = [];

  for (const item of items) {
    try {
      const tableName = getTableName(item.type);

      if (hard_delete) {
        // Permanently delete the record
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq("id", item.id);
        if (error) {
          throw error;
        }
      } else {
        // Soft delete by updating deleted_at timestamp
        const { error } = await supabase
          .from(tableName)
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: userId,
          })
          .eq("id", item.id);
        if (error) {
          throw error;
        }
      }

      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: hard_delete ? "hard_deleted" : "soft_deleted",
        target_type: item.type,
        target_id: item.id,
        reason: `Bulk ${hard_delete ? "hard" : "soft"} delete`,
      });

      results.push({ id: item.id, status: "deleted" });
    } catch (error) {
      results.push({
        id: item.id,
        status: "error",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter((r) => r.status === "deleted").length} items deleted`,
  });
}

function getTableName(contentType: ContentType): string {
  const tableMap: Record<ContentType, string> = {
    setlist: "setlists",
    review: "venue_reviews",
    photo: "venue_photos",
    tip: "venue_insider_tips",
    user: "users",
    venue: "venues",
    show: "shows",
    artist: "artists",
  };

  const tableName = tableMap[contentType];
  if (!tableName) {
    throw new Error(`Unknown content type: ${contentType}`);
  }
  return tableName;
}

async function logModerationAction(
  supabase: SupabaseClient,
  action: ModerationAction,
): Promise<void> {
  const { error } = await supabase.from("moderation_logs").insert({
    moderator_id: action.moderator_id,
    action: action.action,
    target_type: action.target_type,
    target_id: action.target_id,
    reason: action.reason,
    created_at: new Date().toISOString(),
  });

  if (error) {
  }
}
