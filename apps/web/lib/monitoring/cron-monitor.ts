/**
 * Cron Job Monitoring and Alerting System
 * Provides comprehensive monitoring, logging, and alerting for cron jobs
 */

import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { performanceMonitor } from "../optimizations/performance-config";

// Monitoring Configuration
const MONITORING_CONFIG = {
  // Alert thresholds
  ERROR_RATE_THRESHOLD: 0.1, // 10% error rate
  RESPONSE_TIME_THRESHOLD: 300000, // 5 minutes
  CONSECUTIVE_FAILURES: 3, // Alert after 3 consecutive failures

  // Retention periods
  LOG_RETENTION_DAYS: 30,
  METRIC_RETENTION_DAYS: 7,

  // Health check intervals
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  DEAD_MAN_SWITCH_TIMEOUT: 7200000, // 2 hours
} as const;

interface CronJobMetric {
  jobName: string;
  executionTime: number;
  status: "success" | "failed" | "timeout";
  timestamp: Date;
  details?: any;
  memoryUsage?: number;
  errorMessage?: string;
}

interface CronJobHealth {
  jobName: string;
  isHealthy: boolean;
  lastExecution: Date | null;
  consecutiveFailures: number;
  averageExecutionTime: number;
  errorRate: number;
  nextExpectedRun?: Date;
}

interface AlertRule {
  id: string;
  jobName: string;
  condition:
    | "error_rate"
    | "execution_time"
    | "consecutive_failures"
    | "missed_execution";
  threshold: number;
  enabled: boolean;
  notificationChannels: string[];
}

class CronJobMonitor {
  private static instance: CronJobMonitor;
  private metrics: Map<string, CronJobMetric[]> = new Map();
  private healthStatus: Map<string, CronJobHealth> = new Map();
  private alertRules: AlertRule[] = [];
  private isMonitoring = false;

  static getInstance(): CronJobMonitor {
    if (!CronJobMonitor.instance) {
      CronJobMonitor.instance = new CronJobMonitor();
    }
    return CronJobMonitor.instance;
  }

