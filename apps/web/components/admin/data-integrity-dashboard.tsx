"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system";
import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { Progress } from "@repo/design-system";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface IntegrityCheck {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: any;
}

interface IntegrityReport {
  timestamp: string;
  checks: IntegrityCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "fail":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Loader2 className="h-5 w-5 animate-spin text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pass":
      return (
        <Badge
          variant="outline"
          className="border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
        >
          Passed
        </Badge>
      );
    case "fail":
      return (
        <Badge
          variant="outline"
          className="border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
        >
          Failed
        </Badge>
      );
    case "warning":
      return (
        <Badge
          variant="outline"
          className="border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
        >
          Warning
        </Badge>
      );
    default:
      return null;
  }
};

export function DataIntegrityDashboard() {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/verify-integrity");
      if (!response.ok) {
        throw new Error("Failed to load integrity report");
      }
      const data = await response.json();
      setReport(data);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const executeFix = async (action: string) => {
    setFixing(action);
    try {
      const response = await fetch("/api/admin/verify-integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute fix");
      }

      const result = await response.json();

      // Show success message
      alert(result.message);

      // Reload report
      await loadReport();
    } catch (_error) {
      alert("Failed to execute fix");
    } finally {
      setFixing(null);
    }
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const healthScore = Math.round(
    (report.summary.passed / report.summary.total) * 100,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">Data Integrity Dashboard</h2>
          <p className="text-gray-500">
            Last checked: {new Date(report.timestamp).toLocaleString()}
          </p>
        </div>
        <Button
          onClick={loadReport}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-sm">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={healthScore} className="flex-1" />
              <span className="font-bold text-2xl">{healthScore}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{report.summary.passed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{report.summary.warnings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{report.summary.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues Alert */}
      {report.summary.failed > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Issues Detected</AlertTitle>
          <AlertDescription>
            {report.summary.failed} critical data integrity issues require
            immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Checks */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Checks</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="warnings">Warnings</TabsTrigger>
          <TabsTrigger value="passed">Passed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {report.checks.map((check, index) => (
            <CheckCard
              key={index}
              check={check}
              onFix={executeFix}
              fixing={fixing}
            />
          ))}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {report.checks
            .filter((check) => check.status === "fail")
            .map((check, index) => (
              <CheckCard
                key={index}
                check={check}
                onFix={executeFix}
                fixing={fixing}
              />
            ))}
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          {report.checks
            .filter((check) => check.status === "warning")
            .map((check, index) => (
              <CheckCard
                key={index}
                check={check}
                onFix={executeFix}
                fixing={fixing}
              />
            ))}
        </TabsContent>

        <TabsContent value="passed" className="space-y-4">
          {report.checks
            .filter((check) => check.status === "pass")
            .map((check, index) => (
              <CheckCard
                key={index}
                check={check}
                onFix={executeFix}
                fixing={fixing}
              />
            ))}
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common maintenance tasks to fix data integrity issues
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Button
            variant="outline"
            onClick={() => executeFix("recalculate_trending")}
            disabled={fixing === "recalculate_trending"}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Recalculate Trending Scores
          </Button>

          <Button
            variant="outline"
            onClick={() => executeFix("fix_slugs")}
            disabled={fixing === "fix_slugs"}
            className="flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            Fix Missing Slugs
          </Button>

          <Button
            variant="outline"
            onClick={() => executeFix("cleanup_orphans")}
            disabled={fixing === "cleanup_orphans"}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Clean Orphaned Records
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface CheckCardProps {
  check: IntegrityCheck;
  onFix: (action: string) => void;
  fixing: string | null;
}

function CheckCard({ check, onFix, fixing }: CheckCardProps) {
  const canFix =
    check.status === "fail" &&
    (check.name === "Vote Count Consistency" ||
      check.name === "Missing Artist Slugs" ||
      check.name === "Orphaned Votes");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(check.status)}
            <CardTitle className="text-base">{check.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(check.status)}
            {canFix && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (check.name === "Vote Count Consistency") {
                    onFix("fix_voteCounts");
                  } else if (check.name === "Missing Artist Slugs") {
                    onFix("fix_slugs");
                  } else if (check.name === "Orphaned Votes") {
                    onFix("cleanup_orphans");
                  }
                }}
                disabled={fixing !== null}
              >
                Fix Now
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm">{check.message}</p>
        {check.details && (
          <div className="mt-2 rounded bg-gray-50 p-2 text-xs">
            <pre>{JSON.stringify(check.details, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
