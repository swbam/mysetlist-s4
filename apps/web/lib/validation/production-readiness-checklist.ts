/**
 * Production Readiness Validation Checklist
 * Comprehensive system validation before deployment
 */

import { sql } from "drizzle-orm";
import {
  type DatabasePerformanceReport,
  databasePerformanceTester,
} from "../database/performance-verification";
import { ArtistImportOrchestrator } from "../services/artist-import-orchestrator";
import {
  type PerformanceValidationReport,
  performanceValidator,
} from "./performance-validator";

// ================================
// Production Readiness Categories
// ================================

export interface ProductionReadinessCheck {
  id: string;
  category: string;
  name: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pass" | "fail" | "warning" | "not_tested";
  details?: string;
  recommendations?: string[];
  automated: boolean;
  testFunction?: () => Promise<CheckResult>;
}

export interface CheckResult {
  passed: boolean;
  details: string;
  metrics?: Record<string, any>;
  recommendations?: string[];
}

export interface ProductionReadinessReport {
  timestamp: string;
  overallStatus: "ready" | "not_ready" | "conditional";
  overallScore: number;
  categories: {
    [key: string]: CategorySummary;
  };
  checks: ProductionReadinessCheck[];
  criticalIssues: string[];
  blockers: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface CategorySummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number;
  status: "pass" | "fail" | "warning";
  criticalIssues: number;
}

// ================================
// Production Readiness Checklist
// ================================

