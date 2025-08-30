// MySetlist-S4 Traffic-Aware Scheduler
// File: apps/web/lib/services/traffic-aware-scheduler.ts
// Intelligent cron scheduling based on traffic patterns

import { db, sql } from '@repo/database';
import { cacheManager } from '../cache/cache-manager';
import { RedisClientFactory } from '../queues/redis-config';

export interface TrafficPattern {
  hour: number;
  dayOfWeek: number;
  avgRequestsPerMinute: number;
  avgResponseTime: number;
  errorRate: number;
  load: 'low' | 'medium' | 'high' | 'peak';
}

export interface ScheduleRecommendation {
  jobName: string;
  currentSchedule: string;
  recommendedSchedule: string;
  reason: string;
  expectedImprovement: number; // percentage
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  queueDepth: number;
  activeJobs: number;
  apiCallsPerMinute: number;
  averageResponseTime: number;
}

export class TrafficAwareScheduler {
  private static instance: TrafficAwareScheduler;
  private redis = RedisClientFactory.getClient('cache');
  
  // Default cron schedules
  private defaultSchedules: Record<string, string> = {
    'calculate-trending': '0 */6 * * *', // Every 6 hours
    'cleanup-imports': '0 2 * * *', // 2 AM daily
    'sync-data': '0 */4 * * *', // Every 4 hours
    'refresh-cache': '0 */2 * * *', // Every 2 hours
    'generate-reports': '0 0 * * *', // Midnight daily
  };

  // Traffic patterns by hour and day (0 = Sunday)
  private trafficPatterns: Map<string, TrafficPattern> = new Map();
  
  private constructor() {
    this.initializePatterns();
  }

  static getInstance(): TrafficAwareScheduler {
    if (!TrafficAwareScheduler.instance) {
      TrafficAwareScheduler.instance = new TrafficAwareScheduler();
    }
    return TrafficAwareScheduler.instance;
  }

  /**
   * Initialize with default traffic patterns
   */
  private initializePatterns(): void {
    // Typical web app traffic patterns
    const patterns = [
      // Weekday patterns
      { hour: 0, dayOfWeek: 1, load: 'low' },
      { hour: 1, dayOfWeek: 1, load: 'low' },
      { hour: 2, dayOfWeek: 1, load: 'low' },
      { hour: 3, dayOfWeek: 1, load: 'low' },
      { hour: 4, dayOfWeek: 1, load: 'low' },
      { hour: 5, dayOfWeek: 1, load: 'low' },
      { hour: 6, dayOfWeek: 1, load: 'medium' },
      { hour: 7, dayOfWeek: 1, load: 'medium' },
      { hour: 8, dayOfWeek: 1, load: 'high' },
      { hour: 9, dayOfWeek: 1, load: 'high' },
      { hour: 10, dayOfWeek: 1, load: 'high' },
      { hour: 11, dayOfWeek: 1, load: 'high' },
      { hour: 12, dayOfWeek: 1, load: 'peak' },
      { hour: 13, dayOfWeek: 1, load: 'peak' },
      { hour: 14, dayOfWeek: 1, load: 'high' },
      { hour: 15, dayOfWeek: 1, load: 'high' },
      { hour: 16, dayOfWeek: 1, load: 'high' },
      { hour: 17, dayOfWeek: 1, load: 'high' },
      { hour: 18, dayOfWeek: 1, load: 'peak' },
      { hour: 19, dayOfWeek: 1, load: 'peak' },
      { hour: 20, dayOfWeek: 1, load: 'high' },
      { hour: 21, dayOfWeek: 1, load: 'medium' },
      { hour: 22, dayOfWeek: 1, load: 'medium' },
      { hour: 23, dayOfWeek: 1, load: 'low' },
    ];

    // Apply pattern to all weekdays
    for (let day = 1; day <= 5; day++) {
      patterns.forEach(p => {
        this.trafficPatterns.set(
          `${day}-${p.hour}`,
          this.createPattern(p.hour, day, p.load)
        );
      });
    }

    // Weekend patterns (lower overall)
    for (let day = 0; day <= 6; day += 6) {
      for (let hour = 0; hour < 24; hour++) {
        const load = hour >= 10 && hour <= 22 ? 'medium' : 'low';
        this.trafficPatterns.set(
          `${day}-${hour}`,
          this.createPattern(hour, day, load)
        );
      }
    }
  }

