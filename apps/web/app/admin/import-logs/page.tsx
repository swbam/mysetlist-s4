import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import { Badge } from "@repo/design-system/badge";
import { ScrollArea } from "@repo/design-system/scroll-area";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Activity, Music, MapPin, Calendar } from "lucide-react";
import { AdminSearchBar } from "./components/admin-search-bar";
import { db, importStatus, importLogs, desc, sql } from "@repo/database";

export const dynamic = "force-dynamic";

interface ImportSummary {
  artistId: string;
  artistName: string;
  lastImport: Date | null;
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  lastStatus: string | null;
  totalSongs: number;
  totalShows: number;
  totalVenues: number;
}

async function getImportSummaries(): Promise<ImportSummary[]> {
  try {
    const summaries = await db
      .select({
        artistId: importStatus.artistId,
        artistName: sql<string>`COALESCE(${importStatus.artistName}, ${importStatus.artistId})`,
        lastImport: sql<Date>`MAX(${importStatus.createdAt})`,
        totalImports: sql<number>`COUNT(DISTINCT ${importStatus.id})`,
        successfulImports: sql<number>`COUNT(CASE WHEN ${importStatus.stage} = 'completed' THEN 1 END)`,
        failedImports: sql<number>`COUNT(CASE WHEN ${importStatus.stage} = 'failed' THEN 1 END)`,
        lastStatus: sql<string>`(
          SELECT stage 
          FROM import_status s2 
          WHERE s2.artist_id = ${importStatus.artistId} 
          ORDER BY created_at DESC 
          LIMIT 1
        )`,
        totalSongs: sql<number>`COALESCE(MAX(${importStatus.totalSongs}), 0)`,
        totalShows: sql<number>`COALESCE(MAX(${importStatus.totalShows}), 0)`,
        totalVenues: sql<number>`COALESCE(MAX(${importStatus.totalVenues}), 0)`,
      })
      .from(importStatus)
      .groupBy(importStatus.artistId, importStatus.artistName)
      .orderBy(desc(sql`MAX(${importStatus.createdAt})`))
      .limit(20);

    return summaries as ImportSummary[];
  } catch (error) {
    console.error("Failed to fetch import summaries:", error);
    return [];
  }
}

async function getRecentLogs() {
  try {
    const logs = await db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.createdAt))
      .limit(100);
    return logs;
  } catch (error) {
    console.error("Failed to fetch recent logs:", error);
    return [];
  }
}

function getStatusIcon(status: string | null) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "in_progress":
    case "importing-songs":
    case "importing-shows":
    case "syncing-identifiers":
      return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function getLogLevelBadge(level: string) {
  switch (level) {
    case "error":
      return <Badge variant="destructive">{level}</Badge>;
    case "warning":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">{level}</Badge>;
    case "success":
      return <Badge variant="outline" className="border-green-500 text-green-700">{level}</Badge>;
    case "info":
      return <Badge variant="secondary">{level}</Badge>;
    case "debug":
      return <Badge variant="outline">{level}</Badge>;
    default:
      return <Badge>{level}</Badge>;
  }
}

export default async function ImportLogsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const summaries = await getImportSummaries();
  const recentLogs = await getRecentLogs();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-2xl md:text-3xl">Import Logs</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Monitor artist import processes and troubleshoot issues
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Search Artists</CardTitle>
          <CardDescription>
            Search for an artist to view their complete import history and logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSearchBar />
        </CardContent>
      </Card>

      {/* Import Summaries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Import Activity</CardTitle>
          <CardDescription>
            Overview of recent artist imports and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-4">
              {summaries.map((summary) => (
                <div
                  key={summary.artistId}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(summary.lastStatus)}
                    <div>
                      <p className="font-medium">{summary.artistName}</p>
                      <p className="text-sm text-muted-foreground">
                        Last import: {summary.lastImport ? format(summary.lastImport, "MMM d, h:mm a") : "Never"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span>{summary.totalSongs}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{summary.totalShows}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{summary.totalVenues}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {summary.totalImports} imports
                      </Badge>
                      {summary.successfulImports > 0 && (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                          {summary.successfulImports} successful
                        </Badge>
                      )}
                      {summary.failedImports > 0 && (
                        <Badge variant="outline" className="text-xs border-red-500 text-red-700">
                          {summary.failedImports} failed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {summaries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No import activity found. Start by searching for an artist above.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>
            Recent import logs across all artists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full">
            <div className="space-y-2 font-mono text-xs">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 p-2 rounded hover:bg-accent/30"
                >
                  <span className="text-muted-foreground w-[140px] shrink-0">
                    {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </span>
                  {getLogLevelBadge(log.level)}
                  <span className="text-muted-foreground w-[100px] shrink-0">
                    [{log.stage}]
                  </span>
                  <span className="flex-1">
                    {log.artistName && (
                      <span className="font-semibold mr-2">{log.artistName}:</span>
                    )}
                    {log.message}
                    {log.itemsProcessed !== null && log.itemsTotal !== null && (
                      <span className="text-muted-foreground ml-2">
                        ({log.itemsProcessed}/{log.itemsTotal})
                      </span>
                    )}
                    {log.durationMs && (
                      <span className="text-muted-foreground ml-2">
                        [{(log.durationMs / 1000).toFixed(2)}s]
                      </span>
                    )}
                  </span>
                </div>
              ))}
              
              {recentLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No logs available yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}