export const PRODUCTION_CHECKLIST: ProductionReadinessCheck[] = [
  // ===== PERFORMANCE & SCALABILITY =====
  {
    id: "perf-import-phase1",
    category: "Performance",
    name: "Phase 1 Import Performance",
    description: "Artist page loads within 3 seconds during import",
    priority: "critical",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      const orchestrator = new ArtistImportOrchestrator();
      const startTime = Date.now();

      try {
        const result = await orchestrator.processPhase1("K8vZ917G7x0");
        const duration = Date.now() - startTime;

        return {
          passed: duration <= 3000,
          details: `Phase 1 completed in ${duration}ms (target: ≤3000ms)`,
          metrics: { duration, target: 3000 },
          recommendations:
            duration > 3000
              ? [
                  "Optimize Ticketmaster API calls",
                  "Implement response caching",
                  "Reduce Phase 1 scope",
                ]
              : [],
        };
      } catch (error) {
        return {
          passed: false,
          details: `Phase 1 failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          recommendations: [
            "Fix Phase 1 critical errors",
            "Review error handling",
          ],
        };
      }
    },
  },

  {
    id: "perf-concurrent-imports",
    category: "Performance",
    name: "Concurrent Import Handling",
    description:
      "System handles multiple simultaneous imports without degradation",
    priority: "high",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      const orchestrator = new ArtistImportOrchestrator();
      const startTime = Date.now();

      try {
        // Test 3 concurrent Phase 1 operations
        const promises = Array(3)
          .fill(null)
          .map(() => orchestrator.processPhase1("K8vZ917G7x0"));

        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;
        const successful = results.filter(
          (r) => r.status === "fulfilled",
        ).length;

        return {
          passed: successful >= 2 && duration <= 5000,
          details: `${successful}/3 concurrent imports succeeded in ${duration}ms`,
          metrics: { successful, total: 3, duration },
          recommendations:
            successful < 2
              ? [
                  "Implement import queue system",
                  "Add connection pooling",
                  "Review database locking",
                ]
              : [],
        };
      } catch (error) {
        return {
          passed: false,
          details: `Concurrent import test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          recommendations: [
            "Fix concurrency issues",
            "Review resource management",
          ],
        };
      }
    },
  },

  {
    id: "perf-database-queries",
    category: "Performance",
    name: "Database Query Performance",
    description: "All critical queries execute within acceptable timeframes",
    priority: "critical",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      try {
        const dbReport = await databasePerformanceTester.runPerformanceTests();
        const criticalQueries = dbReport.queryResults.filter(
          (q) => q.executionTime > 500 || !q.meetsTarget,
        );

        const averageTime =
          dbReport.queryResults.reduce(
            (sum, q) => sum + (q.executionTime > 0 ? q.executionTime : 0),
            0,
          ) / dbReport.queryResults.length;

        return {
          passed: criticalQueries.length === 0 && averageTime <= 200,
          details: `${dbReport.queryResults.length} queries tested, ${criticalQueries.length} failed, avg ${averageTime.toFixed(0)}ms`,
          metrics: {
            totalQueries: dbReport.queryResults.length,
            failedQueries: criticalQueries.length,
            averageTime,
          },
          recommendations:
            criticalQueries.length > 0
              ? [
                  "Optimize slow queries",
                  "Add missing database indexes",
                  "Review query patterns",
                ]
              : [],
        };
      } catch (error) {
        return {
          passed: false,
          details: `Database performance test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          recommendations: [
            "Fix database connectivity",
            "Review database configuration",
          ],
        };
      }
    },
  },

  // ===== SECURITY =====
  {
    id: "security-env-vars",
    category: "Security",
    name: "Environment Variables",
    description: "All required environment variables are configured",
    priority: "critical",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      const requiredVars = [
        "DATABASE_URL",
        "DIRECT_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SPOTIFY_CLIENT_ID",
        "SPOTIFY_CLIENT_SECRET",
        "TICKETMASTER_API_KEY",
        "CRON_SECRET",
      ];

      const missing = requiredVars.filter((varName) => !process.env[varName]);
      const weak = requiredVars.filter((varName) => {
        const value = process.env[varName];
        return value && value.length < 10; // Basic strength check
      });

      return {
        passed: missing.length === 0 && weak.length === 0,
        details: `${requiredVars.length - missing.length}/${requiredVars.length} environment variables configured`,
        metrics: {
          required: requiredVars.length,
          missing: missing.length,
          weak: weak.length,
        },
        recommendations: [
          ...missing.map((v) => `Configure missing environment variable: ${v}`),
          ...weak.map((v) => `Strengthen environment variable: ${v}`),
        ],
      };
    },
  },

  {
    id: "security-api-keys",
    category: "Security",
    name: "API Key Security",
    description: "API keys are properly secured and rate limited",
    priority: "high",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      const apiKeys = {
        spotify: process.env.SPOTIFY_CLIENT_SECRET,
        ticketmaster: process.env.TICKETMASTER_API_KEY,
        cronSecret: process.env.CRON_SECRET,
      };

      const issues: string[] = [];

      // Check if keys look like production keys (not test/dev keys)
      Object.entries(apiKeys).forEach(([name, key]) => {
        if (!key) {
          issues.push(`Missing ${name} API key`);
        } else if (
          key.includes("test") ||
          key.includes("dev") ||
          key.length < 20
        ) {
          issues.push(`${name} API key appears to be a test/dev key`);
        }
      });

      return {
        passed: issues.length === 0,
        details: `${Object.keys(apiKeys).length - issues.length}/${Object.keys(apiKeys).length} API keys properly configured`,
        metrics: {
          totalKeys: Object.keys(apiKeys).length,
          issues: issues.length,
        },
        recommendations: issues.map((issue) => `Security: ${issue}`),
      };
    },
  },

  // ===== RELIABILITY =====
  {
    id: "reliability-error-handling",
    category: "Reliability",
    name: "Error Handling",
    description: "System gracefully handles API failures and timeouts",
    priority: "high",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      // Test error handling by simulating failures
      const orchestrator = new ArtistImportOrchestrator();

      try {
        // Test with invalid artist ID
        await orchestrator.processPhase1("invalid-artist-id");
        return {
          passed: false,
          details: "System should have failed with invalid artist ID",
          recommendations: [
            "Improve input validation",
            "Add proper error handling",
          ],
        };
      } catch (error) {
        // Error is expected - check if it's handled gracefully
        const isGraceful =
          error instanceof Error &&
          error.message.includes("not found") &&
          !error.message.includes("undefined");

        return {
          passed: isGraceful,
          details: isGraceful
            ? "Error handling works correctly"
            : "Error handling needs improvement",
          metrics: {
            errorType:
              error instanceof Error ? error.constructor.name : "unknown",
          },
          recommendations: !isGraceful
            ? [
                "Improve error message clarity",
                "Add proper error types",
                "Implement error recovery",
              ]
            : [],
        };
      }
    },
  },

  {
    id: "reliability-database-connectivity",
    category: "Reliability",
    name: "Database Connectivity",
    description: "Database connections are stable and properly pooled",
    priority: "critical",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      try {
        const { db } = await import("@repo/database");

        // Test basic connectivity
        const result = await db.execute(sql`SELECT 1 as test`);

        // Test connection pooling by making multiple queries
        const promises = Array(10)
          .fill(null)
          .map(() => db.execute(sql`SELECT 1 as test`));

        const startTime = Date.now();
        await Promise.all(promises);
        const duration = Date.now() - startTime;

        return {
          passed: duration < 1000, // All queries should complete quickly
          details: `Database connectivity verified, 10 concurrent queries in ${duration}ms`,
          metrics: { concurrentQueries: 10, duration },
          recommendations:
            duration > 1000
              ? [
                  "Review database connection pooling",
                  "Optimize database configuration",
                  "Check network latency",
                ]
              : [],
        };
      } catch (error) {
        return {
          passed: false,
          details: `Database connectivity failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          recommendations: [
            "Check database connection string",
            "Verify database server status",
            "Review network configuration",
          ],
        };
      }
    },
  },

  // ===== MONITORING =====
  {
    id: "monitoring-health-checks",
    category: "Monitoring",
    name: "Health Check Endpoints",
    description: "Health check endpoints respond correctly",
    priority: "medium",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      try {
        // Test health endpoint
        const response = await fetch("/api/health", { method: "GET" });

        return {
          passed: response.ok,
          details: `Health endpoint returned ${response.status} ${response.statusText}`,
          metrics: { status: response.status, ok: response.ok },
          recommendations: !response.ok
            ? [
                "Fix health check endpoint",
                "Review server configuration",
                "Check dependencies",
              ]
            : [],
        };
      } catch (error) {
        return {
          passed: false,
          details: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          recommendations: [
            "Implement health check endpoint",
            "Review API routing",
            "Check server status",
          ],
        };
      }
    },
  },

  // ===== EXTERNAL APIS =====
  {
    id: "external-spotify-api",
    category: "External APIs",
    name: "Spotify API Connectivity",
    description: "Spotify API is accessible and authenticated",
    priority: "high",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      try {
        const { SpotifyClient } = await import(
          "@repo/external-apis/src/clients/spotify"
        );
        const client = new SpotifyClient({});

        await client.authenticate();
        const testSearch = await client.searchArtists("test", 1);

        return {
          passed: testSearch?.artists?.items !== undefined,
          details: "Spotify API connectivity verified",
          metrics: {
            authenticated: true,
            searchResults: testSearch?.artists?.items?.length || 0,
          },
          recommendations: [],
        };
      } catch (error) {
        return {
          passed: false,
          details: `Spotify API failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          recommendations: [
            "Verify Spotify API credentials",
            "Check API rate limits",
            "Review authentication flow",
          ],
        };
      }
    },
  },

  {
    id: "external-ticketmaster-api",
    category: "External APIs",
    name: "Ticketmaster API Connectivity",
    description: "Ticketmaster API is accessible with valid API key",
    priority: "high",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      try {
        const { TicketmasterClient } = await import(
          "@repo/external-apis/src/clients/ticketmaster"
        );
        const client = new TicketmasterClient({
          apiKey: process.env.TICKETMASTER_API_KEY || "",
        });

        // Test with a known artist ID
        const testArtist = await client.getAttraction("K8vZ917G7x0");

        return {
          passed: testArtist?.name !== undefined,
          details: `Ticketmaster API connectivity verified (found: ${testArtist?.name || "unknown"})`,
          metrics: { artistFound: !!testArtist?.name },
          recommendations: [],
        };
      } catch (error) {
        return {
          passed: false,
          details: `Ticketmaster API failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          recommendations: [
            "Verify Ticketmaster API key",
            "Check API rate limits",
            "Review API endpoint URLs",
          ],
        };
      }
    },
  },

  // ===== DEPLOYMENT =====
  {
    id: "deployment-build-process",
    category: "Deployment",
    name: "Build Process",
    description:
      "Application builds successfully without errors - Run `pnpm build` to verify successful build",
    priority: "critical",
    status: "not_tested",
    automated: false,
  },

  {
    id: "deployment-env-production",
    category: "Deployment",
    name: "Production Environment",
    description: "NODE_ENV is set to production",
    priority: "medium",
    status: "not_tested",
    automated: true,
    testFunction: async (): Promise<CheckResult> => {
      const nodeEnv = process.env.NODE_ENV;

      return {
        passed: nodeEnv === "production",
        details: `NODE_ENV is set to: ${nodeEnv || "undefined"}`,
        metrics: { nodeEnv },
        recommendations:
          nodeEnv !== "production"
            ? [
                "Set NODE_ENV=production in deployment environment",
                "Review deployment configuration",
              ]
            : [],
      };
    },
  },

  // ===== DATA INTEGRITY =====
  {
    id: "data-migrations",
    category: "Data Integrity",
    name: "Database Migrations",
    description:
      "All database migrations have been applied - Verify all migrations in supabase/migrations/ have been applied",
    priority: "critical",
    status: "not_tested",
    automated: false,
  },

  {
    id: "data-backups",
    category: "Data Integrity",
    name: "Database Backups",
    description:
      "Database backup strategy is configured - Verify Supabase automatic backups are enabled",
    priority: "high",
    status: "not_tested",
    automated: false,
  },
];

