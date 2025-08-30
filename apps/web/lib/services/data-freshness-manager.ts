// MySetlist-S4 Data Freshness Manager
// File: apps/web/lib/services/data-freshness-manager.ts
// Intelligent sync scheduling based on data freshness requirements

import { db, sql } from '@repo/database';
import { Queue } from 'bullmq';
import { cacheManager } from '../cache/cache-manager';
import { queueManager } from '../queues/queue-manager';

export interface FreshnessRule {
  entityType: 'artist' | 'show' | 'venue' | 'setlist';
  condition: (entity: any) => boolean;
  maxAge: number; // seconds
  priority: number;
  syncType: string;
  description: string;
}

export interface FreshnessCheck {
  entityType: string;
  entityId: string;
  lastSyncTime: Date | null;
  dataAge: number; // seconds
  requiresSync: boolean;
  priority: number;
  reason: string;
}

export interface FreshnessReport {
  totalEntities: number;
  staleEntities: number;
  scheduledSyncs: number;
  byType: Record<string, {
    total: number;
    stale: number;
    scheduled: number;
  }>;
  timestamp: Date;
}

export class DataFreshnessManager {
  private static instance: DataFreshnessManager;
  private queues: Map<string, Queue> = new Map();
  
  // Freshness rules define when data needs updating
  private freshnessRules: FreshnessRule[] = [
    // Critical: Trending artists need fresh data
    {
      entityType: 'artist',
      condition: (artist) => artist.trendingScore > 50,
      maxAge: 21600, // 6 hours
      priority: 9,
      syncType: 'spotify-sync',
      description: 'Trending artists need frequent updates',
    },
    
    // High: Artists with upcoming shows
    {
      entityType: 'artist',
      condition: (artist) => artist.upcomingShows_count > 0,
      maxAge: 43200, // 12 hours
      priority: 8,
      syncType: 'full-sync',
      description: 'Artists with upcoming shows need current data',
    },
    
    // High: Shows happening this week
    {
      entityType: 'show',
      condition: (show) => {
        if (!show.date) return false;
        const daysUntilShow = (show.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilShow >= 0 && daysUntilShow <= 7;
      },
      maxAge: 14400, // 4 hours
      priority: 8,
      syncType: 'ticketmaster-sync',
      description: 'Shows happening soon need frequent updates',
    },
    
    // Medium: Popular artists (high follower count)
    {
      entityType: 'artist',
      condition: (artist) => artist.followerCount > 1000,
      maxAge: 86400, // 24 hours
      priority: 6,
      syncType: 'spotify-sync',
      description: 'Popular artists need daily updates',
    },
    
    // Medium: Active venues (many shows)
    {
      entityType: 'venue',
      condition: (venue) => venue.show_count > 10,
      maxAge: 172800, // 48 hours
      priority: 5,
      syncType: 'venue-sync',
      description: 'Active venues need regular updates',
    },
    
    // Low: General artist refresh
    {
      entityType: 'artist',
      condition: () => true,
      maxAge: 604800, // 7 days
      priority: 3,
      syncType: 'spotify-sync',
      description: 'All artists need weekly refresh',
    },
    
    // Low: General show refresh
    {
      entityType: 'show',
      condition: (show) => show.status === 'upcoming',
      maxAge: 259200, // 3 days
      priority: 3,
      syncType: 'ticketmaster-sync',
      description: 'Upcoming shows need periodic refresh',
    },
  ];

  private constructor() {
    this.initializeQueues();
  }

  static getInstance(): DataFreshnessManager {
    if (!DataFreshnessManager.instance) {
      DataFreshnessManager.instance = new DataFreshnessManager();
    }
    return DataFreshnessManager.instance;
  }

  private initializeQueues(): void {
    const qm: any = queueManager as any;
    if (typeof qm.getQueue !== 'function') return;
    this.queues.set('spotify-sync', qm.getQueue('spotify-sync'));
    this.queues.set('ticketmaster-sync', qm.getQueue('ticketmaster-sync'));
    this.queues.set('venue-sync', qm.getQueue('venue-sync'));
    this.queues.set('full-sync', qm.getQueue('scheduled-sync'));
  }

  /**
   * Check freshness of all entities and schedule syncs as needed
   */
  async checkAndScheduleSyncs(): Promise<FreshnessReport> {
    console.log('🔍 Starting data freshness check...');
    const startTime = Date.now();
    
    const report: FreshnessReport = {
      totalEntities: 0,
      staleEntities: 0,
      scheduledSyncs: 0,
      byType: {},
      timestamp: new Date(),
    };

    // Check each entity type
    await this.checkArtistsFreshness(report);
    await this.checkShowsFreshness(report);
    await this.checkVenuesFreshness(report);

    const duration = Date.now() - startTime;
    console.log(`✅ Freshness check completed in ${duration}ms`);
    console.log(`📊 Report: ${report.staleEntities}/${report.totalEntities} entities stale, ${report.scheduledSyncs} syncs scheduled`);

    // Cache the report
    await cacheManager.set(
      'freshness-report:latest',
      report,
      { namespace: 'system', ttl: 3600 }
    );

    return report;
  }

  /**
   * Check freshness of artists
   */
  private async checkArtistsFreshness(report: FreshnessReport): Promise<void> {
    const rules = this.freshnessRules.filter(r => r.entityType === 'artist');
    
    // Get artists with their last sync time
    const artistsData = await db.execute(sql`
      SELECT 
        a.*,
        sj.completed_at as last_sync_time,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(sj.completed_at, a._creationTime))) as seconds_since_sync,
        COUNT(DISTINCT s.id) as upcomingShows_count,
        COUNT(DISTINCT uf.userId) as followerCount
      FROM artists a
      LEFT JOIN LATERAL (
        SELECT completed_at 
        FROM sync_jobs 
        WHERE entity_type = 'artist' 
        AND entity_id = a.id 
        AND status = 'completed'
        ORDER BY completed_at DESC 
        LIMIT 1
      ) sj ON true
      LEFT JOIN shows s ON s.artistId = a.id AND s.date >= NOW()
      LEFT JOIN user_follows_artists uf ON uf.artistId = a.id
      GROUP BY a.id, sj.completed_at
    `);

    report.byType['artist'] = { total: 0, stale: 0, scheduled: 0 } as any;
    const batchedSyncs: Array<{ artistId: string; priority: number; syncType: string }> = [];

    const artistRows: any[] = (artistsData as any).rows || [];
    for (const row of artistRows) {
      report.totalEntities++;
      (report.byType['artist'] as any).total++;

      const freshness = await this.checkEntityFreshness(
        'artist',
        row,
        rules,
        row.seconds_since_sync || Infinity
      );

      if (freshness.requiresSync) {
        report.staleEntities++;
        (report.byType['artist'] as any).stale++;
        
        batchedSyncs.push({
          artistId: row.id,
          priority: freshness.priority,
          syncType: freshness.reason.includes('spotify') ? 'spotify-sync' : 'full-sync',
        });
      }
    }

    // Schedule syncs in batches
    if (batchedSyncs.length > 0) {
      const scheduled = await this.scheduleBatchedSyncs(batchedSyncs);
      report.scheduledSyncs += scheduled;
      (report.byType['artist'] as any).scheduled = scheduled;
    }
  }

  /**
   * Check freshness of shows
   */
  private async checkShowsFreshness(report: FreshnessReport): Promise<void> {
    const rules = this.freshnessRules.filter(r => r.entityType === 'show');
    
    // Get shows with their last sync time
    const showsData = await db.execute(sql`
      SELECT 
        s.*,
        sj.completed_at as last_sync_time,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(sj.completed_at, s._creationTime))) as seconds_since_sync
      FROM shows s
      LEFT JOIN LATERAL (
        SELECT completed_at 
        FROM sync_jobs 
        WHERE entity_type = 'show' 
        AND entity_id = s.id 
        AND status = 'completed'
        ORDER BY completed_at DESC 
        LIMIT 1
      ) sj ON true
      WHERE s.status IN ('upcoming', 'ongoing')
    `);

    report.byType['show'] = { total: 0, stale: 0, scheduled: 0 } as any;
    const batchedSyncs: Array<{ showId: string; priority: number }> = [];

    const showRows: any[] = (showsData as any).rows || [];
    for (const row of showRows) {
      report.totalEntities++;
      (report.byType['show'] as any).total++;

      const freshness = await this.checkEntityFreshness(
        'show',
        row,
        rules,
        row.seconds_since_sync || Infinity
      );

      if (freshness.requiresSync) {
        report.staleEntities++;
        (report.byType['show'] as any).stale++;
        
        batchedSyncs.push({
          showId: row.id,
          priority: freshness.priority,
        });
      }
    }

    // Schedule syncs
    if (batchedSyncs.length > 0) {
      const scheduled = await this.scheduleShowSyncs(batchedSyncs);
      report.scheduledSyncs += scheduled;
      (report.byType['show'] as any).scheduled = scheduled;
    }
  }

  /**
   * Check freshness of venues
   */
  private async checkVenuesFreshness(report: FreshnessReport): Promise<void> {
    const rules = this.freshnessRules.filter(r => r.entityType === 'venue');
    
    // Get venues with their last sync time
    const venuesData = await db.execute(sql`
      SELECT 
        v.*,
        sj.completed_at as last_sync_time,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(sj.completed_at, v._creationTime))) as seconds_since_sync,
        COUNT(DISTINCT s.id) as show_count
      FROM venues v
      LEFT JOIN LATERAL (
        SELECT completed_at 
        FROM sync_jobs 
        WHERE entity_type = 'venue' 
        AND entity_id = v.id 
        AND status = 'completed'
        ORDER BY completed_at DESC 
        LIMIT 1
      ) sj ON true
      LEFT JOIN shows s ON s.venueId = v.id
      GROUP BY v.id, sj.completed_at
    `);

    report.byType['venue'] = { total: 0, stale: 0, scheduled: 0 } as any;
    const batchedSyncs: Array<{ venueId: string; priority: number }> = [];

    const venueRows: any[] = (venuesData as any).rows || [];
    for (const row of venueRows) {
      report.totalEntities++;
      (report.byType['venue'] as any).total++;

      const freshness = await this.checkEntityFreshness(
        'venue',
        row,
        rules,
        row.seconds_since_sync || Infinity
      );

      if (freshness.requiresSync) {
        report.staleEntities++;
        (report.byType['venue'] as any).stale++;
        
        batchedSyncs.push({
          venueId: row.id,
          priority: freshness.priority,
        });
      }
    }

    // Schedule syncs
    if (batchedSyncs.length > 0) {
      const scheduled = await this.scheduleVenueSyncs(batchedSyncs);
      report.scheduledSyncs += scheduled;
      (report.byType['venue'] as any).scheduled = scheduled;
    }
  }

  /**
   * Check if a specific entity needs syncing based on rules
   */
  private checkEntityFreshness(
    entityType: string,
    entity: any,
    rules: FreshnessRule[],
    dataAge: number
  ): FreshnessCheck {
    let requiresSync = false;
    let highestPriority = 0;
    let reason = '';

    for (const rule of rules) {
      if (rule.condition(entity) && dataAge > rule.maxAge) {
        requiresSync = true;
        if (rule.priority > highestPriority) {
          highestPriority = rule.priority;
          reason = rule.description;
        }
      }
    }

    return {
      entityType,
      entityId: entity.id,
      lastSyncTime: entity.last_sync_time,
      dataAge,
      requiresSync,
      priority: highestPriority,
      reason,
    };
  }

  /**
   * Schedule batched artist syncs
   */
  private async scheduleBatchedSyncs(
    syncs: Array<{ artistId: string; priority: number; syncType: string }>
  ): Promise<number> {
    // Sort by priority (highest first)
    syncs.sort((a, b) => b.priority - a.priority);

    // Limit to top priority items
    const toSchedule = syncs.slice(0, 100); // Max 100 per run
    let scheduled = 0;

    for (const sync of toSchedule) {
      try {
        // Check if already in queue
        const existingJob = await this.checkExistingJob(sync.artistId, sync.syncType);
        if (existingJob) {
          continue;
        }

        const queue = this.queues.get(sync.syncType);
        if (!queue) {
          console.error(`Queue not found: ${sync.syncType}`);
          continue;
        }

        await queue.add(
          'sync',
          {
            artistId: sync.artistId,
            priority: sync.priority,
            reason: 'freshness-check',
            scheduledAt: new Date(),
          },
          {
            priority: sync.priority,
            delay: this.calculateDelay(sync.priority),
          }
        );

        scheduled++;
      } catch (error) {
        console.error(`Failed to schedule sync for artist ${sync.artistId}:`, error);
      }
    }

    return scheduled;
  }

  /**
   * Schedule show syncs
   */
  private async scheduleShowSyncs(
    syncs: Array<{ showId: string; priority: number }>
  ): Promise<number> {
    const queue = this.queues.get('ticketmaster-sync');
    if (!queue) {
      console.error('Ticketmaster sync queue not found');
      return 0;
    }

    syncs.sort((a, b) => b.priority - a.priority);
    const toSchedule = syncs.slice(0, 50);
    let scheduled = 0;

    for (const sync of toSchedule) {
      try {
        await queue.add(
          'sync-show',
          {
            showId: sync.showId,
            priority: sync.priority,
            reason: 'freshness-check',
          },
          {
            priority: sync.priority,
            delay: this.calculateDelay(sync.priority),
          }
        );
        scheduled++;
      } catch (error) {
        console.error(`Failed to schedule sync for show ${sync.showId}:`, error);
      }
    }

    return scheduled;
  }

  /**
   * Schedule venue syncs
   */
  private async scheduleVenueSyncs(
    syncs: Array<{ venueId: string; priority: number }>
  ): Promise<number> {
    const queue = this.queues.get('venue-sync');
    if (!queue) {
      console.error('Venue sync queue not found');
      return 0;
    }

    syncs.sort((a, b) => b.priority - a.priority);
    const toSchedule = syncs.slice(0, 30);
    let scheduled = 0;

    for (const sync of toSchedule) {
      try {
        await queue.add(
          'sync-venue',
          {
            venueId: sync.venueId,
            priority: sync.priority,
            reason: 'freshness-check',
          },
          {
            priority: sync.priority,
            delay: this.calculateDelay(sync.priority),
          }
        );
        scheduled++;
      } catch (error) {
        console.error(`Failed to schedule sync for venue ${sync.venueId}:`, error);
      }
    }

    return scheduled;
  }

  /**
   * Check if a job already exists in the queue
   */
  private async checkExistingJob(entityId: string, queueName: string): Promise<boolean> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) return false;

