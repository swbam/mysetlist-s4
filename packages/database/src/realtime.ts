import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface RealtimeSubscriptionOptions {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onError?: (error: any) => void;
}

export interface SetlistUpdatePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
  errors?: any;
  table: string;
  schema: string;
}

export interface VoteUpdatePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
  errors?: any;
  table: string;
  schema: string;
}

export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to setlist updates for a specific show
   */
  subscribeToSetlistUpdates(
    showId: string,
    callback: (payload: SetlistUpdatePayload) => void
  ): RealtimeChannel {
    const channelName = `setlist:${showId}`;

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'setlist_songs',
          filter: `setlist_id=in.(select id from setlists where show_id=eq.${showId})`,
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            errors: payload.errors,
            table: payload.table,
            schema: payload.schema,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'setlists',
          filter: `show_id=eq.${showId}`,
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            errors: payload.errors,
            table: payload.table,
            schema: payload.schema,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to setlist updates for show ${showId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(
            `❌ Failed to subscribe to setlist updates for show ${showId}`
          );
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to vote updates for a specific setlist song
   */
  subscribeToVoteUpdates(
    setlistSongId: string,
    callback: (payload: VoteUpdatePayload) => void
  ): RealtimeChannel {
    const channelName = `votes:${setlistSongId}`;

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `setlist_song_id=eq.${setlistSongId}`,
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            errors: payload.errors,
            table: payload.table,
            schema: payload.schema,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'setlist_songs',
          filter: `id=eq.${setlistSongId}`,
        },
        (payload: any) => {
          // Listen for vote count updates on the setlist song itself
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            errors: payload.errors,
            table: payload.table,
            schema: payload.schema,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(
            `✅ Subscribed to vote updates for setlist song ${setlistSongId}`
          );
        } else if (status === 'CHANNEL_ERROR') {
          console.error(
            `❌ Failed to subscribe to vote updates for setlist song ${setlistSongId}`
          );
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to show status updates (upcoming, ongoing, completed)
   */
  subscribeToShowUpdates(
    showId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    const channelName = `show:${showId}`;

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shows',
          filter: `id=eq.${showId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to show updates for ${showId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to show updates for ${showId}`);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to live show attendance updates
   */
  subscribeToAttendanceUpdates(
    showId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    const channelName = `attendance:${showId}`;

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_show_attendance',
          filter: `show_id=eq.${showId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to attendance updates for show ${showId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(
            `❌ Failed to subscribe to attendance updates for show ${showId}`
          );
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to artist follower updates
   */
  subscribeToArtistFollowers(
    artistId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    const channelName = `artist_followers:${artistId}`;

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows_artists',
          filter: `artist_id=eq.${artistId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(
            `✅ Subscribed to follower updates for artist ${artistId}`
          );
        } else if (status === 'CHANNEL_ERROR') {
          console.error(
            `❌ Failed to subscribe to follower updates for artist ${artistId}`
          );
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to trending updates (for live trending data)
   */
  subscribeToTrendingUpdates(
    callback: (payload: any) => void
  ): RealtimeChannel {
    const channelName = 'trending_updates';

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shows',
          filter: 'trending_score.gt.0',
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'artists',
          filter: 'trending_score.gt.0',
        },
        callback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to trending updates`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to trending updates`);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to multiple setlist songs for batch vote updates
   */
  subscribeToSetlistVotes(
    setlistId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    const channelName = `setlist_votes:${setlistId}`;

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `setlist_song_id=in.(select id from setlist_songs where setlist_id=eq.${setlistId})`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'setlist_songs',
          filter: `setlist_id=eq.${setlistId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to setlist votes for ${setlistId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(
            `❌ Failed to subscribe to setlist votes for ${setlistId}`
          );
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to global activity feed
   */
  subscribeToGlobalActivity(callback: (payload: any) => void): RealtimeChannel {
    const channelName = 'global_activity';

    // Remove existing channel if it exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'setlists',
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_show_attendance',
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_follows_artists',
        },
        callback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to global activity feed`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to global activity feed`);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`🔌 Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((_, channelName) => {
      this.unsubscribe(channelName);
    });
    console.log(`🔌 Unsubscribed from all realtime channels`);
  }

  /**
   * Get list of active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    return supabase.realtime.isConnected() ? 'connected' : 'disconnected';
  }

  /**
   * Reconnect to Supabase realtime
   */
  reconnect(): void {
    supabase.realtime.disconnect();
    supabase.realtime.connect();
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// Export individual subscription functions for convenience
export const subscribeToSetlistUpdates = (
  showId: string,
  callback: (payload: SetlistUpdatePayload) => void
) => realtimeManager.subscribeToSetlistUpdates(showId, callback);

export const subscribeToVoteUpdates = (
  setlistSongId: string,
  callback: (payload: VoteUpdatePayload) => void
) => realtimeManager.subscribeToVoteUpdates(setlistSongId, callback);

export const subscribeToShowUpdates = (
  showId: string,
  callback: (payload: any) => void
) => realtimeManager.subscribeToShowUpdates(showId, callback);

export const subscribeToAttendanceUpdates = (
  showId: string,
  callback: (payload: any) => void
) => realtimeManager.subscribeToAttendanceUpdates(showId, callback);

export const subscribeToArtistFollowers = (
  artistId: string,
  callback: (payload: any) => void
) => realtimeManager.subscribeToArtistFollowers(artistId, callback);

export const subscribeToTrendingUpdates = (callback: (payload: any) => void) =>
  realtimeManager.subscribeToTrendingUpdates(callback);

export const subscribeToSetlistVotes = (
  setlistId: string,
  callback: (payload: any) => void
) => realtimeManager.subscribeToSetlistVotes(setlistId, callback);

export const subscribeToGlobalActivity = (callback: (payload: any) => void) =>
  realtimeManager.subscribeToGlobalActivity(callback);
