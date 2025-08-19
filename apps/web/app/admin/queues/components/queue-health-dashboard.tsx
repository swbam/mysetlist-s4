"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Progress } from "@repo/design-system/components/ui/progress";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Play,
  Pause,
  RefreshCw,
  Server,
  TrendingUp,
  Zap,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface QueueHealth {
  success: boolean;
  timestamp: string;
  health: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    redisConnection: string;
    workersRunning: boolean;
    activeImports: number;
  };
  workers: {
    healthy: boolean;
    workers: Array<{
      name: string;
      running: boolean;
      jobCount?: number;
    }>;
  };
  queues: Array<{
    name: string;
    status: 'running' | 'paused' | 'error';
    counts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    isPaused: boolean;
    sampleJobs: {
      waiting: Array<any>;
      active: Array<any>;
      failed: Array<any>;
    };
    metrics: {
      throughput: {
        hourly: number;
        daily: number;
      };
      errorRate: number;
    };
    error?: string;
  }>;
  activeImports: Array<{
    artistId: string;
    artistName?: string;
    stage: string;
    progress: number;
    message: string;
    startedAt: string;
    duration: number;
  }>;
  metrics: {
    totalQueues: number;
    totalJobs: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    systemErrorRate: number;
    avgThroughput: {
      hourly: number;
      daily: number;
    };
  };
}

