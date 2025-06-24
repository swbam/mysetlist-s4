import { spotify } from '../spotify';
import { ticketmaster } from '../ticketmaster';
import { setlistfm } from '../setlistfm';

class ArtistSyncService {
  async syncPopularArtists(): Promise<void> {
    try {
      console.log('Starting artist sync...');
      // Sync popular artists from Spotify
      const popularArtists = await spotify.searchArtists('popular');
      console.log(`Synced ${popularArtists.length} popular artists`);
    } catch (error) {
      console.error('Artist sync failed:', error);
    }
  }
}

class ShowSyncService {
  async syncUpcomingShows(): Promise<void> {
    try {
      console.log('Starting show sync...');
      
      // Sync upcoming shows from Ticketmaster for major cities
      const majorCities = [
        'New York',
        'Los Angeles', 
        'Chicago',
        'Houston',
        'Phoenix'
      ];

      for (const city of majorCities) {
        try {
          const events = await ticketmaster.searchEvents({
            keyword: 'music',
            city,
            size: 20,
            startDateTime: new Date().toISOString(),
          });
          
          const showCount = events._embedded?.events?.length || 0;
          console.log(`Synced ${showCount} shows for ${city}`);
        } catch (error) {
          console.error(`Failed to sync shows for ${city}:`, error);
        }
      }
      
      console.log('Show sync completed');
    } catch (error) {
      console.error('Show sync failed:', error);
    }
  }
}

class SetlistSyncService {
  async syncRecentSetlists(): Promise<void> {
    try {
      console.log('Starting setlist sync...');
      
      // Get recent setlists from setlist.fm
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      try {
        const recentSetlists = await setlistfm.searchSetlists({
          date: lastWeek.toISOString().split('T')[0],
          p: 1
        });
        
        console.log(`Synced ${recentSetlists.setlist?.length || 0} recent setlists`);
      } catch (error) {
        console.error('Failed to sync recent setlists:', error);
      }
      
      console.log('Setlist sync completed');
    } catch (error) {
      console.error('Setlist sync failed:', error);
    }
  }
}

export class SyncScheduler {
  private artistSync: ArtistSyncService;
  private showSync: ShowSyncService;
  private setlistSync: SetlistSyncService;
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    this.artistSync = new ArtistSyncService();
    this.showSync = new ShowSyncService();
    this.setlistSync = new SetlistSyncService();
  }

  startScheduler(): void {
    // Sync upcoming shows every hour (3600000 ms)
    const showInterval = setInterval(async () => {
      console.log('Starting hourly show sync...');
      try {
        await this.showSync.syncUpcomingShows();
        console.log('Hourly show sync completed');
      } catch (error) {
        console.error('Hourly show sync failed:', error);
      }
    }, 3600000);

    // Sync popular artists daily (24 * 3600000 ms)
    const artistInterval = setInterval(async () => {
      console.log('Starting daily artist sync...');
      try {
        await this.artistSync.syncPopularArtists();
        console.log('Daily artist sync completed');
      } catch (error) {
        console.error('Daily artist sync failed:', error);
      }
    }, 24 * 3600000);

    // Sync recent setlists every 6 hours (6 * 3600000 ms)
    const setlistInterval = setInterval(async () => {
      console.log('Starting setlist sync...');
      try {
        await this.setlistSync.syncRecentSetlists();
        console.log('Setlist sync completed');
      } catch (error) {
        console.error('Setlist sync failed:', error);
      }
    }, 6 * 3600000);

    this.intervals.push(showInterval, artistInterval, setlistInterval);
    console.log('Sync scheduler started with all jobs');
  }

  stopScheduler(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('Sync scheduler stopped');
  }
}

// Export singleton instance
export const syncScheduler = new SyncScheduler(); 