  /**
   * Create a traffic pattern object
   */
  private createPattern(
    hour: number,
    dayOfWeek: number,
    load: 'low' | 'medium' | 'high' | 'peak'
  ): TrafficPattern {
    const loadMetrics: Record<'low'|'medium'|'high'|'peak', { requests: number; response: number; error: number }> = {
      low: { requests: 10, response: 100, error: 0.01 },
      medium: { requests: 50, response: 200, error: 0.02 },
      high: { requests: 100, response: 300, error: 0.03 },
      peak: { requests: 200, response: 500, error: 0.05 },
    };

    const metrics = loadMetrics[load as 'low'|'medium'|'high'|'peak'];
    
    return {
      hour,
      dayOfWeek,
      avgRequestsPerMinute: metrics.requests,
      avgResponseTime: metrics.response,
      errorRate: metrics.error,
      load,
    };
  }

  /**
   * Analyze traffic patterns from historical data
   */
  async analyzeTrafficPatterns(days: number = 30): Promise<void> {
    console.log(`📊 Analyzing traffic patterns for last ${days} days...`);

    try {
      // Get metrics from cron logs
      const metricsData = await db.execute(sql`
        WITH hourly_metrics AS (
          SELECT 
            EXTRACT(HOUR FROM _creationTime) as hour,
            EXTRACT(DOW FROM _creationTime) as day_of_week,
            COUNT(*) as job_count,
            AVG(execution_time_ms) as avg_execution_time,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as error_rate
          FROM cron_logs
          WHERE _creationTime >= NOW() - INTERVAL '${days} days'
          GROUP BY 
            EXTRACT(HOUR FROM _creationTime),
            EXTRACT(DOW FROM _creationTime)
        ),
        system_metrics AS (
          SELECT 
            EXTRACT(HOUR FROM _creationTime) as hour,
            EXTRACT(DOW FROM _creationTime) as day_of_week,
            AVG(execution_time_ms) as avg_time,
            AVG(memory_usage_mb) as avg_memory,
            AVG(cpu_percentage) as avg_cpu
          FROM cron_metrics
          WHERE _creationTime >= NOW() - INTERVAL '${days} days'
          GROUP BY 
            EXTRACT(HOUR FROM _creationTime),
            EXTRACT(DOW FROM _creationTime)
        )
        SELECT 
          hm.*,
          sm.avg_memory,
          sm.avg_cpu
        FROM hourly_metrics hm
        LEFT JOIN system_metrics sm 
          ON hm.hour = sm.hour 
          AND hm.day_of_week = sm.day_of_week
        ORDER BY hm.day_of_week, hm.hour
      `);

      // Update traffic patterns based on real data
      const metricRows: any[] = (metricsData as any).rows || [];
      for (const row of metricRows) {
        const load = this.calculateLoad(
          row.job_count,
          row.avg_execution_time,
          row.error_rate,
          row.avg_cpu
        );

        const pattern: TrafficPattern = {
          hour: row.hour,
          dayOfWeek: row.day_of_week,
          avgRequestsPerMinute: row.job_count / 60,
          avgResponseTime: row.avg_execution_time || 200,
          errorRate: row.error_rate || 0.01,
          load,
        };

        this.trafficPatterns.set(
          `${row.day_of_week}-${row.hour}`,
          pattern
        );
      }

      // Cache the patterns
      await cacheManager.set(
        'traffic-patterns:analyzed',
        Array.from(this.trafficPatterns.entries()),
        { namespace: 'system', ttl: 86400 } // 24 hours
      );

      console.log('✅ Traffic pattern analysis complete');

    } catch (error) {
      console.error('Failed to analyze traffic patterns:', error);
    }
  }

