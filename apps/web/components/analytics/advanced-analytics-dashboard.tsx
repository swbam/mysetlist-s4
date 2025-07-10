'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Brain,
  Filter,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Shield,
  DollarSign
} from 'lucide-react';

interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionRates: number[];
  periods: string[];
}

interface RetentionMetrics {
  dayOneRetention: number;
  daySevenRetention: number;
  dayThirtyRetention: number;
  rollingRetention: Array<{ day: number; retention: number }>;
  churnRate: number;
  stickiness: number;
}

interface PredictiveMetrics {
  userGrowthPrediction: Array<{ month: string; predicted: number; confidence: number }>;
  churnPrediction: Array<{ userId: string; churnProbability: number; riskFactors: string[] }>;
  ltv: Array<{ segment: string; averageLTV: number; projectedLTV: number }>;
  seasonalityAnalysis: {
    trends: Array<{ month: string; seasonality: number }>;
    peakPeriods: string[];
    lowPeriods: string[];
  };
}

interface FunnelAnalysis {
  funnel: Array<{ step: string; users: number; conversionRate: number; dropoffRate: number }>;
  overallConversion: number;
  bottlenecks: string[];
  optimizationSuggestions: string[];
}

interface RFMAnalysis {
  segments: Array<{ segment: string; userCount: number; description: string }>;
  distribution: Record<string, number>;
  recommendations: Record<string, string[]>;
}

interface AdvancedAnalyticsData {
  cohort: { cohorts: CohortData[]; averageRetention: number[]; cohortInsights: string[] };
  retention: RetentionMetrics;
  predictive: PredictiveMetrics;
  funnel: FunnelAnalysis;
  rfm: RFMAnalysis;
}

