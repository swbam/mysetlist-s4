"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import {
  Database,
  Server,
  Shield,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Settings,
  TrendingUp,
  Target,
} from "lucide-react";

interface ScalabilityRecommendations {
  database: {
    readReplicas: number;
    sharding: boolean;
    partitioning: string[];
    connectionPooling: number;
  };
  caching: {
    layers: string[];
    ttl: Record<string, number>;
    memoryAllocation: string;
    strategy: string;
  };
  infrastructure: {
    servers: Array<{ type: string; count: number; specs: string }>;
    databases: Array<{ type: string; count: number; specs: string }>;
    caches: Array<{ type: string; count: number; specs: string }>;
    storage: { type: string; size: string; backups: string };
  };
  performance: {
    database: string[];
    application: string[];
    frontend: string[];
    network: string[];
  };
  monitoring: {
    metrics: string[];
    alerts: Array<{ metric: string; threshold: number; action: string }>;
    dashboards: string[];
    logging: { level: string; retention: string };
  };
  costs: {
    strategies: string[];
    recommendations: string[];
    savings: { monthly: number; percentage: number };
  };
  security: {
    measures: string[];
    compliance: string[];
    infrastructure: string[];
    monitoring: string[];
  };
}

interface ScalabilityPlan {
  currentState: any;
  targetState: any;
  migrationPlan: any;
  timeline: any;
  costs: any;
  risks: any;
}