  /**
   * Calculate load level based on metrics
   */
  private calculateLoad(
    jobCount: number,
    avgTime: number,
    errorRate: number,
    cpuUsage: number
  ): 'low' | 'medium' | 'high' | 'peak' {
    const score = 
      (jobCount / 100) * 0.3 +
      (avgTime / 1000) * 0.3 +
      (errorRate * 100) * 0.2 +
      (cpuUsage / 100) * 0.2;

    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'high';
    return 'peak';
  }

  /**
   * Get optimal schedule recommendations
   */
  async getScheduleRecommendations(): Promise<ScheduleRecommendation[]> {
    const recommendations: ScheduleRecommendation[] = [];

    // Analyze each cron job
    for (const [jobName, currentSchedule] of Object.entries(this.defaultSchedules)) {
      const jobMetrics = await this.getJobMetrics(jobName);
      const optimalSchedule = await this.calculateOptimalSchedule(
        jobName,
        jobMetrics
      );

      if (optimalSchedule !== currentSchedule) {
        recommendations.push({
          jobName,
          currentSchedule,
          recommendedSchedule: optimalSchedule,
          reason: this.getRecommendationReason(jobName, jobMetrics),
          expectedImprovement: this.calculateImprovement(
            currentSchedule,
            optimalSchedule,
            jobMetrics
          ),
        });
      }
    }

    return recommendations;
  }

  /**
   * Get metrics for a specific job
   */
  private async getJobMetrics(jobName: string): Promise<{
    avgExecutionTime: number;
    errorRate: number;
    peakHours: number[];
    quietHours: number[];
  }> {
    const metrics = await db.execute(sql`
      WITH job_metrics AS (
        SELECT 
          EXTRACT(HOUR FROM _creationTime) as hour,
          AVG(execution_time_ms) as avg_time,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as error_rate,
          COUNT(*) as run_count
        FROM cron_logs
        WHERE job_name = ${jobName}
        AND _creationTime >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM _creationTime)
      )
      SELECT 
        AVG(avg_time) as overall_avg_time,
        AVG(error_rate) as overall_error_rate,
        ARRAY_AGG(hour ORDER BY run_count DESC) as hours_by_frequency
      FROM job_metrics
    `);

    const row = (metrics as any).rows?.[0] || {};
    const hoursByFreq = row?.hours_by_frequency || [];

    return {
      avgExecutionTime: row?.overall_avg_time || 200,
      errorRate: row?.overall_error_rate || 0.01,
      peakHours: hoursByFreq.slice(0, 6), // Top 6 hours
      quietHours: this.getQuietHours(),
    };
  }

  /**
   * Calculate optimal schedule for a job
   */
  private async calculateOptimalSchedule(
    jobName: string,
    metrics: any
  ): Promise<string> {
    // Job-specific scheduling rules
    const schedulingRules: Record<string, (metrics: any) => string> = {
      'calculate-trending': (m) => {
        // Run during quiet hours, but frequently enough for freshness
        const quietHours = this.getQuietHours();
        const interval = m.avgExecutionTime > 5000 ? 6 : 4; // hours
        return `0 */${interval} * * *`;
      },
      
      'cleanup-imports': (m) => {
        // Run once daily during quietest hour
        const quietestHour = this.getQuietestHour();
        return `0 ${quietestHour} * * *`;
      },
      
      'sync-data': (m) => {
        // Balance between data freshness and system load
        const peakHours = this.getPeakHours();
        const nonPeakSchedule = this.generateNonPeakSchedule(peakHours, 4);
        return nonPeakSchedule;
      },
      
      'refresh-cache': (m) => {
        // Run before peak hours to warm cache
        const prePeakHours = [6, 11, 17]; // Before morning, lunch, evening peaks
        return `0 ${prePeakHours.join(',')} * * *`;
      },
      
      'generate-reports': (m) => {
        // Run during lowest traffic period
        const quietestHour = this.getQuietestHour();
        return `0 ${quietestHour} * * *`;
      },
    };

    const rule = schedulingRules[jobName];
    if (rule) {
      return rule(metrics);
    }

    // Default: run during quiet hours
    const quietHours = this.getQuietHours();
    const hour = quietHours[Math.floor(Math.random() * quietHours.length)] ?? 3;
    return `0 ${hour} * * *`;
  }