export default function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/analytics/advanced?type=all&startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        // Also fetch insights
        await fetchInsights();
      } else {
        setError(result.error || 'Failed to fetch analytics data');
      }
    } catch (err) {
      setError('Error fetching advanced analytics data');
      console.error('Advanced analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch(
        `/api/analytics/advanced?type=insights&startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      const result = await response.json();
      
      if (result.success) {
        setInsights(result.data);
      }
    } catch (err) {
      console.error('Insights fetch error:', err);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getRetentionColor = (retention: number) => {
    if (retention >= 50) return 'text-green-600';
    if (retention >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getChurnColor = (churn: number) => {
    if (churn <= 10) return 'text-green-600';
    if (churn <= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (probability: number) => {
    if (probability >= 0.7) return 'bg-red-100 text-red-800';
    if (probability >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getSegmentIcon = (segment: string) => {
    switch (segment) {
      case 'Champions': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'Loyal Customers': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'At Risk': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            Deep insights into user behavior, retention, and growth patterns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="start-date">From</Label>
            <Input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-40"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="end-date">To</Label>
            <Input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-40"
            />
          </div>
          <Button onClick={fetchAnalyticsData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cohort">Cohort</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="rfm">RFM</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Retention</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(data.cohort.averageRetention[0] || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Month 0 retention rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getChurnColor(data.retention.churnRate)}`}>
                    {formatPercentage(data.retention.churnRate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    30-day churn rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatNumber(data.predictive.churnPrediction.length)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Users at risk of churn
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Funnel Conversion</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(data.funnel.overallConversion)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Overall conversion rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Insights */}
            {insights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.recommendations.map((insight: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alerts */}
            {insights?.alerts && insights.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.alerts.map((alert: any, idx: number) => (
                      <Alert key={idx} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-muted-foreground mt-1">{alert.action}</div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cohort" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Cohort Analysis
                </CardTitle>
                <CardDescription>
                  Track user retention across different cohorts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Cohort Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Cohort</th>
                          <th className="text-left p-2">Size</th>
                          <th className="text-center p-2">M0</th>
                          <th className="text-center p-2">M1</th>
                          <th className="text-center p-2">M2</th>
                          <th className="text-center p-2">M3</th>
                          <th className="text-center p-2">M6</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cohort.cohorts.map((cohort) => (
                          <tr key={cohort.cohortMonth} className="border-b">
                            <td className="p-2 font-medium">{cohort.cohortMonth}</td>
                            <td className="p-2">{formatNumber(cohort.cohortSize)}</td>
                            <td className="text-center p-2">
                              <span className={`${getRetentionColor(cohort.retentionRates[0] || 0)}`}>
                                {formatPercentage(cohort.retentionRates[0] || 0)}
                              </span>
                            </td>
                            <td className="text-center p-2">
                              <span className={`${getRetentionColor(cohort.retentionRates[1] || 0)}`}>
                                {formatPercentage(cohort.retentionRates[1] || 0)}
                              </span>
                            </td>
                            <td className="text-center p-2">
                              <span className={`${getRetentionColor(cohort.retentionRates[2] || 0)}`}>
                                {formatPercentage(cohort.retentionRates[2] || 0)}
                              </span>
                            </td>
                            <td className="text-center p-2">
                              <span className={`${getRetentionColor(cohort.retentionRates[3] || 0)}`}>
                                {formatPercentage(cohort.retentionRates[3] || 0)}
                              </span>
                            </td>
                            <td className="text-center p-2">
                              <span className={`${getRetentionColor(cohort.retentionRates[6] || 0)}`}>
                                {formatPercentage(cohort.retentionRates[6] || 0)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cohort Insights */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Cohort Insights</h4>
                    {data.cohort.cohortInsights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retention" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Day 1 Retention</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getRetentionColor(data.retention.dayOneRetention)}`}>
                    {formatPercentage(data.retention.dayOneRetention)}
                  </div>
                  <Progress value={data.retention.dayOneRetention} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Day 7 Retention</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getRetentionColor(data.retention.daySevenRetention)}`}>
                    {formatPercentage(data.retention.daySevenRetention)}
                  </div>
                  <Progress value={data.retention.daySevenRetention} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Day 30 Retention</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getRetentionColor(data.retention.dayThirtyRetention)}`}>
                    {formatPercentage(data.retention.dayThirtyRetention)}
                  </div>
                  <Progress value={data.retention.dayThirtyRetention} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Churn Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold ${getChurnColor(data.retention.churnRate)}`}>
                    {formatPercentage(data.retention.churnRate)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    30-day churn rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stickiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    {formatPercentage(data.retention.stickiness)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    DAU/MAU ratio
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Growth Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.predictive.userGrowthPrediction.slice(0, 3).map((prediction, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <div className="font-medium">{prediction.month}</div>
                          <div className="text-sm text-gray-600">
                            {formatPercentage(prediction.confidence * 100)} confidence
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{formatNumber(prediction.predicted)}</div>
                          <div className="text-sm text-gray-600">users</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Churn Risk Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.predictive.churnPrediction.slice(0, 5).map((user, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium">User {user.userId.slice(-8)}</div>
                          <div className="text-sm text-gray-600">
                            {user.riskFactors.join(', ')}
                          </div>
                        </div>
                        <Badge className={getRiskColor(user.churnProbability)}>
                          {formatPercentage(user.churnProbability * 100)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Lifetime Value Projections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.predictive.ltv.map((segment, idx) => (
                    <div key={idx} className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="font-medium">{segment.segment}</div>
                      <div className="text-2xl font-bold text-green-600">
                        ${segment.averageLTV.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Projected: ${segment.projectedLTV.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Conversion Funnel
                </CardTitle>
                <CardDescription>
                  Overall conversion: {formatPercentage(data.funnel.overallConversion)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.funnel.funnel.map((step, idx) => (
                    <div key={idx} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{step.step}</div>
                        <div className="text-sm text-gray-600">
                          {formatNumber(step.users)} users
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatPercentage(step.conversionRate)}
                        </div>
                        <div className="text-sm text-red-600">
                          {formatPercentage(step.dropoffRate)} drop-off
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress value={step.conversionRate} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottlenecks */}
                {data.funnel.bottlenecks.length > 0 && (
                  <div className="mt-6 p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Bottlenecks Identified</h4>
                    <div className="space-y-2">
                      {data.funnel.bottlenecks.map((bottleneck, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm">{bottleneck}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimization Suggestions */}
                {data.funnel.optimizationSuggestions.length > 0 && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">Optimization Suggestions</h4>
                    <div className="space-y-2">
                      {data.funnel.optimizationSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfm" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    User Segments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.rfm.segments.map((segment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getSegmentIcon(segment.segment)}
                          <div>
                            <div className="font-medium">{segment.segment}</div>
                            <div className="text-sm text-gray-600">{segment.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatNumber(segment.userCount)}</div>
                          <div className="text-sm text-gray-600">
                            {formatPercentage(data.rfm.distribution[segment.segment] || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(data.rfm.recommendations).map(([segment, recommendations]) => (
                      <div key={segment} className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getSegmentIcon(segment)}
                          <h4 className="font-medium">{segment}</h4>
                        </div>
                        <div className="pl-6 space-y-1">
                          {recommendations.map((rec, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              • {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}