  constructor() {
    this.initializeDefaultAlertRules();
  }

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: "high-error-rate",
        jobName: "*", // All jobs
        condition: "error_rate",
        threshold: MONITORING_CONFIG.ERROR_RATE_THRESHOLD,
        enabled: true,
        notificationChannels: ["email", "slack"],
      },
      {
        id: "long-execution-time",
        jobName: "*",
        condition: "execution_time",
        threshold: MONITORING_CONFIG.RESPONSE_TIME_THRESHOLD,
        enabled: true,
        notificationChannels: ["slack"],
      },
      {
        id: "consecutive-failures",
        jobName: "*",
        condition: "consecutive_failures",
        threshold: MONITORING_CONFIG.CONSECUTIVE_FAILURES,
        enabled: true,
        notificationChannels: ["email", "slack", "pagerduty"],
      },
    ];
  }

  /**
   * Record a cron job execution
   */
  async recordExecution(
    jobName: string,
    status: "success" | "failed" | "timeout",
    executionTime: number,
    details?: any,
    errorMessage?: string,
  ): Promise<void> {
    const metric: CronJobMetric = {
      jobName,
      executionTime,
      status,
      timestamp: new Date(),
      details,
      memoryUsage: this.getCurrentMemoryUsage(),
      errorMessage,
    };

    // Store in memory for quick access
    const jobMetrics = this.metrics.get(jobName) || [];
    jobMetrics.push(metric);

    // Keep only recent metrics in memory
    const cutoff = new Date(
      Date.now() -
        MONITORING_CONFIG.METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const recentMetrics = jobMetrics.filter((m) => m.timestamp > cutoff);
    this.metrics.set(jobName, recentMetrics);

    // Update health status
    await this.updateHealthStatus(jobName, metric);

    // Check alert rules
    await this.checkAlertRules(jobName);

    // Persist to database
    await this.persistMetric(metric);

    // Record in performance monitor
    performanceMonitor.recordMetric({
      responseTime: executionTime,
      errorRate: status === "failed" ? 1 : 0,
    });
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private async updateHealthStatus(
    jobName: string,
    metric: CronJobMetric,
  ): Promise<void> {
    const health = this.healthStatus.get(jobName) || {
      jobName,
      isHealthy: true,
      lastExecution: null,
      consecutiveFailures: 0,
      averageExecutionTime: 0,
      errorRate: 0,
    };

    // Update basic info
    health.lastExecution = metric.timestamp;

    // Update consecutive failures
    if (metric.status === "failed") {
      health.consecutiveFailures++;
    } else {
      health.consecutiveFailures = 0;
    }

    // Calculate metrics from recent data
    const recentMetrics = this.metrics.get(jobName) || [];
    if (recentMetrics.length > 0) {
      const totalTime = recentMetrics.reduce(
        (sum, m) => sum + m.executionTime,
        0,
      );
      health.averageExecutionTime = totalTime / recentMetrics.length;

      const failedCount = recentMetrics.filter(
        (m) => m.status === "failed",
      ).length;
      health.errorRate = failedCount / recentMetrics.length;
    }

    // Determine overall health
    health.isHealthy =
      health.consecutiveFailures < MONITORING_CONFIG.CONSECUTIVE_FAILURES &&
      health.errorRate < MONITORING_CONFIG.ERROR_RATE_THRESHOLD &&
      health.averageExecutionTime < MONITORING_CONFIG.RESPONSE_TIME_THRESHOLD;

    this.healthStatus.set(jobName, health);
  }

  private async checkAlertRules(jobName: string): Promise<void> {
    const health = this.healthStatus.get(jobName);
    if (!health) return;

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      if (rule.jobName !== "*" && rule.jobName !== jobName) continue;

      let shouldAlert = false;
      let alertMessage = "";

      switch (rule.condition) {
        case "error_rate":
          if (health.errorRate > rule.threshold) {
            shouldAlert = true;
            alertMessage = `High error rate for ${jobName}: ${(health.errorRate * 100).toFixed(1)}%`;
          }
          break;

        case "execution_time":
          if (health.averageExecutionTime > rule.threshold) {
            shouldAlert = true;
            alertMessage = `Long execution time for ${jobName}: ${(health.averageExecutionTime / 1000).toFixed(1)}s`;
          }
          break;

        case "consecutive_failures":
          if (health.consecutiveFailures >= rule.threshold) {
            shouldAlert = true;
            alertMessage = `${health.consecutiveFailures} consecutive failures for ${jobName}`;
          }
          break;
      }

      if (shouldAlert) {
        await this.sendAlert(rule, alertMessage, health);
      }
    }
  }

  private async sendAlert(
    rule: AlertRule,
    message: string,
    health: CronJobHealth,
  ): Promise<void> {
    console.error(`🚨 CRON ALERT: ${message}`);

    // Log alert to database
    try {
      await db.execute(sql`
        INSERT INTO cron_alerts (job_name, rule_id, message, severity, health_data, created_at)
        VALUES (${health.jobName}, ${rule.id}, ${message}, 'high', ${JSON.stringify(health)}, NOW())
      `);
    } catch (error) {
      console.error("Failed to log alert:", error);
    }

    // Send notifications (implementation depends on your notification system)
    for (const channel of rule.notificationChannels) {
      await this.sendNotification(channel, message, health);
    }
  }

  private async sendNotification(
    channel: string,
    message: string,
    health: CronJobHealth,
  ): Promise<void> {
    // Implementation would depend on your notification system
    // For now, just log
    console.log(`Sending ${channel} notification: ${message}`);

    switch (channel) {
      case "email":
        // Send email notification
        break;
      case "slack":
        // Send Slack notification
        break;
      case "pagerduty":
        // Send PagerDuty alert
        break;
    }
  }

  private async persistMetric(metric: CronJobMetric): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO cron_metrics (
          job_name, 
          execution_time_ms, 
          status, 
          details, 
          memory_usage_bytes,
          error_message,
          created_at
        )
        VALUES (
          ${metric.jobName},
          ${metric.executionTime},
          ${metric.status},
          ${JSON.stringify(metric.details)},
          ${metric.memoryUsage},
          ${metric.errorMessage},
          ${metric.timestamp.toISOString()}
        )
      `);
    } catch (error) {
      console.error("Failed to persist cron metric:", error);
    }
  }

  /**
   * Get health status for all jobs or a specific job
   */
  getHealthStatus(jobName?: string): CronJobHealth | CronJobHealth[] {
    if (jobName) {
      return (
        this.healthStatus.get(jobName) || {
          jobName,
          isHealthy: false,
          lastExecution: null,
          consecutiveFailures: 0,
          averageExecutionTime: 0,
          errorRate: 0,
        }
      );
    }

    return Array.from(this.healthStatus.values());
  }

  /**
   * Get metrics for a specific job
   */
  getMetrics(jobName: string, limit = 100): CronJobMetric[] {
    const metrics = this.metrics.get(jobName) || [];
    return metrics.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    isHealthy: boolean;
    totalJobs: number;
    healthyJobs: number;
    unhealthyJobs: number;
    averageErrorRate: number;
    lastCheckTime: Date;
  } {
    const allHealth = Array.from(this.healthStatus.values());
    const healthyJobs = allHealth.filter((h) => h.isHealthy).length;
    const totalErrorRate = allHealth.reduce((sum, h) => sum + h.errorRate, 0);

    return {
      isHealthy: allHealth.length > 0 && healthyJobs === allHealth.length,
      totalJobs: allHealth.length,
      healthyJobs,
      unhealthyJobs: allHealth.length - healthyJobs,
      averageErrorRate:
        allHealth.length > 0 ? totalErrorRate / allHealth.length : 0,
      lastCheckTime: new Date(),
    };
  }

  /**
   * Start monitoring (dead man's switch)
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Start health check interval
    setInterval(() => {
      this.performHealthCheck();
    }, MONITORING_CONFIG.HEALTH_CHECK_INTERVAL);

    // Start cleanup interval
    setInterval(
      () => {
        this.cleanupOldData();
      },
      24 * 60 * 60 * 1000,
    ); // Daily cleanup

    console.log("Cron job monitoring started");
  }

  private async performHealthCheck(): Promise<void> {
    // Check for missed executions (dead man's switch)
    const now = new Date();

    for (const [jobName, health] of this.healthStatus.entries()) {
      if (!health.lastExecution) continue;

      const timeSinceLastRun = now.getTime() - health.lastExecution.getTime();

      // Check if job should have run by now (based on expected schedule)
      const expectedInterval = this.getExpectedInterval(jobName);
      if (expectedInterval && timeSinceLastRun > expectedInterval * 1.5) {
        await this.sendAlert(
          {
            id: "missed-execution",
            jobName,
            condition: "missed_execution",
            threshold: expectedInterval,
            enabled: true,
            notificationChannels: ["email", "slack"],
          },
          `Missed execution for ${jobName}. Last run: ${health.lastExecution.toISOString()}`,
          health,
        );
      }
    }
  }

  private getExpectedInterval(jobName: string): number | null {
    // Define expected intervals for each cron job
    const intervals: Record<string, number> = {
      "update-active-artists": 6 * 60 * 60 * 1000, // 6 hours
      "trending-artist-sync": 24 * 60 * 60 * 1000, // 24 hours
      "complete-catalog-sync": 7 * 24 * 60 * 60 * 1000, // 7 days
      "calculate-trending": 60 * 60 * 1000, // 1 hour
    };

    return intervals[jobName] || null;
  }

  private async cleanupOldData(): Promise<void> {
    try {
      // Clean up old metrics from database
      await db.execute(sql`
        DELETE FROM cron_metrics 
        WHERE created_at < NOW() - INTERVAL '${MONITORING_CONFIG.LOG_RETENTION_DAYS} days'
      `);

      // Clean up old alerts
      await db.execute(sql`
        DELETE FROM cron_alerts 
        WHERE created_at < NOW() - INTERVAL '${MONITORING_CONFIG.LOG_RETENTION_DAYS} days'
      `);

      console.log("Cleaned up old monitoring data");
    } catch (error) {
      console.error("Failed to cleanup old monitoring data:", error);
    }
  }

  /**
   * Add or update an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    const existingIndex = this.alertRules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      this.alertRules[existingIndex] = rule;
    } else {
      this.alertRules.push(rule);
    }
  }

  /**
   * Get current alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Generate monitoring report
   */
  async generateReport(): Promise<{
    systemHealth: any;
    jobStatuses: CronJobHealth[];
    recentAlerts: any[];
    performanceMetrics: any;
  }> {
    // Get recent alerts from database
    const recentAlerts = await db.execute(sql`
      SELECT job_name, rule_id, message, severity, created_at
      FROM cron_alerts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return {
      systemHealth: this.getSystemHealth(),
      jobStatuses: this.getHealthStatus() as CronJobHealth[],
      recentAlerts: Array.isArray(recentAlerts) ? recentAlerts : [],
      performanceMetrics: performanceMonitor.getAverageMetrics(),
    };
  }
}

// Export singleton instance
export const cronMonitor = CronJobMonitor.getInstance();

// Helper function to wrap cron job execution with monitoring
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  jobName: string,
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);

      const executionTime = Date.now() - startTime;
      await cronMonitor.recordExecution(jobName, "success", executionTime, {
        result,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await cronMonitor.recordExecution(
        jobName,
        "failed",
        executionTime,
        null,
        errorMessage,
      );

      throw error;
    }
  }) as T;
}

// Auto-start monitoring in production
if (process.env['NODE_ENV'] === "production") {
  cronMonitor.startMonitoring();
}

export default cronMonitor;
export type { CronJobMetric, CronJobHealth, AlertRule };