      // Check waiting and active jobs
      const [waiting, active] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
      ]);

      const allJobs = [...waiting, ...active];
      return allJobs.some(job => 
        job.data.artistId === entityId || 
        job.data.entityId === entityId
      );
    } catch (error) {
      console.error('Failed to check existing jobs:', error);
      return false;
    }
  }

  /**
   * Calculate delay based on priority
   */
  private calculateDelay(priority: number): number {
    // Higher priority = less delay
    if (priority >= 9) return 0; // Immediate
    if (priority >= 7) return 60000; // 1 minute
    if (priority >= 5) return 300000; // 5 minutes
    if (priority >= 3) return 900000; // 15 minutes
    return 1800000; // 30 minutes
  }

  /**
   * Get freshness statistics
   */
  async getFreshnessStatistics(): Promise<{
    lastCheck: Date | null;
    report: FreshnessReport | null;
    rules: Array<{
      description: string;
      entityType: string;
      maxAge: string;
      priority: number;
    }>;
  }> {
    // Get cached report
    const report = await cacheManager.get<FreshnessReport>(
      'freshness-report:latest',
      undefined,
      { namespace: 'system' }
    );

    // Format rules for display
    const formattedRules = this.freshnessRules.map(rule => ({
      description: rule.description,
      entityType: rule.entityType,
      maxAge: this.formatDuration(rule.maxAge),
      priority: rule.priority,
    }));

    return {
      lastCheck: report?.timestamp || null,
      report,
      rules: formattedRules,
    };
  }

  /**
   * Force refresh for a specific entity
   */
  async forceRefresh(
    entityType: 'artist' | 'show' | 'venue',
    entityId: string,
    priority: number = 10
  ): Promise<boolean> {
    try {
      let queue: Queue | undefined;
      let jobData: any;

      switch (entityType) {
        case 'artist':
          queue = this.queues.get('spotify-sync');
          jobData = {
            artistId: entityId,
            priority,
            reason: 'force-refresh',
            forceRefresh: true,
          };
          break;
          
        case 'show':
          queue = this.queues.get('ticketmaster-sync');
          jobData = {
            showId: entityId,
            priority,
            reason: 'force-refresh',
            forceRefresh: true,
          };
          break;
          
        case 'venue':
          queue = this.queues.get('venue-sync');
          jobData = {
            venueId: entityId,
            priority,
            reason: 'force-refresh',
            forceRefresh: true,
          };
          break;
      }

      if (!queue) {
        console.error(`Queue not found for entity type: ${entityType}`);
        return false;
      }

      await queue.add('sync', jobData, {
        priority,
        removeOnComplete: true,
        removeOnFail: false,
      });

      console.log(`✅ Force refresh scheduled for ${entityType} ${entityId}`);
      return true;

    } catch (error) {
      console.error(`Failed to force refresh ${entityType} ${entityId}:`, error);
      return false;
    }
  }

  /**
   * Format duration for display
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${Math.floor(seconds / 60)} minutes`;
  }
}

// Export singleton instance
export const dataFreshnessManager = DataFreshnessManager.getInstance();