export default function ScalabilityPlanner() {
  const [currentUsers, setCurrentUsers] = useState<number>(10000);
  const [targetUsers, setTargetUsers] = useState<number>(100000);
  const [timeframe, setTimeframe] = useState<string>("12 months");
  const [recommendations, setRecommendations] =
    useState<ScalabilityRecommendations | null>(null);
  const [scalabilityPlan, setScalabilityPlan] =
    useState<ScalabilityPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("recommendations");

  useEffect(() => {
    fetchRecommendations();
  }, [currentUsers]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/scalability?type=recommendations&userCount=${currentUsers}`,
      );
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || "Failed to fetch recommendations");
      }
    } catch (err) {
      setError("Error fetching scalability recommendations");
      console.error("Scalability recommendations error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateScalabilityPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/scalability?type=plan&userCount=${currentUsers}&targetUsers=${targetUsers}&timeframe=${timeframe}`,
      );
      const data = await response.json();

      if (data.success) {
        setScalabilityPlan(data.plan);
        setActiveTab("plan");
      } else {
        setError(data.error || "Failed to generate plan");
      }
    } catch (err) {
      setError("Error generating scalability plan");
      console.error("Scalability plan error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "startup":
        return "bg-green-100 text-green-800";
      case "growth":
        return "bg-blue-100 text-blue-800";
      case "scale":
        return "bg-purple-100 text-purple-800";
      case "enterprise":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskColor = (risk: string) => {
    if (risk.includes("complexity") || risk.includes("challenge")) {
      return "text-red-600";
    }
    if (risk.includes("performance") || risk.includes("downtime")) {
      return "text-orange-600";
    }
    return "text-yellow-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Scalability Planner
          </h2>
          <p className="text-muted-foreground">
            Plan and optimize your infrastructure for exponential growth
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Architecture Planning
        </Badge>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scalability Configuration
          </CardTitle>
          <CardDescription>
            Configure your current and target user base to get personalized
            recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentUsers">Current Users</Label>
              <Input
                id="currentUsers"
                type="number"
                value={currentUsers}
                onChange={(e) => setCurrentUsers(parseInt(e.target.value))}
                min="1000"
                max="10000000"
                step="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetUsers">Target Users</Label>
              <Input
                id="targetUsers"
                type="number"
                value={targetUsers}
                onChange={(e) => setTargetUsers(parseInt(e.target.value))}
                min="1000"
                max="10000000"
                step="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6 months">6 months</SelectItem>
                  <SelectItem value="12 months">12 months</SelectItem>
                  <SelectItem value="18 months">18 months</SelectItem>
                  <SelectItem value="24 months">24 months</SelectItem>
                  <SelectItem value="36 months">36 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={fetchRecommendations} disabled={loading}>
                <Activity className="w-4 h-4 mr-2" />
                Update Recommendations
              </Button>
              <Button
                onClick={generateScalabilityPlan}
                disabled={loading}
                variant="outline"
              >
                <Target className="w-4 h-4 mr-2" />
                Generate Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="plan">Migration Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recommendations ? (
            <div className="grid gap-6">
              {/* Infrastructure Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Infrastructure Recommendations
                  </CardTitle>
                  <CardDescription>
                    Recommended infrastructure for {formatNumber(currentUsers)}{" "}
                    users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Servers</h4>
                      {recommendations.infrastructure.servers.map(
                        (server, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                          >
                            <span className="font-medium">{server.type}</span>
                            <div className="text-right">
                              <div className="font-semibold">
                                {server.count}x
                              </div>
                              <div className="text-sm text-gray-600">
                                {server.specs}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">Databases</h4>
                      {recommendations.infrastructure.databases.map(
                        (db, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                          >
                            <span className="font-medium">{db.type}</span>
                            <div className="text-right">
                              <div className="font-semibold">{db.count}x</div>
                              <div className="text-sm text-gray-600">
                                {db.specs}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">Caches</h4>
                      {recommendations.infrastructure.caches.map(
                        (cache, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                          >
                            <span className="font-medium">{cache.type}</span>
                            <div className="text-right">
                              <div className="font-semibold">
                                {cache.count}x
                              </div>
                              <div className="text-sm text-gray-600">
                                {cache.specs}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Database Strategy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database Scaling Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {recommendations.database.readReplicas}
                      </div>
                      <div className="text-sm text-gray-600">Read Replicas</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {recommendations.database.sharding ? "Yes" : "No"}
                      </div>
                      <div className="text-sm text-gray-600">Sharding</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {recommendations.database.partitioning.length}
                      </div>
                      <div className="text-sm text-gray-600">
                        Partitioned Tables
                      </div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {recommendations.database.connectionPooling}
                      </div>
                      <div className="text-sm text-gray-600">
                        Connection Pool
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Optimizations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Performance Optimizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Database Optimizations</h4>
                      <div className="space-y-2">
                        {recommendations.performance.database.map(
                          (opt, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="mr-2"
                            >
                              {opt
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">
                        Application Optimizations
                      </h4>
                      <div className="space-y-2">
                        {recommendations.performance.application.map(
                          (opt, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="mr-2"
                            >
                              {opt
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Monitoring */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Measures
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.security.measures.map((measure, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            {measure
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Cost Optimization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {recommendations.costs.savings.percentage}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Potential Savings
                        </div>
                      </div>
                      <div className="space-y-2">
                        {recommendations.costs.strategies
                          .slice(0, 3)
                          .map((strategy, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm">
                                {strategy
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Configure your user base to see scalability recommendations
            </div>
          )}
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          {scalabilityPlan ? (
            <div className="space-y-6">
              {/* Migration Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Migration Plan Overview
                  </CardTitle>
                  <CardDescription>
                    Plan to scale from {formatNumber(currentUsers)} to{" "}
                    {formatNumber(targetUsers)} users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Current State</h4>
                      <Badge
                        className={getPhaseColor(
                          scalabilityPlan.currentState.phase,
                        )}
                      >
                        {scalabilityPlan.currentState.phase}
                      </Badge>
                      <div className="text-sm text-gray-600">
                        {formatNumber(scalabilityPlan.currentState.users)} users
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Target State</h4>
                      <Badge
                        className={getPhaseColor(
                          scalabilityPlan.targetState.phase,
                        )}
                      >
                        {scalabilityPlan.targetState.phase}
                      </Badge>
                      <div className="text-sm text-gray-600">
                        {formatNumber(scalabilityPlan.targetState.users)} users
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Timeline</h4>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{scalabilityPlan.timeline.total}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Migration Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Migration Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scalabilityPlan.timeline.phases.map(
                      (phase: any, idx: number) => (
                        <div key={idx} className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{phase.phase}</div>
                            <div className="text-sm text-gray-600">
                              {phase.duration}
                            </div>
                          </div>
                          <Progress value={(idx + 1) * 20} className="w-24" />
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cost Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Cost Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        ${formatNumber(scalabilityPlan.costs.current)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Current Monthly
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        ${formatNumber(scalabilityPlan.costs.target)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Target Monthly
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        ${formatNumber(scalabilityPlan.costs.migration)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Migration Cost
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Technical Risks</h4>
                      {scalabilityPlan.risks.technical.map(
                        (risk: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <AlertTriangle
                              className={`w-4 h-4 ${getRiskColor(risk)}`}
                            />
                            <span className="text-sm">
                              {risk
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">Operational Risks</h4>
                      {scalabilityPlan.risks.operational.map(
                        (risk: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <AlertTriangle
                              className={`w-4 h-4 ${getRiskColor(risk)}`}
                            />
                            <span className="text-sm">
                              {risk
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">Financial Risks</h4>
                      {scalabilityPlan.risks.financial.map(
                        (risk: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <AlertTriangle
                              className={`w-4 h-4 ${getRiskColor(risk)}`}
                            />
                            <span className="text-sm">
                              {risk
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Generate a migration plan to see detailed scaling recommendations
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
