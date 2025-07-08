import { ArtistSyncService } from './artist-sync';
import { SetlistSyncService } from './setlist-sync';
import { ShowSyncService } from './show-sync';
import { VenueSyncService } from './venue-sync';

export interface SyncOptions {
  artists?: boolean;
  venues?: boolean;
  shows?: boolean;
  setlists?: boolean;
  city?: string;
  stateCode?: string;
  artistName?: string;
  startDate?: string;
  endDate?: string;
}

export interface SyncJob {
  id: string;
  type: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  startTime: Date;
  endTime?: Date;
  progress?: number;
  error?: string;
  result?: any;
}

export interface JobStats {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  lastSyncTime?: Date;
  errors: string[];
}

export class SyncScheduler {
  private artistSync: ArtistSyncService;
  private venueSync: VenueSyncService;
  private showSync: ShowSyncService;
  private setlistSync: SetlistSyncService;
  private jobs: Map<string, SyncJob> = new Map();
  private lastSyncTime?: Date;
  private currentErrors: string[] = [];

  constructor() {
    this.artistSync = new ArtistSyncService();
    this.venueSync = new VenueSyncService();
    this.showSync = new ShowSyncService();
    this.setlistSync = new SetlistSyncService();
  }

  async runInitialSync(): Promise<void> {
    console.log('Starting initial sync...');

    try {
      // 1. Sync popular artists
      console.log('Syncing popular artists...');
      await this.artistSync.syncPopularArtists();

      // 2. Sync major venues
      console.log('Syncing major venues...');
      await this.venueSync.syncMajorVenues();

      // 3. Sync upcoming shows in major cities
      console.log('Syncing upcoming shows...');
      const majorCities = [
        { city: 'New York', stateCode: 'NY' },
        { city: 'Los Angeles', stateCode: 'CA' },
        { city: 'Chicago', stateCode: 'IL' },
        { city: 'San Francisco', stateCode: 'CA' },
        { city: 'Austin', stateCode: 'TX' },
        { city: 'Seattle', stateCode: 'WA' },
        { city: 'Denver', stateCode: 'CO' },
        { city: 'Nashville', stateCode: 'TN' },
        { city: 'Portland', stateCode: 'OR' },
        { city: 'Atlanta', stateCode: 'GA' },
      ];

      for (const { city, stateCode } of majorCities) {
        await this.showSync.syncUpcomingShows({
          city,
          stateCode,
          classificationName: 'Music',
        });
        // Rate limit between cities
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log('Initial sync completed!');
    } catch (error) {
      console.error('Initial sync failed:', error);
      throw error;
    }
  }

  async runDailySync(): Promise<void> {
    console.log('Starting daily sync...');

    try {
      // Sync upcoming shows for the next 30 days
      const startDateTime = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const endDateTime = endDate.toISOString();

      await this.showSync.syncUpcomingShows({
        classificationName: 'Music',
        startDateTime,
        endDateTime,
      });

      console.log('Daily sync completed!');
    } catch (error) {
      console.error('Daily sync failed:', error);
      throw error;
    }
  }

  async syncByLocation(city: string, stateCode?: string): Promise<void> {
    console.log(
      `Syncing data for ${city}${stateCode ? `, ${stateCode}` : ''}...`
    );

    try {
      // 1. Sync venues in the city
      await this.venueSync.syncVenuesByCity(city, stateCode);

      // 2. Sync upcoming shows in the city
      await this.showSync.syncUpcomingShows({
        city,
        stateCode,
        classificationName: 'Music',
      });

      console.log(`Location sync completed for ${city}!`);
    } catch (error) {
      console.error(`Location sync failed for ${city}:`, error);
      throw error;
    }
  }

  async syncArtistData(artistName: string): Promise<void> {
    console.log(`Syncing data for artist: ${artistName}...`);

    try {
      // 1. Sync artist from Spotify
      const spotifyClient = this.artistSync['spotifyClient'];
      await spotifyClient.authenticate();
      const searchResult = await spotifyClient.searchArtists(artistName, 1);

      if (searchResult.artists.items.length > 0) {
        const artist = searchResult.artists.items[0];
        await this.artistSync.syncArtist(artist.id);

        // 2. Sync historical setlists
        await this.showSync.syncHistoricalSetlists(artistName);

        // 3. Sync recent setlists with full data
        await this.setlistSync.syncRecentSetlists(artistName, 10);
      } else {
        console.warn(`Artist not found on Spotify: ${artistName}`);
      }

      console.log(`Artist sync completed for ${artistName}!`);
    } catch (error) {
      console.error(`Artist sync failed for ${artistName}:`, error);
      throw error;
    }
  }

  async syncCustom(options: SyncOptions): Promise<void> {
    console.log('Starting custom sync with options:', options);

    try {
      if (options.artists) {
        await this.artistSync.syncPopularArtists();
      }

      if (options.venues && options.city) {
        await this.venueSync.syncVenuesByCity(options.city, options.stateCode);
      } else if (options.venues) {
        await this.venueSync.syncMajorVenues();
      }

      if (options.shows) {
        await this.showSync.syncUpcomingShows({
          city: options.city,
          stateCode: options.stateCode,
          startDateTime: options.startDate,
          endDateTime: options.endDate,
          classificationName: 'Music',
        });
      }

      if (options.setlists && options.artistName) {
        await this.setlistSync.syncRecentSetlists(options.artistName);
      }

      console.log('Custom sync completed!');
    } catch (error) {
      console.error('Custom sync failed:', error);
      throw error;
    }
  }

  // Utility method to sync data for a specific show
  async syncShowDetails(showId: string): Promise<void> {
    console.log(`Syncing details for show: ${showId}...`);

    try {
      await this.setlistSync.syncSetlistByShowId(showId);
      console.log(`Show details sync completed for ${showId}!`);
    } catch (error) {
      console.error(`Show details sync failed for ${showId}:`, error);
      throw error;
    }
  }

  // Job management methods
  private createJob(type: string): SyncJob {
    const id = Date.now().toString();
    const job: SyncJob = {
      id,
      type,
      status: 'pending',
      startTime: new Date(),
    };
    this.jobs.set(id, job);
    return job;
  }

  private startJob(job: SyncJob): void {
    job.status = 'running';
    job.startTime = new Date();
  }

  private completeJob(job: SyncJob, result?: any): void {
    job.status = 'completed';
    job.endTime = new Date();
    job.result = result;
    this.lastSyncTime = new Date();
  }

  private failJob(job: SyncJob, error: string): void {
    job.status = 'failed';
    job.endTime = new Date();
    job.error = error;
    if (!this.currentErrors.includes(error)) {
      this.currentErrors.push(error);
    }
  }

  getJob(jobId: string): SyncJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): SyncJob[] {
    return Array.from(this.jobs.values());
  }

