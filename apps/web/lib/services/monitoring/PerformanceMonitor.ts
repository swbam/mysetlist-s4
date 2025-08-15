/**
 * PerformanceMonitor - Comprehensive timing and SLO validation
 * Implements GROK.md performance monitoring requirements
 */

import { db } from '@repo/database';
import { importStatus } from '@repo/database';
import { eq } from 'drizzle-orm';

export interface PerformanceMetrics {
  // Phase timings (GROK.md SLOs)
  identityPhaseMs: number;       // < 200ms
  showsPhaseMs: number;          // < 30s (1k events)
  catalogPhaseMs: number;        // < 45s (2k+ tracks with audio features)
  totalImportMs: number;
  
  // Quality metrics
  failureRate: number;           // < 1%
  searchApiMs: number;           // < 300ms
  pageLoadMs: number;            // < 800ms to skeleton
  
  // Resource usage
  memoryUsageMb: number;
  cpuTimeMs: number;
  
  // Metadata
  artistId: string;
  timestamp: Date;
  environment: string;
}

export interface SLOTarget {
  name: string;
  threshold: number;
  unit: string;
  description: string;
}

// GROK.md SLO definitions
export const SLO_TARGETS: Record<string, SLOTarget> = {
  IDENTITY_PHASE: {
    name: 'Import kickoff → artist shell visible',
    threshold: 200,
    unit: 'ms',
    description: 'Artist record creation time'
  },
  SHOWS_PHASE: {
    name: 'Shows & venues phase (1k events)',
    threshold: 30000,
    unit: 'ms',
    description: 'Complete shows and venues import'
  },
  CATALOG_PHASE: {
    name: 'Catalog phase (2k+ tracks)',
    threshold: 45000,
    unit: 'ms',
    description: 'Studio-only catalog with audio features'
  },
  SEARCH_API: {
    name: 'Search API',
    threshold: 300,
    unit: 'ms',
    description: 'API response time'
  },
  PAGE_LOAD: {
    name: 'Page load to skeleton',
    threshold: 800,
    unit: 'ms',
    description: 'Initial page render'
  },
  IMPORT_FAILURE_RATE: {
    name: 'Import failure rate',
    threshold: 1,
    unit: '%',
    description: 'Percentage of failed imports'
  }
};

export class PerformanceMonitor {
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, number> = new Map();
  private startTime: number;
  
  constructor(
    private context: string,
    private artistId?: string
  ) {
    this.startTime = performance.now();
    this.recordMetric('process_start', this.startTime);
  }

  /**
   * Start timing a phase or operation
   */
  startTimer(phase: string): void {
    const timestamp = performance.now();
    this.timers.set(`${phase}_start`, timestamp);
    
    console.log(`[PerformanceMonitor] ${this.context}: Started ${phase} at ${timestamp.toFixed(2)}ms`);
  }