export default function QueueHealthDashboard() {
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchQueueHealth = async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/queues/health", {
        headers: {
          Authorization: "Bearer admin-token", // In real app, use proper auth
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setQueueHealth(data);
    } catch (error) {
      console.error("Error fetching queue health:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch queue health");
    } finally {
      setIsLoading(false);
    }
  };

  const manageQueue = async (queueName: string, action: 'pause' | 'resume' | 'clean' | 'retry-failed') => {
    try {
      const response = await fetch("/api/admin/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin-token",
        },
        body: JSON.stringify({
          action,
          queueName,
          options: action === 'clean' ? { grace: 0, limit: 100, status: 'completed' } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh data after action
      fetchQueueHealth();
    } catch (error) {
      console.error(`Error ${action} queue ${queueName}:`, error);
    }
  };

  useEffect(() => {
    fetchQueueHealth();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchQueueHealth, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "running":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "critical":
      case "error":
        return "text-red-500";
      case "paused":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "running":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical":
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "paused":
        return <Pause className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (isLoading && !queueHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading queue health...</span>
      </div>
    );
  }

  if (error && !queueHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <span className="text-red-500">{error}</span>
          <Button onClick={fetchQueueHealth} className="mt-2 block mx-auto" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!queueHealth) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">Queue Health Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of queue workers and job processing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
          <Button onClick={fetchQueueHealth} disabled={isLoading} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">System Health</CardTitle>
            {getStatusIcon(queueHealth.health.status)}
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl capitalize">
              {queueHealth.health.status}
            </div>
            <p className="text-muted-foreground text-xs">
              Score: {queueHealth.health.score}/100
            </p>
            <Progress value={queueHealth.health.score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Redis Connection</CardTitle>
            <Database className={`h-4 w-4 ${queueHealth.health.redisConnection === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl capitalize">
              {queueHealth.health.redisConnection}
            </div>
            <p className="text-muted-foreground text-xs">Queue backend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Workers</CardTitle>
            <Server className={`h-4 w-4 ${queueHealth.health.workersRunning ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {queueHealth.workers.workers.filter(w => w.running).length}/{queueHealth.workers.workers.length}
            </div>
            <p className="text-muted-foreground text-xs">Running workers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active Imports</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{queueHealth.health.activeImports}</div>
            <p className="text-muted-foreground text-xs">Running now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Error Rate</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${queueHealth.metrics.systemErrorRate > 5 ? 'text-red-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{queueHealth.metrics.systemErrorRate}%</div>
            <p className="text-muted-foreground text-xs">System-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="queues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queues">Queue Status</TabsTrigger>
          <TabsTrigger value="imports">Active Imports</TabsTrigger>
          <TabsTrigger value="workers">Worker Health</TabsTrigger>
        </TabsList>

        {/* Queue Status */}
        <TabsContent value="queues" className="space-y-4">
          <div className="grid gap-4">
            {queueHealth.queues.map((queue) => (
              <Card key={queue.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(queue.status)}
                      <CardTitle className="text-lg">{queue.name}</CardTitle>
                      <Badge variant={queue.isPaused ? "secondary" : "default"}>
                        {queue.isPaused ? "Paused" : "Running"}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => manageQueue(queue.name, queue.isPaused ? 'resume' : 'pause')}
                        size="sm"
                        variant="outline"
                      >
                        {queue.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                      <Button
                        onClick={() => manageQueue(queue.name, 'clean')}
                        size="sm"
                        variant="outline"
                      >
                        Clean
                      </Button>
                      {queue.counts.failed > 0 && (
                        <Button
                          onClick={() => manageQueue(queue.name, 'retry-failed')}
                          size="sm"
                          variant="outline"
                        >
                          Retry Failed
                        </Button>
                      )}
                    </div>
                  </div>
                  {queue.error && (
                    <CardDescription className="text-red-500">
                      Error: {queue.error}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Job Counts */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Job Counts</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Waiting:</span>
                          <span className="font-medium">{queue.counts.waiting}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active:</span>
                          <span className="font-medium text-blue-600">{queue.counts.active}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span className="font-medium text-green-600">{queue.counts.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Failed:</span>
                          <span className="font-medium text-red-600">{queue.counts.failed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delayed:</span>
                          <span className="font-medium text-yellow-600">{queue.counts.delayed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Performance</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Hourly Rate:</span>
                          <span className="font-medium">{queue.metrics.throughput.hourly} jobs/hr</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Rate:</span>
                          <span className={`font-medium ${queue.metrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                            {queue.metrics.errorRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sample Jobs */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Recent Jobs</h4>
                      <div className="space-y-1 text-xs">
                        {queue.sampleJobs.active.length > 0 && (
                          <div>
                            <span className="text-blue-600 font-medium">Active:</span>
                            {queue.sampleJobs.active.slice(0, 2).map(job => (
                              <div key={job.id} className="ml-2 truncate">
                                {job.name} ({job.progress || 0}%)
                              </div>
                            ))}
                          </div>
                        )}
                        {queue.sampleJobs.failed.length > 0 && (
                          <div>
                            <span className="text-red-600 font-medium">Failed:</span>
                            {queue.sampleJobs.failed.slice(0, 2).map(job => (
                              <div key={job.id} className="ml-2 truncate">
                                {job.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Active Imports */}
        <TabsContent value="imports" className="space-y-4">
          {queueHealth.activeImports.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No active imports running</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {queueHealth.activeImports.map((imp) => (
                <Card key={imp.artistId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {imp.artistName || `Artist ${imp.artistId}`}
                        </CardTitle>
                        <CardDescription>
                          {imp.message} • {formatDuration(imp.duration)} elapsed
                        </CardDescription>
                      </div>
                      <Badge variant="default">{imp.stage}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{imp.progress}%</span>
                      </div>
                      <Progress value={imp.progress} />
                      <p className="text-xs text-muted-foreground">
                        Started: {format(new Date(imp.startedAt), "MMM d, HH:mm:ss")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Worker Health */}
        <TabsContent value="workers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queueHealth.workers.workers.map((worker) => (
              <Card key={worker.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">{worker.name}</CardTitle>
                  {getStatusIcon(worker.running ? 'running' : 'error')}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <span className={worker.running ? 'text-green-600' : 'text-red-600'}>
                        {worker.running ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    {worker.jobCount && (
                      <div className="flex justify-between text-sm">
                        <span>Concurrency:</span>
                        <span>{worker.jobCount}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-center text-muted-foreground text-xs">
        Last updated: {format(new Date(queueHealth.timestamp), "MMM d, yyyy HH:mm:ss")}
        {autoRefresh && " • Auto-refreshing every 5 seconds"}
      </div>
    </div>
  );
}