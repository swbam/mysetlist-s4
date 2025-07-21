/**
 * Monitoring utilities for show lifecycle operations
 * Provides metrics and health checks for the show lifecycle endpoint
 */

import { db } from '@repo/database';
import { shows, setlists, artists, setlistSongs, votes } from '@repo/database';
import { eq, and, gte, count, sql } from 'drizzle-orm';

export interface ShowLifecycleMetrics {
  timestamp: string;
  shows: {
    total: number;
    upcoming: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    recentTransitions: number;
  };
  setlists: {
    total: number;
    locked: number;
    unlocked: number;
    recentlyLocked: number;
  };
  votes: {
    totalVotes: number;
    recentVotes: number;
    activeVoters: number;
  };
  health: {
    orphanedSetlists: number;
    showsNeedingAttention: number;
    dataConsistencyScore: number;
  };
}

/**
 * Collect comprehensive metrics about show lifecycle status
 */
export async function collectMetrics(): Promise<ShowLifecycleMetrics> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Show statistics
  const showStats = await db
    .select({
      status: shows.status,
      count: count(),
    })
    .from(shows)
    .groupBy(shows.status);

  const showsByStatus = showStats.reduce((acc, stat) => {
    acc[stat.status] = stat.count;
    return acc;
  }, {} as Record<string, number>);

  const totalShows = await db.select({ count: count() }).from(shows);

  // Recent show transitions (shows updated in last hour)
  const recentTransitions = await db
    .select({ count: count() })
    .from(shows)
    .where(gte(shows.updatedAt, oneHourAgo));

  // Setlist statistics
  const setlistStats = await db
    .select({
      isLocked: setlists.isLocked,
      count: count(),
    })
    .from(setlists)
    .groupBy(setlists.isLocked);

  const lockedSetlists = setlistStats.find(s => s.isLocked)?.count || 0;
  const unlockedSetlists = setlistStats.find(s => !s.isLocked)?.count || 0;
  const totalSetlists = lockedSetlists + unlockedSetlists;

  // Recently locked setlists
  const recentlyLocked = await db
    .select({ count: count() })
    .from(setlists)
    .where(
      and(
        eq(setlists.isLocked, true),
        gte(setlists.updatedAt, oneHourAgo)
      )
    );

  // Vote statistics
  const totalVotes = await db
    .select({ count: count() })
    .from(votes);

  const recentVotes = await db
    .select({ count: count() })
    .from(votes)
    .where(gte(votes.createdAt, oneDayAgo));

  const activeVoters = await db
    .select({ count: count() })
    .from(votes)
    .where(gte(votes.createdAt, oneDayAgo))
    .groupBy(votes.userId);

  // Health checks
  const orphanedSetlists = await db
    .select({ count: count() })
    .from(setlists)
    .where(
      sql`NOT EXISTS (
        SELECT 1 FROM ${shows} 
        WHERE ${shows.id} = ${setlists.showId}
      )`
    );

  // Shows that might need attention (ongoing for more than 8 hours)
  const showsNeedingAttention = await db
    .select({ count: count() })
    .from(shows)
    .where(
      and(
        eq(shows.status, 'ongoing'),
        sql`EXTRACT(EPOCH FROM (${now} - ${shows.updatedAt})) / 3600 > 8`
      )
    );

  // Data consistency score (0-100)
  const consistencyScore = Math.max(0, 100 - (orphanedSetlists[0]?.count || 0) * 10);

  return {
    timestamp: now.toISOString(),
    shows: {
      total: totalShows[0]?.count || 0,
      upcoming: showsByStatus.upcoming || 0,
      ongoing: showsByStatus.ongoing || 0,
      completed: showsByStatus.completed || 0,
      cancelled: showsByStatus.cancelled || 0,
      recentTransitions: recentTransitions[0]?.count || 0,
    },
    setlists: {
      total: totalSetlists,
      locked: lockedSetlists,
      unlocked: unlockedSetlists,
      recentlyLocked: recentlyLocked[0]?.count || 0,
    },
    votes: {
      totalVotes: totalVotes[0]?.count || 0,
      recentVotes: recentVotes[0]?.count || 0,
      activeVoters: activeVoters.length,
    },
    health: {
      orphanedSetlists: orphanedSetlists[0]?.count || 0,
      showsNeedingAttention: showsNeedingAttention[0]?.count || 0,
      dataConsistencyScore: consistencyScore,
    },
  };
}

