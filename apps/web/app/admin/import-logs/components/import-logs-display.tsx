"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { Progress } from "@repo/design-system/components/ui/progress";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  AlertTriangle,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
// Define types locally to avoid database import
interface ImportLog {
  id: string;
  level: string;
  stage: string;
  message: string;
  createdAt: string;
  durationMs?: number;
  itemsProcessed?: number | null;
  itemsTotal?: number | null;
  details?: any;
  errorStack?: string;
}

interface ImportStatus {
  stage: string;
  percentage?: number;
  message?: string;
  error?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  startedAt?: string;
  completedAt?: string;
}

interface ImportLogsDisplayProps {
  artistId: string;
  artistName: string;
  externalId?: string;
}

export function ImportLogsDisplay({ artistId, artistName, externalId }: ImportLogsDisplayProps) {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "error" | "success">("all");

  // Fetch logs and status
  const fetchData = async () => {
    try {
      // Fetch logs
      const logsResponse = await fetch(`/api/admin/import-logs?artistId=${encodeURIComponent(artistId)}`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);
      }

      // Fetch status
      const statusResponse = await fetch(`/api/admin/import-status?artistId=${encodeURIComponent(artistId)}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData.status);
        
        // Start polling if import is in progress
        if (statusData.status && !["completed", "failed"].includes(statusData.status.stage)) {
          setIsPolling(true);
        } else {
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [artistId]);

  // Polling for updates
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [isPolling, artistId]);

  // Filter logs
  const filteredLogs = filter === "all" 
    ? logs 
    : logs.filter(log => log.level === filter);

  // Group logs by stage
  const logsByStage = filteredLogs.reduce((acc, log) => {
    if (!acc[log.stage]) acc[log.stage] = [];
    acc[log.stage]!.push(log);
    return acc;
  }, {} as Record<string, ImportLog[]>);

  const toggleStage = (stage: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage);
    } else {
      newExpanded.add(stage);
    }
    setExpandedStages(newExpanded);
  };

  const triggerImport = async () => {
    if (!externalId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/artists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmAttractionId: externalId,
          adminImport: true,
        }),
      });

      if (response.ok) {
        setIsPolling(true);
        await fetchData();
      } else {
        console.error("Failed to trigger import:", await response.text());
      }
    } catch (error) {
      console.error("Error triggering import:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-logs-${artistName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (stage: string) => {
    if (stage === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (stage === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (stage === "initializing") return <Clock className="h-4 w-4 text-blue-500" />;
    return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      {status && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(status.stage)}
                Import Status
              </CardTitle>
              <div className="flex gap-2">
                {externalId && (
                  <Button
                    size="sm"
                    onClick={triggerImport}
                    disabled={isLoading || isPolling}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {isPolling ? "Importing..." : "Re-import"}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={exportLogs}>
                  <Download className="h-4 w-4 mr-1" />
                  Export Logs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Stage</p>
                <p className="font-medium">{status.stage.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <div className="flex items-center gap-2">
                  <Progress value={status.percentage || 0} className="w-[100px]" />
                  <span className="text-sm font-medium">{status.percentage || 0}%</span>
                </div>
              </div>
            </div>

            {status.message && (
              <div>
                <p className="text-sm text-muted-foreground">Status Message</p>
                <p className="text-sm">{status.message}</p>
              </div>
            )}

            {status.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/50">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Error</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{status.error}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Songs</p>
                <p className="text-xl font-bold">{status.totalSongs || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Shows</p>
                <p className="text-xl font-bold">{status.totalShows || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Venues</p>
                <p className="text-xl font-bold">{status.totalVenues || 0}</p>
              </div>
            </div>

            {status.startedAt && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Started: {format(new Date(status.startedAt), "MMM d, h:mm:ss a")}</span>
                {status.completedAt && (
                  <span>Completed: {format(new Date(status.completedAt), "MMM d, h:mm:ss a")}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Import Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              <TabsTrigger value="grouped">Grouped by Stage</TabsTrigger>
            </TabsList>

            {/* Filter Buttons */}
            <div className="flex gap-2 mt-4 mb-4">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All ({logs.length})
              </Button>
              <Button
                size="sm"
                variant={filter === "info" ? "default" : "outline"}
                onClick={() => setFilter("info")}
              >
                Info ({logs.filter(l => l.level === "info").length})
              </Button>
              <Button
                size="sm"
                variant={filter === "success" ? "default" : "outline"}
                onClick={() => setFilter("success")}
              >
                Success ({logs.filter(l => l.level === "success").length})
              </Button>
              <Button
                size="sm"
                variant={filter === "warning" ? "default" : "outline"}
                onClick={() => setFilter("warning")}
              >
                Warning ({logs.filter(l => l.level === "warning").length})
              </Button>
              <Button
                size="sm"
                variant={filter === "error" ? "default" : "outline"}
                onClick={() => setFilter("error")}
              >
                Error ({logs.filter(l => l.level === "error").length})
              </Button>
            </div>

            <TabsContent value="timeline">
              <ScrollArea className="h-[500px] w-full">
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors"
                    >
                      {getLogIcon(log.level)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.stage}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "HH:mm:ss.SSS")}
                          </span>
                          {log.durationMs && (
                            <span className="text-xs text-muted-foreground">
                              ({(log.durationMs / 1000).toFixed(2)}s)
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {typeof log.itemsProcessed === 'number' && typeof log.itemsTotal === 'number' && log.itemsTotal > 0 && (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={Math.min(100, Math.max(0, (log.itemsProcessed / log.itemsTotal) * 100))}
                              className="w-[100px] h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {log.itemsProcessed}/{log.itemsTotal}
                            </span>
                          </div>
                        )}
                        {log.details ? (
                          <pre className="text-xs text-muted-foreground bg-accent/30 p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : null}
                        {log.errorStack && (
                          <pre className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded mt-2 overflow-x-auto">
                            {log.errorStack}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {isLoading ? "Loading logs..." : "No logs found for this artist."}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="grouped">
              <ScrollArea className="h-[500px] w-full">
                <div className="space-y-4">
                  {Object.entries(logsByStage).map(([stage, stageLogs]) => (
                    <div key={stage} className="border rounded-lg">
                      <button
                        className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors"
                        onClick={() => toggleStage(stage)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedStages.has(stage) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium">{stage.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <Badge variant="secondary">{stageLogs.length}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {stageLogs.some(l => l.level === "error") && <Badge variant="destructive">Has Errors</Badge>}
                          {stageLogs.some(l => l.level === "warning") && <Badge variant="outline" className="border-yellow-500">Has Warnings</Badge>}
                        </div>
                      </button>
                      
                      {expandedStages.has(stage) && (
                        <div className="border-t p-3 space-y-2">
                          {stageLogs.map((log) => (
                            <div key={log.id} className="flex items-start gap-2 text-sm">
                              {getLogIcon(log.level)}
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground mr-2">
                                  {format(new Date(log.createdAt), "HH:mm:ss")}
                                </span>
                                {log.message}
                                {log.details ? (
                                  <pre className="text-xs text-muted-foreground mt-1">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {Object.keys(logsByStage).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {isLoading ? "Loading logs..." : "No logs found for this artist."}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}