  getJobStats(): JobStats {
    const jobs = Array.from(this.jobs.values());
    return {
      totalJobs: jobs.length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
      pendingJobs: jobs.filter((j) => j.status === 'pending').length,
    };
  }

  getHealthStatus(): HealthStatus {
    const failedJobs = this.getAllJobs().filter((j) => j.status === 'failed');
    const recentErrors = failedJobs
      .slice(-5)
      .map((j) => j.error)
      .filter(Boolean) as string[];

    return {
      isHealthy: failedJobs.length === 0 || failedJobs.length < 3,
      lastSyncTime: this.lastSyncTime,
      errors: [...new Set([...this.currentErrors, ...recentErrors])].slice(-10),
    };
  }

  // Clear old jobs to prevent memory leaks
  clearOldJobs(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.endTime && job.endTime < oneDayAgo) {
        this.jobs.delete(jobId);
      }
    }
  }

  // Scheduler control methods
  async startScheduler(): Promise<void> {
    console.log('Starting sync scheduler...');
    // Create a job for the initial sync
    const job = this.createJob('initial-sync');
    this.startJob(job);

    try {
      await this.runInitialSync();
      this.completeJob(job);
    } catch (error) {
      this.failJob(
        job,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async stopScheduler(): Promise<void> {
    console.log('Stopping sync scheduler...');
    // Mark all running jobs as stopped
    for (const job of this.jobs.values()) {
      if (job.status === 'running') {
        job.status = 'failed';
        job.error = 'Scheduler stopped';
        job.endTime = new Date();
      }
    }
  }

  async runJobNow(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'running') {
      throw new Error(`Job ${jobId} is already running`);
    }

    this.startJob(job);

    try {
      // Run the appropriate sync based on job type
      switch (job.type) {
        case 'initial-sync':
          await this.runInitialSync();
          break;
        case 'daily-sync':
          await this.runDailySync();
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      this.completeJob(job);
    } catch (error) {
      this.failJob(
        job,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  enableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'failed') {
      job.status = 'pending';
      job.error = undefined;
    }
    return true;
  }

  disableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'running') {
      job.status = 'failed';
      job.error = 'Job disabled';
      job.endTime = new Date();
    } else if (job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Job disabled';
    }
    return true;
  }

  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  async scheduleJob(type: string, schedule: string): Promise<SyncJob> {
    const job = this.createJob(type);
    // In a real implementation, this would set up a cron job
    // For now, we'll just create the job
    console.log(
      `Scheduled job ${job.id} of type ${type} with schedule ${schedule}`
    );
    return job;
  }

  updateJobSchedule(jobId: string, schedule: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // In a real implementation, this would update the cron schedule
    // For now, we'll just log the update
    console.log(`Updated job ${jobId} schedule to ${schedule}`);
    return true;
  }
}
