"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Button } from "@repo/design-system/components/ui/button";
import { Badge } from "@repo/design-system/components/ui/badge";
import { RefreshCw, Pause, Play, Trash2, AlertCircle } from "lucide-react";

interface QueueStats {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface WorkerHealth {
  name: string;
  running: boolean;
  jobCount?: number;
}

export default function QueuesPage() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [health, setHealth] = useState<{ healthy: boolean; workers: WorkerHealth[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/queues", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch queue stats");
      }

      const data = await response.json();
      setStats(data.stats || []);
      setHealth(data.health || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleQueueAction = async (queueName: string, action: string) => {
    try {
      const response = await fetch("/api/admin/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
        },
        body: JSON.stringify({ queueName, action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} queue`);
      }

      // Refresh stats after action
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && stats.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading queue statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Queue Management</h1>
        <p className="text-gray-600">Monitor and manage BullMQ job queues</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Worker Health */}
      {health && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Worker Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Badge variant={health.healthy ? "success" : "destructive"}>
                {health.healthy ? "All Healthy" : "Issues Detected"}
              </Badge>
              <span className="text-sm text-gray-600">
                {health.workers.length} workers running
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {health.workers.map((worker) => (
                <div key={worker.name} className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      worker.running ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm">{worker.name.replace(":", ":")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.queue}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{stat.queue.replace(":", ": ")}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQueueAction(stat.queue, "pause")}
                    title="Pause queue"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQueueAction(stat.queue, "resume")}
                    title="Resume queue"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQueueAction(stat.queue, "clean")}
                    title="Clean completed jobs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Waiting</span>
                  <Badge variant="secondary">{stat.waiting}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active</span>
                  <Badge variant="default">{stat.active}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <Badge variant="success">{stat.completed}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Failed</span>
                  <Badge variant={stat.failed > 0 ? "destructive" : "secondary"}>
                    {stat.failed}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Delayed</span>
                  <Badge variant="outline">{stat.delayed}</Badge>
                </div>
              </div>
              {stat.failed > 0 && (
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQueueAction(stat.queue, "retry-failed")}
                >
                  Retry Failed Jobs
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>
    </div>
  );
}