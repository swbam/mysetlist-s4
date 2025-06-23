// Offline sync utilities for managing data when offline

interface QueuedAction {
  id: string;
  type: 'vote' | 'attendance' | 'setlist';
  action: string;
  data: any;
  timestamp: number;
}

class OfflineSync {
  private readonly STORAGE_KEY = 'theset-offline-queue';
  private queue: QueuedAction[] = [];

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.syncQueue();
    });
  }

  // Add action to queue
  public addToQueue(type: QueuedAction['type'], action: string, data: any) {
    const queuedAction: QueuedAction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      action,
      data,
      timestamp: Date.now(),
    };

    this.queue.push(queuedAction);
    this.saveQueue();

    // Try to sync if online
    if (navigator.onLine) {
      this.syncQueue();
    }

    return queuedAction.id;
  }

  // Sync queued actions
  public async syncQueue() {
    if (!navigator.onLine || this.queue.length === 0) {
      return;
    }

    const itemsToSync = [...this.queue];
    
    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        
        // Remove from queue on success
        this.queue = this.queue.filter(q => q.id !== item.id);
        this.saveQueue();
      } catch (error) {
        console.error(`Failed to sync ${item.type}:`, error);
        // Keep in queue for retry
      }
    }

    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      
      if (this.queue.some(item => item.type === 'vote')) {
        await (registration as any).sync?.register('sync-votes');
      }
      
      if (this.queue.some(item => item.type === 'attendance')) {
        await (registration as any).sync?.register('sync-attendance');
      }
    }
  }

  private async syncItem(item: QueuedAction) {
    const endpoint = this.getEndpoint(item);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
        'X-Original-Timestamp': item.timestamp.toString(),
      },
      body: JSON.stringify({
        action: item.action,
        data: item.data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    return response.json();
  }

  private getEndpoint(item: QueuedAction): string {
    switch (item.type) {
      case 'vote':
        return '/api/votes';
      case 'attendance':
        return '/api/attendance';
      case 'setlist':
        return '/api/setlists';
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  // Get queue status
  public getQueueStatus() {
    return {
      count: this.queue.length,
      items: this.queue,
      oldestItem: this.queue[0]?.timestamp,
    };
  }

  // Clear queue
  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

// Export singleton instance
export const offlineSync = new OfflineSync();

// Helper functions for common actions
export function queueVote(showId: string, songId: string, vote: 'up' | 'down') {
  return offlineSync.addToQueue('vote', 'vote', {
    showId,
    songId,
    vote,
  });
}

export function queueAttendance(showId: string, status: 'going' | 'interested' | 'not_going') {
  return offlineSync.addToQueue('attendance', 'update', {
    showId,
    status,
  });
}

export function queueSetlistUpdate(setlistId: string, updates: any) {
  return offlineSync.addToQueue('setlist', 'update', {
    setlistId,
    updates,
  });
}