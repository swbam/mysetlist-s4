import { createClient } from "~/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all users for export
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        id,
        email,
        display_name,
        username,
        role,
        _creationTime,
        last_login_at,
        email_verified,
        is_banned,
        warning_count
      `)
      .order("_creationTime", { ascending: false });

    if (error) {
      throw error;
    }

    // Convert to CSV
    const csvHeaders = [
      "ID",
      "Email", 
      "Display Name",
      "Username",
      "Role",
      "Created At",
      "Last Login",
      "Email Verified",
      "Is Banned",
      "Warning Count"
    ].join(",");

    const csvRows = users?.map(user => [
      user.id,
      user.email,
      user.display_name || "",
      user.username || "",
      user.role,
      user._creationTime,
      user.last_login_at || "",
      user.email_verified ? "Yes" : "No",
      user.is_banned ? "Yes" : "No",
      user.warning_count || 0
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")) || [];

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting users:", error);
    return NextResponse.json(
      { error: "Failed to export users" },
      { status: 500 }
    );
  }
}