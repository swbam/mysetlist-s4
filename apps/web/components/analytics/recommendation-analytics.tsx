"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { Progress } from "@repo/design-system/components/ui/progress"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs"
import {
  Brain,
  Calendar,
  Eye,
  Filter,
  Music,
  Target,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"

interface RecommendationMetrics {
  totalRecommendations: number
  clickThroughRate: number
  conversionRate: number
  userEngagement: number
  accuracyScore: number
  algorithmPerformance: Array<{
    algorithm: string
    accuracy: number
    engagement: number
    usage: number
  }>
  categoryBreakdown: Array<{
    category: string
    recommendations: number
    clicks: number
    conversions: number
    ctr: number
  }>
  topRecommendations: Array<{
    type: "artist" | "show" | "venue"
    name: string
    description: string
    clicks: number
    conversions: number
    score: number
  }>
  userSegmentPerformance: Array<{
    segment: string
    users: number
    avgRecommendations: number
    engagement: number
    satisfaction: number
  }>
  realTimeMetrics: {
    activeRecommendations: number
    newRecommendations: number
    clicksLast24h: number
    conversionLast24h: number
  }
}

export function RecommendationAnalytics() {
  const [metrics, setMetrics] = useState<RecommendationMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecommendationMetrics()
  }, [])

  const fetchRecommendationMetrics = async () => {
    try {
      setLoading(true)

      // Mock data - in production this would fetch from /api/analytics?metric=recommendations
      const mockData: RecommendationMetrics = {
        totalRecommendations: 45678,
        clickThroughRate: 12.4,
        conversionRate: 3.7,
        userEngagement: 68.2,
        accuracyScore: 82.5,
        algorithmPerformance: [
          {
            algorithm: "Collaborative Filtering",
            accuracy: 85.2,
            engagement: 72.1,
            usage: 45.3,
          },
          {
            algorithm: "Content-Based",
            accuracy: 78.9,
            engagement: 68.4,
            usage: 32.7,
          },
          {
            algorithm: "Hybrid ML",
            accuracy: 88.1,
            engagement: 79.2,
            usage: 22.0,
          },
        ],
        categoryBreakdown: [
          {
            category: "Artists",
            recommendations: 18520,
            clicks: 2301,
            conversions: 847,
            ctr: 12.4,
          },
          {
            category: "Shows",
            recommendations: 15890,
            clicks: 1968,
            conversions: 723,
            ctr: 12.4,
          },
          {
            category: "Venues",
            recommendations: 11268,
            clicks: 1389,
            conversions: 512,
            ctr: 12.3,
          },
        ],
        topRecommendations: [
          {
            type: "artist",
            name: "Taylor Swift",
            description: "Based on your listening history",
            clicks: 1250,
            conversions: 487,
            score: 94.2,
          },
          {
            type: "show",
            name: "The Weeknd - After Hours Tour",
            description: "Similar to shows you've attended",
            clicks: 1180,
            conversions: 445,
            score: 91.8,
          },
          {
            type: "venue",
            name: "Madison Square Garden",
            description: "Popular venue in your area",
            clicks: 980,
            conversions: 367,
            score: 89.5,
          },
        ],
        userSegmentPerformance: [
          {
            segment: "Power Users",
            users: 2340,
            avgRecommendations: 15.7,
            engagement: 84.2,
            satisfaction: 4.6,
          },
          {
            segment: "Regular Users",
            users: 8950,
            avgRecommendations: 8.3,
            engagement: 67.8,
            satisfaction: 4.1,
          },
          {
            segment: "Casual Users",
            users: 12680,
            avgRecommendations: 4.2,
            engagement: 45.6,
            satisfaction: 3.8,
          },
        ],
        realTimeMetrics: {
          activeRecommendations: 3456,
          newRecommendations: 234,
          clicksLast24h: 892,
          conversionLast24h: 167,
        },
      }

      setMetrics(mockData)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load recommendation analytics"
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading recommendation analytics: {error}</p>
            <Button onClick={fetchRecommendationMetrics} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Recommendation Analytics
          </h2>
          <p className="text-muted-foreground">
            AI-powered recommendation system performance and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            {metrics.accuracyScore}% Accuracy
          </Badge>
          <Badge variant="outline" className="text-blue-600">
            {metrics.clickThroughRate}% CTR
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Total Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalRecommendations.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.realTimeMetrics.newRecommendations} new today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              Click-Through Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.clickThroughRate}%
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.realTimeMetrics.clicksLast24h} clicks (24h)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
            <div className="text-sm text-muted-foreground">
              {metrics.realTimeMetrics.conversionLast24h} conversions (24h)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              User Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.userEngagement}%</div>
            <div className="text-sm text-muted-foreground">
              Average engagement score
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-500" />
              AI Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accuracyScore}%</div>
            <div className="text-sm text-muted-foreground">
              Model prediction accuracy
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            Real-Time Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.realTimeMetrics.activeRecommendations}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Recommendations
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.realTimeMetrics.newRecommendations}
              </div>
              <div className="text-sm text-muted-foreground">New Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.realTimeMetrics.clicksLast24h}
              </div>
              <div className="text-sm text-muted-foreground">Clicks (24h)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.realTimeMetrics.conversionLast24h}
              </div>
              <div className="text-sm text-muted-foreground">
                Conversions (24h)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Tabs defaultValue="algorithms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="algorithms">Algorithm Performance</TabsTrigger>
          <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
          <TabsTrigger value="top">Top Recommendations</TabsTrigger>
          <TabsTrigger value="segments">User Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="algorithms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Algorithm Performance Comparison
              </CardTitle>
              <CardDescription>
                How different ML algorithms are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {metrics.algorithmPerformance.map((algo, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{algo.algorithm}</h4>
                      <Badge variant="outline">{algo.usage}% Usage</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Accuracy</span>
                          <span>{algo.accuracy}%</span>
                        </div>
                        <Progress value={algo.accuracy} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Engagement</span>
                          <span>{algo.engagement}%</span>
                        </div>
                        <Progress value={algo.engagement} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Usage</span>
                          <span>{algo.usage}%</span>
                        </div>
                        <Progress value={algo.usage} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Category Performance
              </CardTitle>
              <CardDescription>
                How different recommendation categories are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.categoryBreakdown.map((category, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{category.category}</h4>
                      <Badge variant="outline">{category.ctr}% CTR</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {category.recommendations.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">
                          Recommendations
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {category.clicks.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">Clicks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {category.conversions.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">Conversions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Performing Recommendations
              </CardTitle>
              <CardDescription>
                Most successful recommendations by engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div className="flex items-center gap-2">
                        {rec.type === "artist" && (
                          <Music className="h-4 w-4 text-purple-500" />
                        )}
                        {rec.type === "show" && (
                          <Calendar className="h-4 w-4 text-blue-500" />
                        )}
                        {rec.type === "venue" && (
                          <Target className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{rec.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {rec.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{rec.score}</div>
                      <div className="text-sm text-muted-foreground">
                        {rec.clicks} clicks • {rec.conversions} conversions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Segment Performance
              </CardTitle>
              <CardDescription>
                How recommendations perform across different user types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.userSegmentPerformance.map((segment, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{segment.segment}</h4>
                      <Badge variant="outline">
                        {segment.users.toLocaleString()} users
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {segment.avgRecommendations}
                        </div>
                        <div className="text-muted-foreground">
                          Avg Recommendations
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {segment.engagement}%
                        </div>
                        <div className="text-muted-foreground">Engagement</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {segment.satisfaction}/5
                        </div>
                        <div className="text-muted-foreground">
                          Satisfaction
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