  /**
   * Get quiet hours (low traffic)
   */
  private getQuietHours(): number[] {
    const quietHours: number[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      let isQuiet = true;
      
      // Check all days of week
      for (let day = 0; day < 7; day++) {
        const pattern = this.trafficPatterns.get(`${day}-${hour}`);
        if (pattern && pattern.load !== 'low') {
          isQuiet = false;
          break;
        }
      }
      
      if (isQuiet) {
        quietHours.push(hour);
      }
    }

    return quietHours.length > 0 ? quietHours : [0, 1, 2, 3, 4, 5]; // Fallback
  }

  /**
   * Get peak hours (high/peak traffic)
   */
  private getPeakHours(): number[] {
    const peakHours: Set<number> = new Set();
    
    for (const [key, pattern] of this.trafficPatterns) {
      if (pattern.load === 'high' || pattern.load === 'peak') {
        peakHours.add(pattern.hour);
      }
    }

    return Array.from(peakHours).sort((a, b) => a - b);
  }

  /**
   * Get quietest hour of the day
   */
  private getQuietestHour(): number {
    let quietestHour = 3; // Default
    let lowestLoad = Infinity;

    for (let hour = 0; hour < 24; hour++) {
      let totalLoad = 0;
      
      for (let day = 0; day < 7; day++) {
        const pattern = this.trafficPatterns.get(`${day}-${hour}`);
        if (pattern) {
          totalLoad += pattern.avgRequestsPerMinute;
        }
      }

      if (totalLoad < lowestLoad) {
        lowestLoad = totalLoad;
        quietestHour = hour;
      }
    }

    return quietestHour;
  }

  /**
   * Generate schedule that avoids peak hours
   */
  private generateNonPeakSchedule(peakHours: number[], intervalHours: number): string {
    const availableHours: number[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      if (!peakHours.includes(hour)) {
        availableHours.push(hour);
      }
    }

    // Select hours with proper spacing
    const selectedHours: number[] = [];
    let lastHour = -intervalHours;
    
    for (const hour of availableHours) {
      if (hour - lastHour >= intervalHours) {
        selectedHours.push(hour);
        lastHour = hour;
        
        if (selectedHours.length >= Math.floor(24 / intervalHours)) {
          break;
        }
      }
    }

    if (selectedHours.length === 0) {
      return `0 */${intervalHours} * * *`; // Fallback
    }

    return `0 ${selectedHours.join(',')} * * *`;
  }

  /**
   * Get recommendation reason
   */
  private getRecommendationReason(jobName: string, metrics: any): string {
    const reasons: Record<string, string> = {
      'calculate-trending': 'Optimized for low-traffic periods while maintaining data freshness',
      'cleanup-imports': 'Scheduled during lowest system utilization period',
      'sync-data': 'Balanced to avoid peak hours while ensuring timely updates',
      'refresh-cache': 'Timed to warm cache before traffic peaks',
      'generate-reports': 'Moved to optimal low-traffic window',
    };

    return reasons[jobName] || 'Optimized based on traffic patterns';
  }

  /**
   * Calculate expected improvement
   */
  private calculateImprovement(
    currentSchedule: string,
    newSchedule: string,
    metrics: any
  ): number {
    // Simplified calculation based on moving from peak to quiet hours
    const currentHours = this.extractHoursFromCron(currentSchedule);
    const newHours = this.extractHoursFromCron(newSchedule);

    let currentLoad = 0;
    let newLoad = 0;

    for (const hour of currentHours) {
      const pattern = this.trafficPatterns.get(`1-${hour}`); // Use Monday as baseline
      if (pattern) {
        currentLoad += pattern.avgRequestsPerMinute;
      }
    }

    for (const hour of newHours) {
      const pattern = this.trafficPatterns.get(`1-${hour}`);
      if (pattern) {
        newLoad += pattern.avgRequestsPerMinute;
      }
    }

    if (currentLoad === 0) return 0;
    
    const improvement = ((currentLoad - newLoad) / currentLoad) * 100;
    return Math.max(0, Math.min(100, improvement));
  }

