import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/ui/select';
import { format, subDays } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle,
  FileText,
  Search,
  Shield,
  Star,
  User,
  XCircle,
} from 'lucide-react';
import { createClient } from '~/lib/supabase/server';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function ActivityPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  await params; // Params accessed for Next.js compatibility

  // Fetch moderation logs with moderator info
  const { data: logs } = await supabase
    .from('moderation_logs')
    .select(`
      *,
      moderator:users!moderation_logs_moderator_id_fkey(
        display_name,
        email,
        avatar_url,
        role
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Get activity stats
  const today = new Date();
  const weekAgo = subDays(today, 7);

  await supabase
    .from('moderation_logs')
    .select('action', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString());

  // Group logs by action type
  const actionCounts =
    logs?.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) ?? {};

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
      case 'verify_artist':
        return CheckCircle;
      case 'reject':
      case 'unverify_artist':
        return XCircle;
      case 'delete':
      case 'ban_user':
        return Ban;
      case 'warn_user':
        return AlertTriangle;
      case 'feature_content':
        return Star;
      default:
        return Shield;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve':
      case 'verify_artist':
        return 'text-green-600';
      case 'reject':
      case 'delete':
      case 'ban_user':
        return 'text-red-600';
      case 'warn_user':
        return 'text-yellow-600';
      case 'feature_content':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">Activity Log</h1>
        <p className="mt-2 text-muted-foreground">
          Track all moderation and administrative actions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{logs?.length ?? 0}</div>
            <p className="text-muted-foreground text-xs">all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">This Week</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {logs?.filter((log) => new Date(log.created_at) >= weekAgo)
                .length ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">actions taken</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Most Common</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {Object.entries(actionCounts).sort(
                ([, a], [, b]) => (b as number) - (a as number)
              )[0]?.[0]
                ? formatAction(
                    Object.entries(actionCounts).sort(
                      ([, a], [, b]) => (b as number) - (a as number)
                    )[0]?.[0] ?? 'unknown'
                  )
                : 'N/A'}
            </div>
            <p className="text-muted-foreground text-xs">action type</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active Mods</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {new Set(logs?.map((log) => log.moderator_id)).size ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">unique moderators</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by moderator, target, or reason..."
                className="pl-10"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="approve">Approvals</SelectItem>
                <SelectItem value="reject">Rejections</SelectItem>
                <SelectItem value="delete">Deletions</SelectItem>
                <SelectItem value="ban_user">User Bans</SelectItem>
                <SelectItem value="warn_user">Warnings</SelectItem>
                <SelectItem value="verify_artist">Verifications</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            All moderation and administrative actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs?.map((log) => {
              const ActionIcon = getActionIcon(log.action);

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={log.moderator?.avatar_url} />
                    <AvatarFallback>
                      {log.moderator?.display_name?.[0] ||
                        log.moderator?.email?.[0] ||
                        'M'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {log.moderator?.display_name || log.moderator?.email}
                      </p>
                      <Badge
                        variant={
                          log.moderator?.role === 'admin'
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {log.moderator?.role}
                      </Badge>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ActionIcon
                        className={`h-4 w-4 ${getActionColor(log.action)}`}
                      />
                      <span
                        className={`font-medium ${getActionColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                      <span className="text-muted-foreground">on</span>
                      <Badge variant="outline">{log.target_type}</Badge>
                    </div>

                    {log.reason && (
                      <p className="mt-1 text-muted-foreground text-sm">
                        {log.reason}
                      </p>
                    )}

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <Badge key={key} variant="secondary">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
