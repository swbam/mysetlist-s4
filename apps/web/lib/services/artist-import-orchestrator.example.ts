/**
 * ArtistImportOrchestrator Usage Examples
 * 
 * This file demonstrates how to use the ArtistImportOrchestrator service
 * in different scenarios with proper error handling and progress tracking.
 */

import { ArtistImportOrchestrator, type ImportProgress, type ImportResult } from './artist-import-orchestrator';

// ================================
// Basic Usage Example
// ================================

export async function basicImportExample(tmAttractionId: string): Promise<ImportResult> {
  const orchestrator = new ArtistImportOrchestrator();
  
  try {
    const result = await orchestrator.importArtist(tmAttractionId);
    console.log('Import completed successfully:', result);
    return result;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// ================================
// Advanced Usage with Progress Tracking
// ================================

export async function importWithProgressTracking(
  tmAttractionId: string,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const orchestrator = new ArtistImportOrchestrator(async (progress) => {
    // Log progress to console
    console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`);
    
    // Call user-provided callback
    onProgress(progress);
    
    // You could also:
    // - Send progress updates to a WebSocket
    // - Update a database record
    // - Emit events to a message queue
    // - Update a Redis cache for real-time UI updates
  });

  return await orchestrator.importArtist(tmAttractionId);
}

// ================================
// API Route Integration Example
// ================================

export async function apiRouteExample(tmAttractionId: string, userId?: string) {
  // This would be used in an API route like /api/artists/import
  
  const orchestrator = new ArtistImportOrchestrator(async (progress) => {
    // Update import status in database for real-time tracking
    console.log(`Import ${progress.artistId}: ${progress.stage} (${progress.progress}%)`);
    
    // Optional: Send real-time updates via WebSocket or Server-Sent Events
    if (progress.artistId && userId) {
      // Example: notifyUser(userId, progress);
    }
  });

  try {
    const result = await orchestrator.importArtist(tmAttractionId);
    
    // Log successful import
    console.log(`Successfully imported artist ${result.artistId} (${result.slug})`);
    console.log(`Performance: Phase 1: ${result.phaseTimings.phase1Duration}ms, ` +
                `Phase 2: ${result.phaseTimings.phase2Duration}ms, ` +
                `Phase 3: ${result.phaseTimings.phase3Duration}ms`);
    
    return {
      success: true,
      artistId: result.artistId,
      slug: result.slug,
      totalImportTime: result.importDuration,
      stats: {
        songs: result.totalSongs,
        shows: result.totalShows,
        venues: result.totalVenues
      }
    };
    
  } catch (error) {
    console.error('Artist import failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stage: 'failed'
    };
  }
}

// ================================
// Batch Import Example
// ================================

export async function batchImportExample(tmAttractionIds: string[]): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  const MAX_CONCURRENT = 3; // Limit concurrent imports to avoid overwhelming APIs
  
  for (let i = 0; i < tmAttractionIds.length; i += MAX_CONCURRENT) {
    const batch = tmAttractionIds.slice(i, i + MAX_CONCURRENT);
    
    const batchPromises = batch.map(async (tmAttractionId) => {
      const orchestrator = new ArtistImportOrchestrator(async (progress) => {
        console.log(`[Batch] ${tmAttractionId}: ${progress.stage} (${progress.progress}%)`);
      });
      
      try {
        return await orchestrator.importArtist(tmAttractionId);
      } catch (error) {
        console.error(`Batch import failed for ${tmAttractionId}:`, error);
        throw error;
      }
    });
    
    try {
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch item failed:', result.reason);
        }
      }
      
      // Rate limiting between batches
      if (i + MAX_CONCURRENT < tmAttractionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
      
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
  
  return results;
}

// ================================
// Performance Monitoring Example
// ================================

export async function performanceMonitoringExample(tmAttractionId: string): Promise<ImportResult> {
  const startTime = Date.now();
  
  const orchestrator = new ArtistImportOrchestrator(async (progress) => {
    const elapsed = Date.now() - startTime;
    
    console.log(`[PERF] ${progress.stage}: ${progress.progress}% in ${elapsed}ms`);
    
    // Monitor for performance issues
    if (progress.stage === 'syncing-identifiers' && elapsed > 5000) {
      console.warn('Phase 1 taking longer than expected (>5s)');
    }
    
    if (progress.stage === 'importing-shows' && elapsed > 20000) {
      console.warn('Phase 2 taking longer than expected (>20s)');
    }
    
    if (progress.stage === 'importing-songs' && elapsed > 120000) {
      console.warn('Phase 3 taking longer than expected (>2m)');
    }
  });

  const result = await orchestrator.importArtist(tmAttractionId);
  
  // Log final performance metrics
  console.log('=== PERFORMANCE SUMMARY ===');
  console.log(`Total Time: ${result.importDuration}ms`);
  console.log(`Phase 1 (Instant Load): ${result.phaseTimings.phase1Duration}ms`);
  console.log(`Phase 2 (Shows): ${result.phaseTimings.phase2Duration}ms`);
  console.log(`Phase 3 (Songs): ${result.phaseTimings.phase3Duration}ms`);
  console.log(`Content: ${result.totalSongs} songs, ${result.totalShows} shows, ${result.totalVenues} venues`);
  
  return result;
}

// ================================
// Error Recovery Example
// ================================

export async function errorRecoveryExample(tmAttractionId: string): Promise<ImportResult> {
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      const orchestrator = new ArtistImportOrchestrator(async (progress) => {
        console.log(`[Attempt ${attempt}] ${progress.stage}: ${progress.progress}%`);
      });
      
      const result = await orchestrator.importArtist(tmAttractionId);
      console.log(`Import succeeded on attempt ${attempt}`);
      return result;
      
    } catch (error) {
      console.error(`Import attempt ${attempt} failed:`, error);
      
      if (attempt === maxAttempts) {
        console.error('All import attempts failed');
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('This should never be reached');
}

// ================================
// Integration with Existing Systems
// ================================

export class ImportJobManager {
  private activeImports = new Map<string, ArtistImportOrchestrator>();
  
  async startImport(tmAttractionId: string, userId?: string): Promise<string> {
    // Check if import is already running
    if (this.activeImports.has(tmAttractionId)) {
      throw new Error(`Import already in progress for ${tmAttractionId}`);
    }
    
    const orchestrator = new ArtistImportOrchestrator(async (progress) => {
      // Update progress in database/cache
      await this.updateImportProgress(tmAttractionId, progress, userId);
    });
    
    this.activeImports.set(tmAttractionId, orchestrator);
    
    // Start import asynchronously
    orchestrator.importArtist(tmAttractionId)
      .then((result) => {
        console.log(`Import completed for ${tmAttractionId}:`, result);
        this.activeImports.delete(tmAttractionId);
      })
      .catch((error) => {
        console.error(`Import failed for ${tmAttractionId}:`, error);
        this.activeImports.delete(tmAttractionId);
      });
    
    return tmAttractionId;
  }
  
  getActiveImports(): string[] {
    return Array.from(this.activeImports.keys());
  }
  
  isImportActive(tmAttractionId: string): boolean {
    return this.activeImports.has(tmAttractionId);
  }
  
  private async updateImportProgress(
    tmAttractionId: string,
    progress: ImportProgress,
    userId?: string
  ): Promise<void> {
    // Implementation would depend on your notification system
    // Examples:
    // - Update Redis cache for real-time UI
    // - Send WebSocket message
    // - Update database record
    // - Emit to message queue
    console.log(`Progress update for ${tmAttractionId}:`, progress);
  }
}

// ================================
// Usage in Next.js API Route
// ================================

export async function nextjsApiRouteExample(tmAttractionId: string) {
  // This would be used in apps/web/app/api/artists/import/route.ts
  
  try {
    const orchestrator = new ArtistImportOrchestrator();
    const result = await orchestrator.importArtist(tmAttractionId);
    
    return {
      success: true,
      artistId: result.artistId,
      slug: result.slug,
      statusEndpoint: `/api/artists/${result.artistId}/import-status`,
      stats: {
        totalSongs: result.totalSongs,
        totalShows: result.totalShows,
        totalVenues: result.totalVenues,
        importDuration: result.importDuration
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}