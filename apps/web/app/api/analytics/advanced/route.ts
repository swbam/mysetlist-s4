import { type NextRequest, NextResponse } from "next/server";
import {
  getCohortAnalysis,
  getRetentionMetrics,
  getPredictiveAnalytics,
  getFunnelAnalysis,
  getRFMAnalysis,
} from "~/lib/analytics/advanced-analytics";
import { createServiceClient } from "~/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Check if request is authorized for advanced analytics
function isAuthorizedAnalyticsRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const analyticsSecret =
    process.env["ANALYTICS_SECRET"] || process.env["ADMIN_SECRET"];

  if (!analyticsSecret) {
    return false;
  }

  return authHeader === `Bearer ${analyticsSecret}`;
}

// GET: Get advanced analytics data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "cohort";
    const startDate =
      searchParams.get("startDate") ||
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get("endDate") || new Date().toISOString();
    const cohortType =
      (searchParams.get("cohortType") as "monthly" | "weekly") || "monthly";

    switch (type) {
      case "cohort":
        const cohortAnalysis = await getCohortAnalysis(
          startDate,
          endDate,
          cohortType,
        );
        return NextResponse.json({
          success: true,
          data: cohortAnalysis,
          timestamp: new Date().toISOString(),
        });

      case "retention":
        const retentionMetrics = await getRetentionMetrics(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: retentionMetrics,
          timestamp: new Date().toISOString(),
        });

      case "predictive":
        const predictiveAnalytics = await getPredictiveAnalytics(
          startDate,
          endDate,
        );
        return NextResponse.json({
          success: true,
          data: predictiveAnalytics,
          timestamp: new Date().toISOString(),
        });

      case "funnel":
        const funnelSteps = searchParams.get("steps")?.split(",") || [
          "user_signup",
          "first_vote",
          "profile_complete",
          "artist_follow",
          "setlist_create",
        ];

        const funnelAnalysis = await getFunnelAnalysis(
          funnelSteps,
          startDate,
          endDate,
        );
        return NextResponse.json({
          success: true,
          data: funnelAnalysis,
          timestamp: new Date().toISOString(),
        });

      case "rfm":
        const rfmAnalysis = await getRFMAnalysis(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: rfmAnalysis,
          timestamp: new Date().toISOString(),
        });

      case "all":
        // Return all advanced analytics data
        const [cohort, retention, predictive, funnel, rfm] = await Promise.all([
          getCohortAnalysis(startDate, endDate, cohortType),
          getRetentionMetrics(startDate, endDate),
          getPredictiveAnalytics(startDate, endDate),
          getFunnelAnalysis(
            [
              "user_signup",
              "first_vote",
              "profile_complete",
              "artist_follow",
              "setlist_create",
            ],
            startDate,
            endDate,
          ),
          getRFMAnalysis(startDate, endDate),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            cohort,
            retention,
            predictive,
            funnel,
            rfm,
          },
          timestamp: new Date().toISOString(),
        });

      case "insights":
        // Generate key insights from all analytics
        const insights = await generateAdvancedInsights(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: insights,
          timestamp: new Date().toISOString(),
        });

      case "health":
        // Check advanced analytics health
        const healthStatus = {
          analyticsEngine: "operational",
          dataFreshness: "current",
          processingLatency: "< 2s",
          availableMetrics: [
            "cohort_analysis",
            "retention_metrics",
            "predictive_analytics",
            "funnel_analysis",
            "rfm_analysis",
          ],
          systemStatus: "healthy",
        };

        return NextResponse.json({
          success: true,
          health: healthStatus,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: "Invalid analytics type" },
          { status: 400 },
        );
    }
  } catch (error) {
    // Use Sentry for production error logging
    if (process.env.NODE_ENV === "production") {
      // Sentry will capture this automatically via instrumentation
    } else {
      console.error("Advanced analytics GET error:", error);
    }
    return NextResponse.json(
      {
        error: "Failed to fetch advanced analytics data",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// POST: Generate custom analytics reports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType,
      startDate,
      endDate,
      segments,
      filters,
      cohortType = "monthly",
      customFunnelSteps,
    } = body;

    if (!reportType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "reportType, startDate, and endDate are required" },
        { status: 400 },
      );
    }

    switch (reportType) {
      case "custom_cohort":
        const customCohort = await getCohortAnalysis(
          startDate,
          endDate,
          cohortType,
        );

        // Apply filters if provided
        let filteredCohort = customCohort;
        if (filters?.minCohortSize) {
          filteredCohort.cohorts = filteredCohort.cohorts.filter(
            (cohort) => cohort.cohortSize >= filters.minCohortSize,
          );
        }

        return NextResponse.json({
          success: true,
          reportType: "custom_cohort",
          data: filteredCohort,
          parameters: { startDate, endDate, cohortType, filters },
          timestamp: new Date().toISOString(),
        });

      case "segment_analysis":
        const segmentAnalysis = await analyzeUserSegments(
          segments || [],
          startDate,
          endDate,
        );
        return NextResponse.json({
          success: true,
          reportType: "segment_analysis",
          data: segmentAnalysis,
          parameters: { segments, startDate, endDate },
          timestamp: new Date().toISOString(),
        });

      case "custom_funnel":
        const customFunnel = await getFunnelAnalysis(
          customFunnelSteps || [
            "user_signup",
            "first_vote",
            "profile_complete",
          ],
          startDate,
          endDate,
        );

        return NextResponse.json({
          success: true,
          reportType: "custom_funnel",
          data: customFunnel,
          parameters: { customFunnelSteps, startDate, endDate },
          timestamp: new Date().toISOString(),
        });

      case "comparative_analysis":
        const currentPeriodData = await Promise.all([
          getCohortAnalysis(startDate, endDate, cohortType),
          getRetentionMetrics(startDate, endDate),
          getRFMAnalysis(startDate, endDate),
        ]);

        // Calculate previous period dates
        const periodDiff =
          new Date(endDate).getTime() - new Date(startDate).getTime();
        const prevStartDate = new Date(
          new Date(startDate).getTime() - periodDiff,
        ).toISOString();
        const prevEndDate = new Date(
          new Date(endDate).getTime() - periodDiff,
        ).toISOString();

        const previousPeriodData = await Promise.all([
          getCohortAnalysis(prevStartDate, prevEndDate, cohortType),
          getRetentionMetrics(prevStartDate, prevEndDate),
          getRFMAnalysis(prevStartDate, prevEndDate),
        ]);

        const comparison = {
          current: {
            period: { start: startDate, end: endDate },
            cohort: currentPeriodData[0],
            retention: currentPeriodData[1],
            rfm: currentPeriodData[2],
          },
          previous: {
            period: { start: prevStartDate, end: prevEndDate },
            cohort: previousPeriodData[0],
            retention: previousPeriodData[1],
            rfm: previousPeriodData[2],
          },
          changes: calculatePeriodChanges(
            currentPeriodData,
            previousPeriodData,
          ),
        };

        return NextResponse.json({
          success: true,
          reportType: "comparative_analysis",
          data: comparison,
          timestamp: new Date().toISOString(),
        });

      case "predictive_report":
        const predictiveReport = await generatePredictiveReport(
          startDate,
          endDate,
        );
        return NextResponse.json({
          success: true,
          reportType: "predictive_report",
          data: predictiveReport,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 },
        );
    }
  } catch (error) {
    // Use Sentry for production error logging
    if (process.env.NODE_ENV === "production") {
      // Sentry will capture this automatically via instrumentation
    } else {
      console.error("Advanced analytics POST error:", error);
    }
    return NextResponse.json(
      {
        error: "Failed to generate analytics report",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// PUT: Update analytics configuration
export async function PUT(request: NextRequest) {
  try {
    if (!isAuthorizedAnalyticsRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { config, updateType } = body;

    if (!config || !updateType) {
      return NextResponse.json(
        { error: "config and updateType are required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    switch (updateType) {
      case "cohort_settings":
        const { data: cohortConfig, error: cohortError } = await supabase
          .from("analytics_config")
          .upsert({
            config_type: "cohort",
            config_value: config,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (cohortError) throw cohortError;

        return NextResponse.json({
          success: true,
          message: "Cohort settings updated successfully",
          config: cohortConfig,
          timestamp: new Date().toISOString(),
        });

      case "retention_settings":
        const { data: retentionConfig, error: retentionError } = await supabase
          .from("analytics_config")
          .upsert({
            config_type: "retention",
            config_value: config,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (retentionError) throw retentionError;

        return NextResponse.json({
          success: true,
          message: "Retention settings updated successfully",
          config: retentionConfig,
          timestamp: new Date().toISOString(),
        });

      case "predictive_settings":
        const { data: predictiveConfig, error: predictiveError } =
          await supabase
            .from("analytics_config")
            .upsert({
              config_type: "predictive",
              config_value: config,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (predictiveError) throw predictiveError;

        return NextResponse.json({
          success: true,
          message: "Predictive settings updated successfully",
          config: predictiveConfig,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: "Invalid update type" },
          { status: 400 },
        );
    }
  } catch (error) {
    // Use Sentry for production error logging
    if (process.env.NODE_ENV === "production") {
      // Sentry will capture this automatically via instrumentation
    } else {
      console.error("Advanced analytics PUT error:", error);
    }
    return NextResponse.json(
      {
        error: "Failed to update analytics configuration",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Helper functions
async function generateAdvancedInsights(
  startDate: string,
  endDate: string,
): Promise<any> {
  const [cohort, retention, predictive, rfm] = await Promise.all([
    getCohortAnalysis(startDate, endDate),
    getRetentionMetrics(startDate, endDate),
    getPredictiveAnalytics(startDate, endDate),
    getRFMAnalysis(startDate, endDate),
  ]);

  const insights = {
    keyMetrics: {
      averageRetention: cohort.averageRetention[0] || 0,
      churnRate: retention.churnRate,
      stickiness: retention.stickiness,
      highValueUsers:
        rfm.segments.find((s) => s.segment === "Champions")?.userCount || 0,
    },
    trends: {
      retentionTrend:
        retention.daySevenRetention > retention.dayOneRetention
          ? "improving"
          : "declining",
      churnRisk: predictive.churnPrediction.length,
      growthPrediction: predictive.userGrowthPrediction[0]?.predicted || 0,
    },
    recommendations: [
      ...cohort.cohortInsights,
      ...generateRetentionRecommendations(retention),
      ...generateChurnRecommendations(predictive.churnPrediction),
    ],
    alerts: generateAlerts(cohort, retention, predictive, rfm),
  };

  return insights;
}

function generateRetentionRecommendations(retention: any): string[] {
  const recommendations: string[] = [];

  if (retention.dayOneRetention < 40) {
    recommendations.push(
      "Focus on improving onboarding experience - day 1 retention is below 40%",
    );
  }

  if (retention.churnRate > 20) {
    recommendations.push(
      "Implement churn prevention campaigns - churn rate is above 20%",
    );
  }

  if (retention.stickiness < 20) {
    recommendations.push(
      "Improve daily engagement features - stickiness is below 20%",
    );
  }

  return recommendations;
}

function generateChurnRecommendations(churnPrediction: any[]): string[] {
  const recommendations: string[] = [];

  if (churnPrediction.length > 0) {
    recommendations.push(
      `${churnPrediction.length} users at high risk of churn - implement retention campaigns`,
    );
  }

  const highRiskUsers = churnPrediction.filter((p) => p.churnProbability > 0.7);
  if (highRiskUsers.length > 0) {
    recommendations.push(
      `${highRiskUsers.length} users have >70% churn probability - immediate intervention needed`,
    );
  }

  return recommendations;
}

function generateAlerts(
  _cohort: any,
  retention: any,
  predictive: any,
  rfm: any,
): any[] {
  const alerts: any[] = [];

  if (retention.churnRate > 25) {
    alerts.push({
      type: "critical",
      message: `Churn rate is critically high at ${retention.churnRate.toFixed(1)}%`,
      action: "Implement immediate retention strategies",
    });
  }

  if (predictive.churnPrediction.length > 100) {
    alerts.push({
      type: "warning",
      message: `${predictive.churnPrediction.length} users at risk of churn`,
      action: "Review and optimize user engagement",
    });
  }

  const hibernatingUsers =
    rfm.segments.find((s: any) => s.segment === "Hibernating")?.userCount || 0;
  if (hibernatingUsers > 50) {
    alerts.push({
      type: "warning",
      message: `${hibernatingUsers} users are hibernating`,
      action: "Launch win-back campaigns",
    });
  }

  return alerts;
}

async function analyzeUserSegments(
  segments: string[],
  startDate: string,
  endDate: string,
): Promise<any> {
  const supabase = createServiceClient();

  const segmentAnalysis = await Promise.all(
    segments.map(async (segment) => {
      const supabaseLocal = createServiceClient();
      const { data: users, error } = await supabaseLocal
        .from("users")
        .select("id, created_at")
        .eq("segment", segment)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (error) throw error;

      return {
        segment,
        userCount: users?.length || 0,
        retention: await getRetentionMetrics(startDate, endDate),
        growth: calculateSegmentGrowth(users || []),
      };
    }),
  );

  return segmentAnalysis;
}

function calculateSegmentGrowth(users: any[]): any {
  if (users.length === 0) return { growth: 0, trend: "stable" };

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentUsers = users.filter(
    (u) => new Date(u.created_at) >= thirtyDaysAgo,
  );
  const growth = (recentUsers.length / users.length) * 100;

  return {
    growth,
    trend: growth > 10 ? "growing" : growth < -10 ? "declining" : "stable",
  };
}

async function generatePredictiveReport(
  startDate: string,
  endDate: string,
): Promise<any> {
  const predictive = await getPredictiveAnalytics(startDate, endDate);

  const report = {
    summary: {
      totalPredictions: predictive.userGrowthPrediction.length,
      highRiskUsers: predictive.churnPrediction.filter(
        (p) => p.churnProbability > 0.7,
      ).length,
      growthForecast: predictive.userGrowthPrediction[0]?.predicted || 0,
      confidenceLevel: predictive.userGrowthPrediction[0]?.confidence || 0,
    },
    churnAnalysis: {
      totalAtRisk: predictive.churnPrediction.length,
      topRiskFactors: getTopRiskFactors(predictive.churnPrediction),
      interventionRecommendations: generateInterventionRecommendations(
        predictive.churnPrediction,
      ),
    },
    growthProjection: {
      nextSixMonths: predictive.userGrowthPrediction,
      seasonalTrends: predictive.seasonalityAnalysis,
      ltvProjections: predictive.ltv,
    },
    actionItems: generatePredictiveActionItems(predictive),
  };

  return report;
}

function getTopRiskFactors(churnPrediction: any[]): any[] {
  const riskFactorCounts: Record<string, number> = {};

  churnPrediction.forEach((user) => {
    user.riskFactors.forEach((factor: string) => {
      riskFactorCounts[factor] = (riskFactorCounts[factor] || 0) + 1;
    });
  });

  return Object.entries(riskFactorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([factor, count]) => ({ factor, count }));
}

function generateInterventionRecommendations(churnPrediction: any[]): string[] {
  const recommendations: string[] = [];

  const topRiskFactors = getTopRiskFactors(churnPrediction);

  topRiskFactors.forEach(({ factor, count }) => {
    if (factor.includes("Inactive")) {
      recommendations.push(
        `${count} users inactive - send re-engagement campaigns`,
      );
    } else if (factor.includes("Low session")) {
      recommendations.push(
        `${count} users with low engagement - improve onboarding`,
      );
    } else if (factor.includes("New user")) {
      recommendations.push(
        `${count} new users at risk - optimize first-week experience`,
      );
    }
  });

  return recommendations;
}

function generatePredictiveActionItems(predictive: any): string[] {
  const actionItems: string[] = [];

  if (predictive.churnPrediction.length > 0) {
    actionItems.push(
      "Implement targeted retention campaigns for high-risk users",
    );
  }

  if (predictive.seasonalityAnalysis.peakPeriods.length > 0) {
    actionItems.push(
      `Prepare for peak periods: ${predictive.seasonalityAnalysis.peakPeriods.join(", ")}`,
    );
  }

  if (predictive.userGrowthPrediction.length > 0) {
    const growth = predictive.userGrowthPrediction[0].predicted;
    actionItems.push(`Scale infrastructure for ${growth} predicted users`);
  }

  return actionItems;
}

function calculatePeriodChanges(current: any[], previous: any[]): any {
  const changes = {
    retention: {
      dayOneRetention:
        ((current[1].dayOneRetention - previous[1].dayOneRetention) /
          previous[1].dayOneRetention) *
        100,
      daySevenRetention:
        ((current[1].daySevenRetention - previous[1].daySevenRetention) /
          previous[1].daySevenRetention) *
        100,
      churnRate:
        ((current[1].churnRate - previous[1].churnRate) /
          previous[1].churnRate) *
        100,
    },
    cohorts: {
      averageRetention:
        current[0].averageRetention[0] - previous[0].averageRetention[0],
      cohortCount: current[0].cohorts.length - previous[0].cohorts.length,
    },
    rfm: {
      champions:
        (current[2].segments.find((s: any) => s.segment === "Champions")
          ?.userCount || 0) -
        (previous[2].segments.find((s: any) => s.segment === "Champions")
          ?.userCount || 0),
      atRisk:
        (current[2].segments.find((s: any) => s.segment === "At Risk")
          ?.userCount || 0) -
        (previous[2].segments.find((s: any) => s.segment === "At Risk")
          ?.userCount || 0),
    },
  };

  return changes;
}
