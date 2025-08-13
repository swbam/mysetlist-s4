/**
 * Bundle Optimization Configuration and Dynamic Import Strategy
 * Implements intelligent code splitting for optimal performance
 */

import { lazy, ComponentType } from 'react';
import dynamic from 'next/dynamic';

// ================================
// Performance Configuration
// ================================

export const PERFORMANCE_TARGETS = {
  // Bundle size targets (in bytes)
  HOMEPAGE_BUNDLE: 350 * 1024, // 350KB
  ARTIST_PAGE_BUNDLE: 400 * 1024, // 400KB
  SHOW_PAGE_BUNDLE: 450 * 1024, // 450KB
  ADMIN_BUNDLE: 600 * 1024, // 600KB (more lenient for admin)
  
  // Performance timing targets (in milliseconds)
  PHASE_1_TARGET: 3000, // 3 seconds
  PHASE_2_TARGET: 15000, // 15 seconds
  PHASE_3_TARGET: 90000, // 90 seconds
  
  // Core Web Vitals targets
  LCP_TARGET: 2500, // Largest Contentful Paint
  FID_TARGET: 100, // First Input Delay
  CLS_TARGET: 0.1, // Cumulative Layout Shift
  
  // Chunk size limits
  MAX_CHUNK_SIZE: 200 * 1024, // 200KB per chunk
  MIN_CHUNK_SIZE: 20 * 1024, // 20KB minimum chunk
} as const;

// ================================
// Dynamic Import Components
// ================================

/**
 * Artist Import Orchestrator - Service class for server-side operations
 * Note: Not a React component, should be imported directly in API routes
 */
// Removed dynamic import as ArtistImportOrchestrator is a service class, not a React component

/**
 * Import Progress SSE Component - Direct import (complex types prevent dynamic loading)
 */
// Removed dynamic import due to TypeScript complex type dependencies
// Use direct import instead: import { ImportProgressSSE } from '../../components/artist/import-progress-sse'

/**
 * Analytics Dashboard - Heavy component, load on demand
 */
// Removed dynamic import due to missing component file
// TODO: Create advanced-analytics-dashboard component if needed

/**
 * Admin Monitoring Dashboard - Load only for admin users
 */
// Removed dynamic import due to missing component file
// TODO: Create production-monitoring-dashboard component if needed

/**
 * Charts and Visualization Components
 */
// Removed dynamic imports due to missing component files
// TODO: Create analytics components when needed
// - voting-analytics
// - performance-metrics  
// - user-engagement

/**
 * Mobile-specific components
 */
// Removed dynamic imports due to missing component files
// TODO: Create mobile components when needed
// - bottom-sheet
// - touch-card
// - advanced-gesture-handler

// ================================
// Bundle Analysis Utilities
// ================================

export interface BundleAnalysis {
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    percentage: number;
  }>;
  recommendations: string[];
  performance: {
    meetsTargets: boolean;
    targetSize: number;
    actualSize: number;
    savings: number;
  };
}

/**
 * Analyze bundle composition and provide optimization recommendations
 */
export function analyzeBundleComposition(
  bundleStats: any,
  targetSize: number,
  pageName: string
): BundleAnalysis {
  const chunks = bundleStats.chunks || [];
  const totalSize = chunks.reduce((sum: number, chunk: any) => sum + chunk.size, 0);
  
  const analysis: BundleAnalysis = {
    totalSize,
    chunks: chunks.map((chunk: any) => ({
      name: chunk.name,
      size: chunk.size,
      percentage: (chunk.size / totalSize) * 100,
    })),
    recommendations: [],
    performance: {
      meetsTargets: totalSize <= targetSize,
      targetSize,
      actualSize: totalSize,
      savings: Math.max(0, totalSize - targetSize),
    },
  };

  // Generate recommendations based on analysis
  analysis.recommendations = generateOptimizationRecommendations(analysis, pageName);

  return analysis;
}