  /**
   * Extract hours from cron expression
   */
  private extractHoursFromCron(cronExpression: string): number[] {
    const parts = cronExpression.split(' ');
    const hourPart: string | undefined = parts[1];

    if (hourPart === '*') {
      return Array.from({ length: 24 }, (_, i) => i);
    }

    if (hourPart && hourPart.includes('/')) {
      const [, interval] = hourPart.split('/');
      const hours: number[] = [];
      const step = parseInt(interval || '1');
      for (let h = 0; h < 24; h += step) {
        hours.push(h);
      }
      return hours;
    }

    if (hourPart && hourPart.includes(',')) {
      return hourPart.split(',').map(h => parseInt(h));
    }

    return [parseInt(hourPart || '0')];
  }

  /**
   * Get current system metrics
   */
  async getCurrentMetrics(): Promise<SystemMetrics> {
    try {
      // Get Redis queue depths
      const { queueManager } = await import('../queues/queue-manager');
      const stats = (await queueManager.getAllStats()) as any[];
      
      let totalQueueDepth = 0;
      let activeJobs = 0;
      
      for (const s of stats) {
        totalQueueDepth += (s.waiting || 0) + (s.delayed || 0);
        activeJobs += (s.active || 0);
      }

      // Get recent cron metrics
      const recentMetrics = await db.execute(sql`
        SELECT 
          AVG(execution_time_ms) as avg_execution_time,
          AVG(memory_usage_mb) as avg_memory,
          AVG(cpu_percentage) as avg_cpu,
          COUNT(*) as job_count
        FROM cron_metrics
        WHERE _creationTime >= NOW() - INTERVAL '5 minutes'
      `);

      const metrics = (recentMetrics as any).rows?.[0] || {};

      return {
        cpuUsage: metrics.avg_cpu || 0,
        memoryUsage: metrics.avg_memory || 0,
        queueDepth: totalQueueDepth,
        activeJobs,
        apiCallsPerMinute: metrics.job_count ? (metrics.job_count / 5) : 0,
        averageResponseTime: metrics.avg_execution_time || 0,
      };

    } catch (error) {
      console.error('Failed to get current metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        queueDepth: 0,
        activeJobs: 0,
        apiCallsPerMinute: 0,
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Should delay job based on current load
   */
  async shouldDelayJob(jobName: string): Promise<{
    delay: boolean;
    delayMinutes: number;
    reason: string;
  }> {
    const metrics = await this.getCurrentMetrics();
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    const pattern = this.trafficPatterns.get(`${day}-${hour}`);
    const load: 'low' | 'medium' | 'high' | 'peak' = (pattern?.load as any) || 'medium';

    // Decision logic
    if (load === 'peak' && metrics.cpuUsage > 80) {
      return {
        delay: true,
        delayMinutes: 30,
        reason: 'System under peak load',
      };
    }

    if (metrics.queueDepth > 1000) {
      return {
        delay: true,
        delayMinutes: 15,
        reason: 'Queue backlog detected',
      };
    }

    if (metrics.averageResponseTime > 5000) {
      return {
        delay: true,
        delayMinutes: 10,
        reason: 'High response times detected',
      };
    }

    return {
      delay: false,
      delayMinutes: 0,
      reason: 'System load acceptable',
    };
  }

  /**
   * Apply schedule recommendations
   */
  async applyRecommendations(
    recommendations: ScheduleRecommendation[]
  ): Promise<{ applied: number; failed: number }> {
    let applied = 0;
    let failed = 0;

    for (const rec of recommendations) {
      try {
        // In production, this would update the actual cron configuration
        await cacheManager.set(
          `cron-schedule:${rec.jobName}`,
          rec.recommendedSchedule,
          { namespace: 'system', ttl: 0 } // Persistent
        );

        console.log(`✅ Applied new schedule for ${rec.jobName}: ${rec.recommendedSchedule}`);
        applied++;

      } catch (error) {
        console.error(`Failed to apply schedule for ${rec.jobName}:`, error);
        failed++;
      }
    }

    return { applied, failed };
  }
}

// Export singleton instance
export const trafficAwareScheduler = TrafficAwareScheduler.getInstance();
