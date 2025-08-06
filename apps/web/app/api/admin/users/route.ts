import { type NextRequest, NextResponse } from "next/server";
import { createAuthenticatedClient } from "~/lib/api/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient();

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userData ||
      (userData.role !== "admin" && userData.role !== "moderator")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build query
    let query = supabase
      .from("users")
      .select(
        `
        id,
        email,
        display_name,
        username,
        role,
        created_at,
        last_login_at,
        email_confirmed_at,
        avatar_url,
        is_banned,
        ban_reason,
        warning_count,
        deleted_at
      `,
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (role && role !== "all") {
      query = query.eq("role", role);
    }

    if (status && status !== "all") {
      switch (status) {
        case "active":
          query = query
            .not("email_confirmed_at", "is", null)
            .eq("is_banned", false);
          break;
        case "banned":
          query = query.eq("is_banned", true);
          break;
        case "unverified":
          query = query.is("email_confirmed_at", null);
          break;
      }
    }

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,display_name.ilike.%${search}%,username.ilike.%${search}%`,
      );
    }

    // Get paginated results
    const offset = (page - 1) * limit;
    const {
      data: users,
      error,
      count,
    } = await query.range(offset, offset + limit - 1).select("*");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    // Get summary statistics
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: bannedUsers },
      { count: unverifiedUsers },
      { count: adminUsers },
      { count: moderatorUsers },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .not("email_confirmed_at", "is", null)
        .eq("is_banned", false),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_banned", true),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .is("email_confirmed_at", null),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin"),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "moderator"),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      statistics: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        banned: bannedUsers || 0,
        unverified: unverifiedUsers || 0,
        admins: adminUsers || 0,
        moderators: moderatorUsers || 0,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