function generateOptimizationRecommendations(
  analysis: BundleAnalysis,
  pageName: string
): string[] {
  const recommendations: string[] = [];
  const { chunks, totalSize, performance } = analysis;

  if (!performance.meetsTargets) {
    recommendations.push(
      `Bundle exceeds target by ${(performance.savings / 1024).toFixed(1)}KB`
    );
  }

  // Check for oversized chunks
  const oversizedChunks = chunks.filter(chunk => chunk.size > PERFORMANCE_TARGETS.MAX_CHUNK_SIZE);
  if (oversizedChunks.length > 0) {
    recommendations.push(
      `Consider splitting large chunks: ${oversizedChunks.map(c => c.name).join(', ')}`
    );
  }

  // Check for duplicate dependencies
  const duplicates = findDuplicateDependencies(chunks);
  if (duplicates.length > 0) {
    recommendations.push(
      `Potential duplicate dependencies detected: ${duplicates.join(', ')}`
    );
  }

  // Page-specific recommendations
  switch (pageName) {
    case 'homepage':
      if (chunks.some(c => c.name.includes('admin'))) {
        recommendations.push('Remove admin components from homepage bundle');
      }
      break;
      
    case 'artist':
      if (!chunks.some(c => c.name.includes('import'))) {
        recommendations.push('Consider preloading import components for artist pages');
      }
      break;
      
    case 'admin':
      if (chunks.some(c => c.name.includes('mobile'))) {
        recommendations.push('Remove mobile-specific components from admin bundle');
      }
      break;
  }

  return recommendations;
}

function findDuplicateDependencies(chunks: any[]): string[] {
  const dependencies = new Map<string, number>();
  
  chunks.forEach(chunk => {
    const modules = chunk.modules || [];
    modules.forEach((module: any) => {
      if (module.name && module.name.includes('node_modules')) {
        const depName = extractDependencyName(module.name);
        dependencies.set(depName, (dependencies.get(depName) || 0) + 1);
      }
    });
  });

  return Array.from(dependencies.entries())
    .filter(([_, count]) => count > 1)
    .map(([name]) => name);
}

function extractDependencyName(modulePath: string): string {
  const match = modulePath.match(/node_modules\/(@?[^\/]+(?:\/[^\/]+)?)/);
  return match ? match[1]! : 'unknown';
}

// ================================
// Performance Monitoring
// ================================

export interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

/**
 * Monitor performance metrics during development and production
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();

  startMonitoring(pageName: string): void {
    if (typeof window === 'undefined') return;

    // Monitor bundle loading
    this.monitorBundleLoading(pageName);
    
    // Monitor rendering performance
    this.monitorRenderingPerformance(pageName);
    
    // Monitor memory usage
    this.monitorMemoryUsage(pageName);
  }

  private monitorBundleLoading(pageName: string): void {
    if (!window.performance) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      let totalSize = 0;
      let loadTime = 0;

      entries.forEach((entry) => {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          totalSize += (entry as any).transferSize || 0;
          loadTime = Math.max(loadTime, entry.duration);
        }
      });

      this.updateMetrics(pageName, { bundleSize: totalSize, loadTime });
    });

    observer.observe({ type: 'resource', buffered: true });
    this.observers.set(`${pageName}-bundle`, observer);
  }

  private monitorRenderingPerformance(pageName: string): void {
    if (!window.performance) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          this.updateMetrics(pageName, { renderTime: entry.startTime });
        }
        
        if (entry.entryType === 'first-input') {
          this.updateMetrics(pageName, { interactionTime: (entry as any).processingStart - entry.startTime });
        }
      });
    });

    observer.observe({ type: 'paint', buffered: true });
    observer.observe({ type: 'first-input', buffered: true });
    this.observers.set(`${pageName}-render`, observer);
  }

  private monitorMemoryUsage(pageName: string): void {
    if (typeof window === 'undefined' || !(performance as any).memory) return;

    const measureMemory = () => {
      const memory = (performance as any).memory;
      this.updateMetrics(pageName, {
        memoryUsage: memory.usedJSHeapSize,
      });
    };

    measureMemory();
    const interval = setInterval(measureMemory, 5000); // Every 5 seconds

    // Store interval for cleanup
    (this.observers as any).set(`${pageName}-memory`, interval);
  }

  private updateMetrics(pageName: string, newMetrics: Partial<PerformanceMetrics>): void {
    const existing = this.metrics.get(pageName) || {
      bundleSize: 0,
      loadTime: 0,
      renderTime: 0,
      interactionTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
    };

    this.metrics.set(pageName, { ...existing, ...newMetrics });
  }

  getMetrics(pageName: string): PerformanceMetrics | undefined {
    return this.metrics.get(pageName);
  }

  stopMonitoring(pageName: string): void {
    // Clean up observers
    this.observers.forEach((observer, key) => {
      if (key.startsWith(pageName)) {
        if (observer instanceof PerformanceObserver) {
          observer.disconnect();
        } else {
          clearInterval(observer as any);
        }
      }
    });

    // Remove from maps
    Array.from(this.observers.keys())
      .filter(key => key.startsWith(pageName))
      .forEach(key => this.observers.delete(key));
  }

  generateReport(): Record<string, PerformanceMetrics> {
    return Object.fromEntries(this.metrics);
  }
}

// ================================
// Optimization Strategies
// ================================

export const OPTIMIZATION_STRATEGIES = {
  /**
   * Critical path optimization - load essential components first
   */
  criticalPath: {
    preload: [
      'framework',
      'radix-core',
      'utils',
    ],
    defer: [
      'charts',
      'animation',
      'admin',
      'analytics',
    ],
  },

  /**
   * Route-based code splitting strategy
   */
  routeSplitting: {
    homepage: {
      essential: ['framework', 'radix-core', 'utils'],
      optional: ['animation'],
      exclude: ['admin', 'charts', 'analytics'],
    },
    artist: {
      essential: ['framework', 'radix-core', 'utils', 'icons'],
      progressive: ['import-orchestrator', 'sse-progress'],
      optional: ['charts', 'animation'],
      exclude: ['admin'],
    },
    admin: {
      essential: ['framework', 'radix-core', 'utils'],
      progressive: ['charts', 'analytics', 'monitoring'],
      optional: ['animation'],
      exclude: ['mobile'],
    },
  },

  /**
   * Progressive enhancement strategy
   */
  progressiveEnhancement: {
    core: 'Load basic functionality first',
    enhanced: 'Add interactive features',
    advanced: 'Load analytics and monitoring',
    premium: 'Load admin and power user features',
  },
} as const;

