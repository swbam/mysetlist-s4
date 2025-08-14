import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  MapPin,
  Music,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "~/lib/supabase/server";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?:
    | {
        value: number;
        isPositive: boolean;
      }
    | undefined;
  href?: string;
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  href,
}: StatsCardProps) {
  const content = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value}</div>
        {description && (
          <p className="mt-1 text-muted-foreground text-xs">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center">
            <TrendingUp
              className={`mr-1 h-4 w-4 ${trend.isPositive ? "text-green-500" : "text-red-500"}`}
            />
            <span
              className={`text-xs ${trend.isPositive ? "text-green-500" : "text-red-500"}`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="ml-1 text-muted-foreground text-xs">
              from last week
            </span>
          </div>
        )}
      </CardContent>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-shadow hover:shadow-lg">
        <Card>{content}</Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const supabase = await createClient();
  const { locale } = await params;

  // Fetch platform statistics
  const today = new Date();
  const weekAgo = subDays(today, 7);

  // Get current stats
  const [
    { count: totalUsers },
    { count: totalShows },
    { count: totalArtists },
    { count: totalVenues },
    { count: pendingReports },
    { count: pendingModeration },
    { data: recentActivity },
    { data: platformStats },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("deleted_at", null),
    supabase.from("shows").select("*", { count: "exact", head: true }),
    supabase.from("artists").select("*", { count: "exact", head: true }),
    supabase.from("venues").select("*", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("content_moderation")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("moderation_logs")
      .select(
        "*, moderator:users!moderation_logs_moderator_id_fkey(display_name, email)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("platform_stats")
      .select("*")
      .gte("stat_date", format(weekAgo, "yyyy-MM-dd"))
      .lte("stat_date", format(today, "yyyy-MM-dd"))
      .order("stat_date", { ascending: false }),
  ]);

  // Calculate trends
  const latestStats = platformStats?.[0];
  const weekAgoStats = platformStats?.[platformStats.length - 1];

  const calculateTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) {
      return 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  };

  const usersTrend =
    latestStats && weekAgoStats
      ? {
          value: calculateTrend(
            latestStats.total_users,
            weekAgoStats.total_users,
          ),
          isPositive: latestStats.total_users >= weekAgoStats.total_users,
        }
      : undefined;

  // Get new content today
  const { count: newUsersToday } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDay(today).toISOString())
    .lte("created_at", endOfDay(today).toISOString());

  const { count: newShowsToday } = await supabase
    .from("shows")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDay(today).toISOString())
    .lte("created_at", endOfDay(today).toISOString());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-2xl md:text-3xl">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Monitor platform activity and manage content
        </p>
      </div>

      {/* Quick Actions */}
      {(pendingReports! > 0 || pendingModeration! > 0) && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingReports! > 0 && (
              <Link
                href={`/${locale}/admin/reports`}
                className="flex items-center justify-between rounded-md bg-background p-3 transition-colors hover:bg-accent"
              >
                <span className="font-medium">
                  {pendingReports} pending reports
                </span>
                <span className="text-muted-foreground text-sm">
                  Review now →
                </span>
              </Link>
            )}
            {pendingModeration! > 0 && (
              <Link
                href={`/${locale}/admin/moderation`}
                className="flex items-center justify-between rounded-md bg-background p-3 transition-colors hover:bg-accent"
              >
                <span className="font-medium">
                  {pendingModeration} items awaiting moderation
                </span>
                <span className="text-muted-foreground text-sm">
                  Review now →
                </span>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={totalUsers?.toLocaleString() ?? 0}
          description={`+${newUsersToday ?? 0} today`}
          icon={Users}
          trend={usersTrend}
          href={`/${locale}/admin/users`}
        />
        <StatsCard
          title="Total Shows"
          value={totalShows?.toLocaleString() ?? 0}
          description={`+${newShowsToday ?? 0} today`}
          icon={Calendar}
          href={`/${locale}/admin/shows`}
        />
        <StatsCard
          title="Total Artists"
          value={totalArtists?.toLocaleString() ?? 0}
          icon={Music}
          href={`/${locale}/admin/content`}
        />
        <StatsCard
          title="Total Venues"
          value={totalVenues?.toLocaleString() ?? 0}
          icon={MapPin}
          href={`/${locale}/admin/venues`}
        />
      </div>

      {/* Recent Activity and Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Admin Activity</CardTitle>
            <CardDescription>Latest moderation actions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.moderator?.display_name ||
                            activity.moderator?.email}
                        </span>{" "}
                        {activity.action.replace("_", " ")}{" "}
                        {activity.target_type}
                      </p>
                      {activity.reason && (
                        <p className="text-muted-foreground text-xs">
                          {activity.reason}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(activity.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>System status and metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Active Users (7d)</span>
                <span className="text-muted-foreground text-sm">
                  {latestStats?.active_users?.toLocaleString() ?? "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  Content Created Today
                </span>
                <span className="text-muted-foreground text-sm">
                  {(
                    (latestStats?.new_setlists ?? 0) +
                    (latestStats?.new_reviews ?? 0) +
                    (latestStats?.new_photos ?? 0)
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">User Engagement</span>
                <span className="text-muted-foreground text-sm">
                  {latestStats?.new_votes?.toLocaleString() ?? 0} votes today
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <Link
                href={`/${locale}/admin/analytics`}
                className="flex items-center gap-2 text-primary text-sm hover:underline"
              >
                <BarChart3 className="h-4 w-4" />
                View detailed analytics
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
