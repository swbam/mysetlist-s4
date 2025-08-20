import {
  Activity,
  Calendar,
  Database,
  FileText,
  Flag,
  Home,
  MapPin,
  Monitor,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "~/lib/supabase/server";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const supabase = await createClient();
  const { locale } = await params;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // Check if user is admin or moderator
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !userData ||
    (userData.role !== "admin" && userData.role !== "moderator")
  ) {
    redirect(`/${locale}`);
  }

  const isAdmin = userData.role === "admin";

  const navigation = [
    { name: "Dashboard", href: `/${locale}/admin`, icon: Home },
    {
      name: "Users",
      href: `/${locale}/admin/users`,
      icon: Users,
      adminOnly: true,
    },
    { name: "Shows", href: `/${locale}/admin/shows`, icon: Calendar },
    { name: "Venues", href: `/${locale}/admin/venues`, icon: MapPin },
    { name: "Import Logs", href: `/${locale}/admin/import-logs`, icon: Database },
    { name: "Moderation", href: `/${locale}/admin/moderation`, icon: Shield },
    { name: "Reports", href: `/${locale}/admin/reports`, icon: Flag },
    {
      name: "Monitoring",
      href: `/${locale}/admin/monitoring`,
      icon: Monitor,
      adminOnly: true,
    },
    { name: "Content", href: `/${locale}/admin/content`, icon: FileText },
    { name: "Activity Log", href: `/${locale}/admin/activity`, icon: Activity },
    {
      name: "Settings",
      href: `/${locale}/admin/settings`,
      icon: Settings,
      adminOnly: true,
    },
  ];

  const visibleNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <AdminLayoutClient
      navigation={visibleNavigation}
      isAdmin={isAdmin}
    >
      {children}
    </AdminLayoutClient>
  );
}