// ================================
// Build-time Optimization Helpers
// ================================

/**
 * Webpack plugin configuration for optimal bundle splitting
 */
export function generateOptimalSplitChunks() {
  return {
    chunks: 'all' as const,
    maxInitialRequests: 30,
    maxAsyncRequests: 30,
    minSize: PERFORMANCE_TARGETS.MIN_CHUNK_SIZE,
    maxSize: PERFORMANCE_TARGETS.MAX_CHUNK_SIZE,
    cacheGroups: {
      default: false,
      vendors: false,
      
      // Core framework (highest priority)
      framework: {
        name: 'framework',
        test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types)[\\/]/,
        priority: 40,
        enforce: true,
        reuseExistingChunk: true,
      },
      
      // Essential UI components
      uiCore: {
        name: 'ui-core',
        test: /[\\/]node_modules[\\/](@radix-ui[\\/]react-(avatar|button|dialog|dropdown-menu|input|tabs))[\\/]/,
        priority: 35,
        enforce: true,
        reuseExistingChunk: true,
      },
      
      // Extended UI components
      uiExtended: {
        name: 'ui-extended',
        test: /[\\/]node_modules[\\/](@radix-ui[\\/]react-(popover|command|select|toast))[\\/]/,
        priority: 34,
        chunks: 'async' as const,
        reuseExistingChunk: true,
      },
      
      // Icons (separate for caching)
      icons: {
        name: 'icons',
        test: /[\\/]node_modules[\\/](lucide-react|@radix-ui[\\/]react-icons)[\\/]/,
        priority: 33,
        chunks: 'async' as const,
        reuseExistingChunk: true,
      },
      
      // Data visualization (lazy load)
      charts: {
        name: 'charts',
        test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/,
        priority: 25,
        chunks: 'async' as const,
        reuseExistingChunk: true,
      },
      
      // Animation libraries (lazy load)
      animation: {
        name: 'animation',
        test: /[\\/]node_modules[\\/](framer-motion|@hello-pangea)[\\/]/,
        priority: 24,
        chunks: 'async' as const,
        reuseExistingChunk: true,
      },
      
      // Authentication and API
      auth: {
        name: 'auth',
        test: /[\\/]node_modules[\\/](@supabase|otplib)[\\/]/,
        priority: 30,
        chunks: 'async' as const,
        reuseExistingChunk: true,
      },
      
      // Utilities (small, shared across pages)
      utils: {
        name: 'utils',
        test: /[\\/]node_modules[\\/](clsx|tailwind-merge|date-fns|nanoid)[\\/]/,
        priority: 32,
        chunks: 'all' as const,
        reuseExistingChunk: true,
      },
      
      // Common vendor chunk for smaller libraries
      vendorLibs: {
        name: 'vendors',
        test: /[\\/]node_modules[\\/]/,
        priority: 10,
        chunks: 'async' as const,
        minChunks: 2,
        maxSize: PERFORMANCE_TARGETS.MAX_CHUNK_SIZE,
        reuseExistingChunk: true,
      },
    },
  };
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();