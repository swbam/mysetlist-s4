import { performance } from "node:perf_hooks";

export interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private startTime = 0;

  start() {
    this.startTime = performance.now();
  }

  end(componentName: string): PerformanceMetrics {
    const endTime = performance.now();
    const renderTime = endTime - this.startTime;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentCount: 1,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    };

    this.metrics.set(componentName, metrics);
    return metrics;
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([name, metrics]) => ({
      name,
      ...metrics,
    }));
  }

  assertPerformance(componentName: string, maxRenderTime: number) {
    const metrics = this.metrics.get(componentName);
    if (!metrics) {
      throw new Error(`No metrics found for component: ${componentName}`);
    }

    if (metrics.renderTime > maxRenderTime) {
      throw new Error(
        `Component ${componentName} took ${metrics.renderTime}ms to render, ` +
          `expected less than ${maxRenderTime}ms`,
      );
    }
  }
}

export function measureRender<T extends (...args: any[]) => any>(
  fn: T,
  _name: string,
): T {
  return ((...args: Parameters<T>) => {
    const _start = performance.now();
    const result = fn(...args);
    const _end = performance.now();

    return result;
  }) as T;
}