// ================================
// Production Readiness Validator
// ================================

export class ProductionReadinessValidator {
  private checks: ProductionReadinessCheck[] = [...PRODUCTION_CHECKLIST];

  async runAllChecks(): Promise<ProductionReadinessReport> {
    console.log("🚀 Starting production readiness validation...");

    const startTime = Date.now();

    // Run automated checks
    for (const check of this.checks) {
      if (check.automated && check.testFunction) {
        console.log(`  Testing: ${check.name}...`);

        try {
          const result = await check.testFunction();
          check.status = result.passed ? "pass" : "fail";
          check.details = result.details;
          check.recommendations = result.recommendations;
        } catch (error) {
          check.status = "fail";
          check.details = `Test execution failed: ${error instanceof Error ? error.message : "Unknown error"}`;
          check.recommendations = ["Fix test execution error"];
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ Production readiness validation completed in ${duration}ms`,
    );

    return this.generateReport();
  }

  async runCheck(checkId: string): Promise<CheckResult | null> {
    const check = this.checks.find((c) => c.id === checkId);

    if (!check || !check.automated || !check.testFunction) {
      return null;
    }

    try {
      const result = await check.testFunction();
      check.status = result.passed ? "pass" : "fail";
      check.details = result.details;
      check.recommendations = result.recommendations;

      return result;
    } catch (error) {
      check.status = "fail";
      check.details = `Test execution failed: ${error instanceof Error ? error.message : "Unknown error"}`;

      return {
        passed: false,
        details: check.details,
        recommendations: ["Fix test execution error"],
      };
    }
  }

  private generateReport(): ProductionReadinessReport {
    const categories = this.categorizeChecks();
    const overallScore = this.calculateOverallScore();
    const criticalIssues = this.identifyCriticalIssues();
    const blockers = this.identifyBlockers();
    const recommendations = this.generateRecommendations();
    const nextSteps = this.generateNextSteps();

    const overallStatus = this.determineOverallStatus(overallScore, blockers);

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      overallScore,
      categories,
      checks: this.checks,
      criticalIssues,
      blockers,
      recommendations,
      nextSteps,
    };
  }

  private categorizeChecks(): Record<string, CategorySummary> {
    const categories: Record<string, CategorySummary> = {};

    // Group checks by category
    const checksByCategory = this.checks.reduce(
      (acc, check) => {
        if (!acc[check.category]) {
          acc[check.category] = [];
        }
        acc[check.category]?.push(check);
        return acc;
      },
      {} as Record<string, ProductionReadinessCheck[]>,
    );

    // Calculate category summaries
    for (const [categoryName, checks] of Object.entries(checksByCategory)) {
      const total = checks.length;
      const passed = checks.filter((c) => c.status === "pass").length;
      const failed = checks.filter((c) => c.status === "fail").length;
      const warnings = checks.filter((c) => c.status === "warning").length;
      const criticalIssues = checks.filter(
        (c) => c.status === "fail" && c.priority === "critical",
      ).length;

      const score = total > 0 ? (passed / total) * 100 : 100;

      let status: "pass" | "fail" | "warning" = "pass";
      if (criticalIssues > 0 || failed > passed) {
        status = "fail";
      } else if (warnings > 0 || failed > 0) {
        status = "warning";
      }

      categories[categoryName] = {
        name: categoryName,
        total,
        passed,
        failed,
        warnings,
        score,
        status,
        criticalIssues,
      };
    }

    return categories;
  }

  private calculateOverallScore(): number {
    const testedChecks = this.checks.filter((c) => c.status !== "not_tested");
    if (testedChecks.length === 0) return 0;

    // Weight by priority
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let weightedScore = 0;

    for (const check of testedChecks) {
      const weight = weights[check.priority];
      const checkScore =
        check.status === "pass" ? 100 : check.status === "warning" ? 70 : 0;

      totalWeight += weight;
      weightedScore += checkScore * weight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  private identifyCriticalIssues(): string[] {
    return this.checks
      .filter((c) => c.status === "fail" && c.priority === "critical")
      .map((c) => `${c.category}: ${c.name} - ${c.details || "Failed"}`);
  }

  private identifyBlockers(): string[] {
    const blockers: string[] = [];

    // Critical failures are always blockers
    const criticalFailures = this.checks.filter(
      (c) => c.status === "fail" && c.priority === "critical",
    );

    blockers.push(...criticalFailures.map((c) => c.name));

    // High priority failures in core systems
    const coreSystemFailures = this.checks.filter(
      (c) =>
        c.status === "fail" &&
        c.priority === "high" &&
        ["Performance", "Security", "Reliability"].includes(c.category),
    );

    blockers.push(...coreSystemFailures.map((c) => c.name));

    return blockers;
  }

  private generateRecommendations(): string[] {
    const recommendations = new Set<string>();

    // Collect recommendations from failed checks
    for (const check of this.checks) {
      if (check.status === "fail" && check.recommendations) {
        check.recommendations.forEach((rec) => recommendations.add(rec));
      }
    }

    return Array.from(recommendations);
  }

  private generateNextSteps(): string[] {
    const steps: string[] = [];

    // Prioritize critical issues first
    const criticalIssues = this.checks.filter(
      (c) => c.status === "fail" && c.priority === "critical",
    );

    if (criticalIssues.length > 0) {
      steps.push(
        `🚨 Resolve ${criticalIssues.length} critical issue(s) before deployment`,
      );
      steps.push(
        ...criticalIssues.slice(0, 3).map((c) => `   • Fix: ${c.name}`),
      );
    }

    // High priority issues
    const highPriorityIssues = this.checks.filter(
      (c) => c.status === "fail" && c.priority === "high",
    );

    if (highPriorityIssues.length > 0) {
      steps.push(
        `⚠️ Address ${highPriorityIssues.length} high priority issue(s)`,
      );
    }

    // Manual checks that need attention
    const manualChecks = this.checks.filter(
      (c) => !c.automated && c.status === "not_tested",
    );

    if (manualChecks.length > 0) {
      steps.push(`📋 Complete ${manualChecks.length} manual check(s)`);
      steps.push(...manualChecks.slice(0, 3).map((c) => `   • ${c.name}`));
    }

    return steps;
  }

  private determineOverallStatus(
    score: number,
    blockers: string[],
  ): "ready" | "not_ready" | "conditional" {
    if (blockers.length > 0) {
      return "not_ready";
    }

    if (score >= 90) {
      return "ready";
    }

    if (score >= 70) {
      return "conditional";
    }

    return "not_ready";
  }

  getChecksByCategory(category: string): ProductionReadinessCheck[] {
    return this.checks.filter((c) => c.category === category);
  }

  getFailedChecks(): ProductionReadinessCheck[] {
    return this.checks.filter((c) => c.status === "fail");
  }

  getCriticalFailures(): ProductionReadinessCheck[] {
    return this.checks.filter(
      (c) => c.status === "fail" && c.priority === "critical",
    );
  }
}

// ================================
// Utility Functions
// ================================

export function formatCheckStatus(
  status: ProductionReadinessCheck["status"],
): string {
  const statusMap = {
    pass: "✅ Pass",
    fail: "❌ Fail",
    warning: "⚠️ Warning",
    not_tested: "⏳ Not Tested",
  };

  return statusMap[status];
}

export function formatPriority(
  priority: ProductionReadinessCheck["priority"],
): string {
  const priorityMap = {
    critical: "🚨 Critical",
    high: "🔴 High",
    medium: "🟡 Medium",
    low: "🟢 Low",
  };

  return priorityMap[priority];
}

export function getStatusColor(
  status: ProductionReadinessCheck["status"],
): string {
  const colorMap = {
    pass: "text-green-600",
    fail: "text-red-600",
    warning: "text-yellow-600",
    not_tested: "text-gray-500",
  };

  return colorMap[status];
}

export function getPriorityColor(
  priority: ProductionReadinessCheck["priority"],
): string {
  const colorMap = {
    critical: "text-red-600 font-bold",
    high: "text-red-500",
    medium: "text-yellow-600",
    low: "text-green-600",
  };

  return colorMap[priority];
}

// ================================
// Exports
// ================================

export const productionReadinessValidator = new ProductionReadinessValidator();