  /**
   * End timing a phase and return duration
   */
  endTimer(phase: string): number {
    const endTime = performance.now();
    const startTime = this.timers.get(`${phase}_start`);
    
    if (!startTime) {
      console.warn(`[PerformanceMonitor] ${this.context}: No start timer found for ${phase}`);
      return 0;
    }

    const duration = endTime - startTime;
    this.timers.set(`${phase}_end`, endTime);
    this.timers.set(`${phase}_duration`, duration);
    
    console.log(`[PerformanceMonitor] ${this.context}: ${phase} completed in ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  /**
   * Get duration for a specific phase
   */
  getDuration(phase: string): number {
    return this.timers.get(`${phase}_duration`) || 0;
  }

  /**
   * Check if a specific SLO is met
   */
  checkSLO(sloKey: keyof typeof SLO_TARGETS, actualValue: number): {
    passed: boolean;
    slo: SLOTarget;
    actualValue: number;
    margin: number;
  } {
    const slo = SLO_TARGETS[sloKey];
    const passed = actualValue <= slo.threshold;
    const margin = slo.threshold - actualValue;

    return {
      passed,
      slo,
      actualValue,
      margin
    };
  }

  /**
   * Validate all GROK.md performance SLOs
   */
  validateSLOs(): {
    allPassed: boolean;
    results: Array<{
      sloKey: string;
      passed: boolean;
      slo: SLOTarget;
      actualValue: number;
      margin: number;
    }>;
  } {
    const identityDuration = this.getDuration('identity');
    const showsDuration = this.getDuration('shows');
    const catalogDuration = this.getDuration('catalog');
    
    const sloChecks = [
      { key: 'IDENTITY_PHASE', value: identityDuration },
      { key: 'SHOWS_PHASE', value: showsDuration },
      { key: 'CATALOG_PHASE', value: catalogDuration },
    ] as const;

    const results = sloChecks.map(({ key, value }) => ({
      sloKey: key,
      ...this.checkSLO(key, value)
    }));

    const allPassed = results.every(r => r.passed);

    return { allPassed, results };
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(): Promise<PerformanceMetrics> {
    const totalDuration = performance.now() - this.startTime;
    const memUsage = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      // Phase timings
      identityPhaseMs: this.getDuration('identity'),
      showsPhaseMs: this.getDuration('shows'),
      catalogPhaseMs: this.getDuration('catalog'),
      totalImportMs: totalDuration,
      
      // Quality metrics
      failureRate: await this.calculateFailureRate(),
      searchApiMs: this.getDuration('search_api') || 0,
      pageLoadMs: this.getDuration('page_load') || 0,
      
      // Resource usage
      memoryUsageMb: memUsage.heapUsed / 1024 / 1024,
      cpuTimeMs: process.cpuUsage().user / 1000, // Convert microseconds to milliseconds
      
      // Metadata
      artistId: this.artistId || 'unknown',
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
    };

    return metrics;
  }

  /**
   * Calculate import failure rate from database
   */
  private async calculateFailureRate(): Promise<number> {
    try {
      if (!this.artistId) return 0;

      // Get recent imports for this context
      const recentImports = await db
        .select({ stage: importStatus.stage })
        .from(importStatus)
        .where(eq(importStatus.artistId, this.artistId));

      if (recentImports.length === 0) return 0;

      const failedImports = recentImports.filter(i => i.stage === 'failed').length;
      return (failedImports / recentImports.length) * 100;

    } catch (error) {
      console.error('[PerformanceMonitor] Error calculating failure rate:', error);
      return 0;
    }
  }

  /**
   * Persist metrics to monitoring system
   */
  async persistMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      // Log structured metrics for monitoring systems to pick up
      console.log('[PERFORMANCE_METRICS]', JSON.stringify({
        context: this.context,
        metrics,
        sloValidation: this.validateSLOs(),
        timestamp: new Date().toISOString(),
      }));

      // Could integrate with monitoring services like DataDog, New Relic, etc.
      // await this.sendToMonitoringService(metrics);

    } catch (error) {
      console.error('[PerformanceMonitor] Error persisting metrics:', error);
    }
  }

  /**
   * Create performance alert if SLOs are violated
   */
  async createAlerts(): Promise<void> {
    const sloValidation = this.validateSLOs();
    
    if (!sloValidation.allPassed) {
      const failedSLOs = sloValidation.results.filter(r => !r.passed);
      
      const alertMessage = `PERFORMANCE ALERT: ${failedSLOs.length} SLO violations detected in ${this.context}:
${failedSLOs.map(slo => 
  `  - ${slo.slo.name}: ${slo.actualValue.toFixed(0)}${slo.slo.unit} (threshold: ${slo.slo.threshold}${slo.slo.unit}, over by ${Math.abs(slo.margin).toFixed(0)}${slo.slo.unit})`
).join('\n')}`;

      console.error('[PERFORMANCE_ALERT]', alertMessage);
      
      // Could integrate with alerting systems
      // await this.sendAlert(alertMessage);
    }
  }

  /**
   * Static method to create and start monitoring
   */
  static create(context: string, artistId?: string): PerformanceMonitor {
    return new PerformanceMonitor(context, artistId);
  }

  /**
   * Static method for quick SLO validation
   */
  static validateImportSLOs(
    identityMs: number,
    showsMs: number,
    catalogMs: number
  ): boolean {
    return (
      identityMs <= SLO_TARGETS.IDENTITY_PHASE.threshold &&
      showsMs <= SLO_TARGETS.SHOWS_PHASE.threshold &&
      catalogMs <= SLO_TARGETS.CATALOG_PHASE.threshold
    );
  }
}

/**
 * Decorator for automatic performance monitoring
 */
export function withPerformanceMonitoring(phase: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = new PerformanceMonitor(`${target.constructor.name}.${propertyKey}`);
      monitor.startTimer(phase);

      try {
        const result = await originalMethod.apply(this, args);
        monitor.endTimer(phase);
        await monitor.createAlerts();
        return result;
      } catch (error) {
        monitor.endTimer(phase);
        monitor.recordMetric('error', 1);
        await monitor.createAlerts();
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Global performance tracking for import operations
 */
export class ImportPerformanceTracker {
  private static instance: ImportPerformanceTracker;
  private activeImports: Map<string, PerformanceMonitor> = new Map();

  static getInstance(): ImportPerformanceTracker {
    if (!this.instance) {
      this.instance = new ImportPerformanceTracker();
    }
    return this.instance;
  }

  startImportTracking(artistId: string): PerformanceMonitor {
    const monitor = new PerformanceMonitor(`import-${artistId}`, artistId);
    this.activeImports.set(artistId, monitor);
    return monitor;
  }

  getImportTracker(artistId: string): PerformanceMonitor | undefined {
    return this.activeImports.get(artistId);
  }

  async completeImportTracking(artistId: string): Promise<PerformanceMetrics | null> {
    const monitor = this.activeImports.get(artistId);
    if (!monitor) return null;

    const metrics = await monitor.generateReport();
    await monitor.persistMetrics(metrics);
    await monitor.createAlerts();
    
    this.activeImports.delete(artistId);
    return metrics;
  }

  getActiveImports(): string[] {
    return Array.from(this.activeImports.keys());
  }
}

export default PerformanceMonitor;