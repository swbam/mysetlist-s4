/**
 * Navigation Performance Monitor
 * Tracks and reports navigation performance metrics
 */

interface NavigationMetrics {
  route: string
  startTime: number
  endTime: number
  duration: number
  loadState: "loading" | "loaded" | "error"
  errorMessage?: string
  performanceEntry?: PerformanceNavigationTiming
}

interface PerformanceThresholds {
  warning: number
  error: number
}

class NavigationPerformanceMonitor {
  private metrics: NavigationMetrics[] = []
  private currentNavigation: Partial<NavigationMetrics> | null = null
  private thresholds: PerformanceThresholds = {
    warning: 2000, // 2 seconds
    error: 5000, // 5 seconds
  }
  private observers: PerformanceObserver[] = []

  constructor() {
    this.setupPerformanceObservers()
    this.setupNavigationListeners()
  }

  private setupPerformanceObservers() {
    // Navigation timing observer
    if ("PerformanceObserver" in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            this.recordNavigationTiming(entry as PerformanceNavigationTiming)
          }
        })
      })

      navigationObserver.observe({ entryTypes: ["navigation"] })
      this.observers.push(navigationObserver)

      // Paint timing observer
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            this.recordPaintTiming(entry)
          }
        })
      })

      paintObserver.observe({ entryTypes: ["paint"] })
      this.observers.push(paintObserver)
    }
  }

  private setupNavigationListeners() {
    // Listen for Next.js route changes
    if (typeof window !== "undefined") {
      // Route change start
      window.addEventListener("beforeunload", () => {
        this.startNavigation(window.location.pathname)
      })

      // Route change complete
      window.addEventListener("load", () => {
        this.endNavigation("loaded")
      })

      // Route change error
      window.addEventListener("error", (event) => {
        this.endNavigation("error", event.error?.message)
      })
    }
  }

  startNavigation(route: string): void {
    this.currentNavigation = {
      route,
      startTime: performance.now(),
      loadState: "loading",
    }
  }

  endNavigation(loadState: "loaded" | "error", errorMessage?: string): void {
    if (!this.currentNavigation) {
      return
    }

    const endTime = performance.now()
    const duration = endTime - (this.currentNavigation.startTime || 0)

    const metric: NavigationMetrics = {
      route: this.currentNavigation.route || "unknown",
      startTime: this.currentNavigation.startTime || 0,
      endTime,
      duration,
      loadState,
      ...(errorMessage !== undefined && { errorMessage }),
    }

    this.metrics.push(metric)
    this.analyzePerformance(metric)
    this.currentNavigation = null
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming): void {
    if (this.currentNavigation) {
      this.currentNavigation.performanceEntry = entry
    }
  }

  private recordPaintTiming(_entry: PerformanceEntry): void {}

  private analyzePerformance(metric: NavigationMetrics): void {
    const { duration, route: _route, loadState } = metric

    // Check performance thresholds
    if (duration > this.thresholds.error) {
      this.reportPerformanceIssue("error", metric)
    } else if (duration > this.thresholds.warning) {
      this.reportPerformanceIssue("warning", metric)
    }

    // Log successful fast navigation
    if (loadState === "loaded" && duration < 1000) {
    }
  }

  private reportPerformanceIssue(
    level: "warning" | "error",
    metric: NavigationMetrics
  ): void {
    // TODO: Implement performance issue reporting
    this._sendToAnalytics(level, metric)
  }

  private _sendToAnalytics(
    level: "warning" | "error",
    metric: NavigationMetrics
  ): void {
    // Send to Google Analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("event", "navigation_performance", {
        event_category: "Performance",
        event_label: metric.route,
        value: Math.round(metric.duration),
        custom_map: {
          performance_level: level,
          load_state: metric.loadState,
        },
      })
    }

    // Send to other analytics services
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      ;(window as any).dataLayer.push({
        event: "navigation_performance",
        performance_level: level,
        route: metric.route,
        duration: metric.duration,
        load_state: metric.loadState,
      })
    }
  }

  getMetrics(): NavigationMetrics[] {
    return [...this.metrics]
  }

  getAveragePerformance(): {
    averageDuration: number
    slowestRoute: string
    fastestRoute: string
    errorRate: number
  } {
    if (this.metrics.length === 0) {
      return {
        averageDuration: 0,
        slowestRoute: "",
        fastestRoute: "",
        errorRate: 0,
      }
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = totalDuration / this.metrics.length

    const sortedByDuration = [...this.metrics].sort(
      (a, b) => a.duration - b.duration
    )
    const fastestRoute = sortedByDuration[0]?.route || ""
    const slowestRoute = sortedByDuration.at(-1)?.route || ""

    const errorCount = this.metrics.filter(
      (m) => m.loadState === "error"
    ).length
    const errorRate = errorCount / this.metrics.length

    return {
      averageDuration,
      slowestRoute,
      fastestRoute,
      errorRate,
    }
  }

  getPerformanceReport(): string {
    const stats = this.getAveragePerformance()
    const totalNavigations = this.metrics.length
    const recentMetrics = this.metrics.slice(-10)

    return `
📊 Navigation Performance Report
═════════════════════════════════

📈 Overall Statistics:
• Total Navigations: ${totalNavigations}
• Average Duration: ${stats.averageDuration.toFixed(2)}ms
• Error Rate: ${(stats.errorRate * 100).toFixed(1)}%
• Fastest Route: ${stats.fastestRoute}
• Slowest Route: ${stats.slowestRoute}

⚡ Recent Performance (Last 10):
${recentMetrics
  .map((m) => `• ${m.route}: ${m.duration.toFixed(2)}ms (${m.loadState})`)
  .join("\n")}

🎯 Performance Thresholds:
• Warning: >${this.thresholds.warning}ms
• Error: >${this.thresholds.error}ms

${this.getPerformanceRecommendations()}
    `.trim()
  }

  private getPerformanceRecommendations(): string {
    const stats = this.getAveragePerformance()
    const recommendations: string[] = []

    if (stats.averageDuration > this.thresholds.warning) {
      recommendations.push("• Consider implementing route preloading")
      recommendations.push("• Review bundle sizes and code splitting")
      recommendations.push("• Optimize database queries")
    }

    if (stats.errorRate > 0.1) {
      recommendations.push("• Implement better error handling")
      recommendations.push("• Add retry mechanisms")
      recommendations.push("• Review error boundary coverage")
    }

    const slowRoutes = this.metrics.filter(
      (m) => m.duration > this.thresholds.warning
    )
    if (slowRoutes.length > 0) {
      const routeCounts = slowRoutes.reduce(
        (acc, m) => {
          acc[m.route] = (acc[m.route] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const problemRoutes = Object.entries(routeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

      recommendations.push(
        `• Focus optimization on: ${problemRoutes.map(([route]) => route).join(", ")}`
      )
    }

    return recommendations.length > 0
      ? `\n💡 Recommendations:\n${recommendations.join("\n")}`
      : "\n✅ Performance is within acceptable thresholds"
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  clearMetrics(): void {
    this.metrics = []
  }

  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []
  }
}

// Global instance
let performanceMonitor: NavigationPerformanceMonitor | null = null

export function getNavigationPerformanceMonitor(): NavigationPerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new NavigationPerformanceMonitor()
  }
  return performanceMonitor
}

// Hook for React components
export function useNavigationPerformance() {
  const monitor = getNavigationPerformanceMonitor()

  return {
    startNavigation: (route: string) => monitor.startNavigation(route),
    endNavigation: (loadState: "loaded" | "error", errorMessage?: string) =>
      monitor.endNavigation(loadState, errorMessage),
    getMetrics: () => monitor.getMetrics(),
    getReport: () => monitor.getPerformanceReport(),
    getStats: () => monitor.getAveragePerformance(),
  }
}

// Utility function for manual performance tracking
export function trackNavigation<T>(
  route: string,
  navigationFn: () => Promise<T>
): Promise<T> {
  const monitor = getNavigationPerformanceMonitor()

  monitor.startNavigation(route)

  return navigationFn()
    .then((result) => {
      monitor.endNavigation("loaded")
      return result
    })
    .catch((error) => {
      monitor.endNavigation("error", error.message)
      throw error
    })
}

// Auto-initialization
if (typeof window !== "undefined") {
  // Initialize on page load
  window.addEventListener("load", () => {
    getNavigationPerformanceMonitor()
  })
}

export default NavigationPerformanceMonitor