/**
 * Check if the show lifecycle system is healthy
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  metrics: ShowLifecycleMetrics;
}> {
  const metrics = await collectMetrics();
  const issues: string[] = [];
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  // Check for critical issues
  if (metrics.health.orphanedSetlists > 10) {
    issues.push(`High number of orphaned setlists: ${metrics.health.orphanedSetlists}`);
    status = 'critical';
  }

  if (metrics.health.showsNeedingAttention > 5) {
    issues.push(`${metrics.health.showsNeedingAttention} shows have been ongoing for >8 hours`);
    status = status === 'critical' ? 'critical' : 'warning';
  }

  if (metrics.health.dataConsistencyScore < 80) {
    issues.push(`Data consistency score is low: ${metrics.health.dataConsistencyScore}`);
    status = status === 'critical' ? 'critical' : 'warning';
  }

  // Check for warning conditions
  if (metrics.shows.ongoing > 50) {
    issues.push(`High number of ongoing shows: ${metrics.shows.ongoing}`);
    status = status === 'critical' ? 'critical' : 'warning';
  }

  if (metrics.votes.recentVotes === 0 && metrics.shows.ongoing > 0) {
    issues.push('No recent voting activity despite ongoing shows');
    status = status === 'critical' ? 'critical' : 'warning';
  }

  return {
    status,
    issues,
    metrics,
  };
}

/**
 * Generate a summary report of show lifecycle operations
 */
export async function generateReport(): Promise<{
  summary: string;
  details: ShowLifecycleMetrics;
  recommendations: string[];
}> {
  const metrics = await collectMetrics();
  const recommendations: string[] = [];

  // Generate recommendations based on metrics
  if (metrics.health.orphanedSetlists > 0) {
    recommendations.push('Run cleanup operations to remove orphaned setlists');
  }

  if (metrics.shows.ongoing > metrics.shows.upcoming) {
    recommendations.push('Review ongoing shows - some may need status updates');
  }

  if (metrics.setlists.unlocked > metrics.setlists.locked * 2) {
    recommendations.push('Consider running setlist locking operations');
  }

  if (metrics.votes.activeVoters < 10 && metrics.shows.upcoming > 0) {
    recommendations.push('Low user engagement - consider user notification campaigns');
  }

  const summary = `
Show Lifecycle Report - ${new Date().toLocaleDateString()}

📊 Shows: ${metrics.shows.total} total (${metrics.shows.upcoming} upcoming, ${metrics.shows.ongoing} ongoing, ${metrics.shows.completed} completed)
🎵 Setlists: ${metrics.setlists.total} total (${metrics.setlists.locked} locked, ${metrics.setlists.unlocked} active)
🗳️  Votes: ${metrics.votes.totalVotes} total (${metrics.votes.recentVotes} recent, ${metrics.votes.activeVoters} active voters)
🏥 Health: ${metrics.health.dataConsistencyScore}% consistency score

Recent Activity:
- ${metrics.shows.recentTransitions} show status changes in last hour
- ${metrics.setlists.recentlyLocked} setlists locked in last hour
- ${metrics.votes.recentVotes} votes cast in last 24 hours
  `.trim();

  return {
    summary,
    details: metrics,
    recommendations,
  };
}

/**
 * Performance monitoring for the lifecycle endpoint
 */
export class LifecyclePerformanceMonitor {
  private static instance: LifecyclePerformanceMonitor;
  private operationTimes: Array<{ operation: string; duration: number; timestamp: Date }> = [];

  static getInstance(): LifecyclePerformanceMonitor {
    if (!LifecyclePerformanceMonitor.instance) {
      LifecyclePerformanceMonitor.instance = new LifecyclePerformanceMonitor();
    }
    return LifecyclePerformanceMonitor.instance;
  }

  recordOperation(operation: string, duration: number): void {
    this.operationTimes.push({
      operation,
      duration,
      timestamp: new Date(),
    });

    // Keep only last 100 operations
    if (this.operationTimes.length > 100) {
      this.operationTimes = this.operationTimes.slice(-100);
    }
  }

  getAverageTime(operation?: string): number {
    const relevantOps = operation
      ? this.operationTimes.filter(op => op.operation === operation)
      : this.operationTimes;

    if (relevantOps.length === 0) return 0;

    const total = relevantOps.reduce((sum, op) => sum + op.duration, 0);
    return Math.round(total / relevantOps.length);
  }

  getPerformanceReport(): {
    totalOperations: number;
    averageTime: number;
    operationBreakdown: Record<string, { count: number; averageTime: number }>;
  } {
    const breakdown: Record<string, { count: number; totalTime: number }> = {};

    this.operationTimes.forEach(op => {
      if (!breakdown[op.operation]) {
        breakdown[op.operation] = { count: 0, totalTime: 0 };
      }
      breakdown[op.operation].count++;
      breakdown[op.operation].totalTime += op.duration;
    });

    const operationBreakdown: Record<string, { count: number; averageTime: number }> = {};
    Object.entries(breakdown).forEach(([operation, data]) => {
      operationBreakdown[operation] = {
        count: data.count,
        averageTime: Math.round(data.totalTime / data.count),
      };
    });

    return {
      totalOperations: this.operationTimes.length,
      averageTime: this.getAverageTime(),
      operationBreakdown,
    };
  }
}

// Usage example:
/*
const monitor = LifecyclePerformanceMonitor.getInstance();

// In your endpoint:
const startTime = Date.now();
await updateShowStatuses();
monitor.recordOperation('updateShowStatuses', Date.now() - startTime);

// Get performance report:
const report = monitor.getPerformanceReport();
console.log('Performance metrics:', report);
*/