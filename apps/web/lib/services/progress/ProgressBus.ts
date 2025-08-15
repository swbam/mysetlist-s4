/**
 * ProgressBus - EventEmitter-based progress broadcasting with persistent storage
 * Implements GROK.md specifications for real-time progress tracking via SSE
 */

import { EventEmitter } from 'events';
import { db } from '@repo/database';
import { importStatus } from '@repo/database';

type InsertImportStatus = typeof importStatus.$inferInsert;
import { eq, or, inArray } from 'drizzle-orm';

export interface ProgressEvent {
  stage: string;
  progress: number;
  message: string;
  at: string;
  error?: string;
  phaseTimings?: Record<string, number>;
  metadata?: Record<string, any>;
}

export type ImportStage = 
  | 'initializing'
  | 'syncing-identifiers'
  | 'importing-songs'
  | 'importing-shows'
  | 'creating-setlists'
  | 'completed'
  | 'failed';

/**
 * Global EventEmitter instance for progress events
 * Enables real-time communication between import processes and SSE streams
 */
class ProgressBusInstance extends EventEmitter {
  private phaseTimers: Map<string, Record<string, number>> = new Map();
  private listenerMap: WeakMap<(...args: any[]) => void, (...args: any[]) => void> = new WeakMap();

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent imports
  }

  /**
   * Report progress for an import operation
   * Persists to database and emits real-time event
   */
  async report(
    artistId: string,
    stage: ImportStage,
    progress: number,
    message: string,
    options: {
      error?: string;
      metadata?: Record<string, any>;
      artistName?: string;
      jobId?: string;
    } = {}
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const { error, metadata, artistName, jobId } = options;

    // Update phase timings
    const phaseTimings = this.updatePhaseTimings(artistId, stage);

    const progressEvent: ProgressEvent = {
      stage,
      progress,
      message,
      at: timestamp,
      error,
      phaseTimings,
      metadata,
    };

    try {
      // Persist to database
      await this.persistProgress(artistId, {
        artistId,
        stage,
        progress,
        message,
        error: error || null,
        artistName: artistName || null,
        jobId: jobId || null,
        phaseTimings: phaseTimings ? JSON.stringify(phaseTimings) : null,
        startedAt: stage === 'initializing' ? new Date() : undefined,
        completedAt: stage === 'completed' || stage === 'failed' ? new Date() : undefined,
      });

      // Emit real-time event with error handling
      try {
        this.emit(artistId, progressEvent);
        this.emit('global', { artistId, ...progressEvent });
      } catch (emitError) {
        console.error(`[ProgressBus] Error emitting progress for artist ${artistId}:`, emitError);
      }

      // Log for debugging
      console.log(`[ProgressBus] ${artistId}: ${stage} - ${progress}% - ${message}`);

    } catch (dbError) {
      console.error(`[ProgressBus] Failed to persist progress for artist ${artistId}:`, dbError);
      // Still emit the event even if database write fails
      try {
        this.emit(artistId, progressEvent);
        this.emit('global', { artistId, ...progressEvent });
      } catch (emitError) {
        console.error(`[ProgressBus] Error emitting progress after DB failure for artist ${artistId}:`, emitError);
      }
    }
  }

  /**
   * Subscribe to progress events for a specific artist
   */
  onProgress(artistId: string, listener: (event: ProgressEvent) => void): void {
    // Wrap listener to handle async errors
    const safeListener = async (event: ProgressEvent) => {
      try {
        await listener(event);
      } catch (error) {
        console.error(`[ProgressBus] Error in progress listener for artist ${artistId}:`, error);
      }
    };
    
    // Store the mapping so we can remove the correct listener later
    this.listenerMap.set(listener, safeListener);
    this.on(artistId, safeListener);
  }

  /**
   * Unsubscribe from progress events for a specific artist
   */
  offProgress(artistId: string, listener: (event: ProgressEvent) => void): void {
    // Get the wrapped listener from our mapping
    const safeListener = this.listenerMap.get(listener);
    if (safeListener) {
      this.off(artistId, safeListener);
      this.listenerMap.delete(listener);
    } else {
      // Fallback to removing the original listener if mapping not found
      this.off(artistId, listener);
    }
  }

  /**
   * Subscribe to all progress events
   */
  onGlobalProgress(listener: (event: ProgressEvent & { artistId: string }) => void): void {
    this.on('global', listener);
  }

  /**
   * Get current progress status from database
   */
  async getStatus(artistId: string): Promise<ProgressEvent | null> {
    try {
      const [status] = await db
        .select()
        .from(importStatus)
        .where(eq(importStatus.artistId, artistId))
        .limit(1);

      if (!status) return null;

      return {
        stage: status.stage,
        progress: status.progress || 0,
        message: status.message || 'Processing...',
        at: status.updatedAt.toISOString(),
        error: status.error || undefined,
        phaseTimings: status.phaseTimings ? JSON.parse(status.phaseTimings as string) : undefined,
      };
    } catch (error) {
      console.error('Failed to get progress status:', error);
      return null;
    }
  }

  /**
   * Start timing a phase
   */
  startPhase(artistId: string, phase: string): void {
    if (!this.phaseTimers.has(artistId)) {
      this.phaseTimers.set(artistId, {});
    }
    const timings = this.phaseTimers.get(artistId)!;
    timings[`${phase}_start`] = Date.now();
  }

  /**
   * End timing a phase
   */
  endPhase(artistId: string, phase: string): void {
    const timings = this.phaseTimers.get(artistId);
    if (!timings) return;

    const startKey = `${phase}_start`;
    const endKey = `${phase}_end`;
    const durationKey = `${phase}_duration`;

    if (timings[startKey]) {
      timings[endKey] = Date.now();
      timings[durationKey] = timings[endKey] - timings[startKey];
    }
  }

  /**
   * Clean up phase timers
   */
  cleanupTimers(artistId: string): void {
    this.phaseTimers.delete(artistId);
  }

  /**
   * Update phase timings and return current state
   */
  private updatePhaseTimings(artistId: string, stage: ImportStage): Record<string, number> | undefined {
    const timings = this.phaseTimers.get(artistId);
    if (!timings) return undefined;

    // Auto-end previous phase and start current phase
    const phases = ['initializing', 'syncing-identifiers', 'importing-songs', 'importing-shows', 'creating-setlists'];
    const currentPhaseIndex = phases.indexOf(stage);
    
    if (currentPhaseIndex > 0) {
      const previousPhase = phases[currentPhaseIndex - 1];
      if (timings[`${previousPhase}_start`] && !timings[`${previousPhase}_end`]) {
        this.endPhase(artistId, previousPhase!);
      }
    }

    if (currentPhaseIndex >= 0 && !timings[`${stage}_start`]) {
      this.startPhase(artistId, stage);
    }

    return { ...timings };
  }

  /**
   * Persist progress to database
   */
  private async persistProgress(
    artistId: string,
    data: Partial<InsertImportStatus> & { 
      artistId: string;
      stage: 'initializing' | 'syncing-identifiers' | 'importing-songs' | 'importing-shows' | 'creating-setlists' | 'completed' | 'failed';
      progress: number;
    }
  ): Promise<void> {
    try {
      await db
        .insert(importStatus)
        .values(data)
        .onConflictDoUpdate({
          target: importStatus.artistId,
          set: {
            stage: data.stage,
            progress: data.progress,
            message: data.message,
            error: data.error,
            jobId: data.jobId,
            phaseTimings: data.phaseTimings,
            updatedAt: new Date(),
            completedAt: data.completedAt,
          },
        });
    } catch (dbError) {
      console.error(`[ProgressBus] Database error persisting progress for artist ${artistId}:`, dbError);
      throw dbError; // Re-throw to be handled by caller
    }
  }

  /**
   * Report error and mark import as failed
   */
  async reportError(
    artistId: string,
    error: Error,
    stage: ImportStage,
    options: {
      artistName?: string;
      jobId?: string;
    } = {}
  ): Promise<void> {
    try {
      await this.report(artistId, 'failed', 0, `Error: ${error.message}`, {
        error: error.stack || error.message,
        ...options,
      });
    } catch (reportError) {
      console.error(`[ProgressBus] Failed to report error for artist ${artistId}:`, reportError);
      // Don't throw here to avoid masking the original error
    }
  }

  /**
   * Report successful completion
   */
  async reportComplete(
    artistId: string,
    message = 'Import completed successfully',
    options: {
      artistName?: string;
      jobId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      await this.report(artistId, 'completed', 100, message, options);
    } catch (reportError) {
      console.error(`[ProgressBus] Failed to report completion for artist ${artistId}:`, reportError);
      // Still try to cleanup timers even if report failed
    } finally {
      try {
        this.cleanupTimers(artistId);
      } catch (cleanupError) {
        console.error(`[ProgressBus] Failed to cleanup timers for artist ${artistId}:`, cleanupError);
      }
    }
  }

  /**
   * Get all active imports
   */
  async getActiveImports(): Promise<Array<{
    artistId: string;
    stage: string;
    progress: number;
    message: string;
    startedAt: Date;
    artistName?: string;
  }>> {
    try {
      const activeStatuses = await db
        .select()
        .from(importStatus)
        .where(
          inArray(importStatus.stage, [
            'initializing',
            'syncing-identifiers', 
            'importing-songs',
            'importing-shows',
            'creating-setlists'
          ])
        );

      return activeStatuses.map(status => ({
        artistId: status.artistId,
        stage: status.stage,
        progress: status.progress || 0,
        message: status.message || 'Processing...',
        startedAt: status.startedAt || status.createdAt,
        artistName: status.artistName || undefined,
      }));
    } catch (error) {
      console.error('Failed to get active imports:', error);
      return [];
    }
  }

  /**
   * Create a scoped progress reporter for a specific import
   */
  createReporter(artistId: string, options: { artistName?: string; jobId?: string } = {}) {
    const { artistName, jobId } = options;

    return {
      report: (stage: ImportStage, progress: number, message: string, metadata?: Record<string, any>) =>
        this.report(artistId, stage, progress, message, { artistName, jobId, metadata }),
      
      reportError: (error: Error, stage: ImportStage) =>
        this.reportError(artistId, error, stage, { artistName, jobId }),
      
      reportComplete: (message?: string, metadata?: Record<string, any>) =>
        this.reportComplete(artistId, message, { artistName, jobId, metadata }),
      
      startPhase: (phase: string) => this.startPhase(artistId, phase),
      endPhase: (phase: string) => this.endPhase(artistId, phase),
    };
  }
}

// Export singleton instance
export const ProgressBus = new ProgressBusInstance();

// Export individual functions for backward compatibility and easier imports
export const report = ProgressBus.report.bind(ProgressBus);
export const onProgress = ProgressBus.onProgress.bind(ProgressBus);
export const offProgress = ProgressBus.offProgress.bind(ProgressBus);
export const getStatus = ProgressBus.getStatus.bind(ProgressBus);
export const reportError = ProgressBus.reportError.bind(ProgressBus);
export const reportComplete = ProgressBus.reportComplete.bind(ProgressBus);

// Default export
export default ProgressBus;