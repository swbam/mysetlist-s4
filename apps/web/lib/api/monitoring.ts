import { CacheClient } from "~/lib/cache/redis"

interface LogEntry {
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  data?: any
  requestId?: string
  userId?: string
  ip?: string
  userAgent?: string
  url?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
}

interface MetricEntry {
  name: string
  value: number
  timestamp: string
  tags?: Record<string, string>
  unit?: string
}

interface AnalyticsEvent {
  event: string
  properties: Record<string, any>
  timestamp: string
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
  url?: string
}

export class MonitoringService {
  private static instance: MonitoringService
  private cache: CacheClient
  private logQueue: LogEntry[] = []
  private metricQueue: MetricEntry[] = []
  private analyticsQueue: AnalyticsEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.cache = CacheClient.getInstance()
    this.startFlushInterval()
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  private startFlushInterval() {
    // Flush logs, metrics, and analytics every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 10000)
  }

  private async flush() {
    try {
      // Flush logs
      if (this.logQueue.length > 0) {
        const logs = [...this.logQueue]
        this.logQueue = []
        await this.persistLogs(logs)
      }

      // Flush metrics
      if (this.metricQueue.length > 0) {
        const metrics = [...this.metricQueue]
        this.metricQueue = []
        await this.persistMetrics(metrics)
      }

      // Flush analytics
      if (this.analyticsQueue.length > 0) {
        const analytics = [...this.analyticsQueue]
        this.analyticsQueue = []
        await this.persistAnalytics(analytics)
      }
    } catch (error) {
      console.error("Error flushing monitoring data:", error)
    }
  }

  private async persistLogs(logs: LogEntry[]) {
    try {
      // Store in Redis with TTL
      const pipeline = logs.map((log) => [
        "LPUSH",
        `logs:${log.level}`,
        JSON.stringify(log),
      ])

      await this.cache.pipeline(pipeline)

      // Expire old logs (keep for 7 days)
      await this.cache.expire(`logs:info`, 604800)
      await this.cache.expire(`logs:warn`, 604800)
      await this.cache.expire(`logs:error`, 604800)
      await this.cache.expire(`logs:debug`, 604800)

      // Send errors to external monitoring (Sentry, etc.)
      const errorLogs = logs.filter((log) => log.level === "error")
      if (errorLogs.length > 0) {
        await this.sendToExternalMonitoring(errorLogs)
      }
    } catch (error) {
      console.error("Error persisting logs:", error)
    }
  }

  private async persistMetrics(metrics: MetricEntry[]) {
    try {
      const pipeline = metrics.map((metric) => [
        "ZADD",
        `metrics:${metric.name}`,
        Date.now().toString(),
        JSON.stringify(metric),
      ])

      await this.cache.pipeline(pipeline)

      // Keep metrics for 30 days
      for (const metric of metrics) {
        await this.cache.expire(`metrics:${metric.name}`, 2592000)
      }
    } catch (error) {
      console.error("Error persisting metrics:", error)
    }
  }

  private async persistAnalytics(analytics: AnalyticsEvent[]) {
    try {
      const pipeline = analytics.map((event) => [
        "LPUSH",
        `analytics:${event.event}`,
        JSON.stringify(event),
      ])

      await this.cache.pipeline(pipeline)

      // Keep analytics for 90 days
      for (const event of analytics) {
        await this.cache.expire(`analytics:${event.event}`, 7776000)
      }
    } catch (error) {
      console.error("Error persisting analytics:", error)
    }
  }

  private async sendToExternalMonitoring(errorLogs: LogEntry[]) {
    // Send to Sentry or other external monitoring service
    if (process.env["SENTRY_DSN"]) {
      for (const log of errorLogs) {
        try {
          // This would integrate with Sentry SDK
          console.error("SENTRY_ERROR:", log)
        } catch (error) {
          console.error("Error sending to Sentry:", error)
        }
      }
    }
  }

  log(message: string, data?: any, context?: Partial<LogEntry>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      data,
      ...context,
    }

    this.logQueue.push(entry)

    // Also log to console in development
    if (process.env["NODE_ENV"] === "development") {
      console.log(`[${entry.timestamp}] ${message}`, data)
    }
  }

  warn(message: string, data?: any, context?: Partial<LogEntry>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      data,
      ...context,
    }

    this.logQueue.push(entry)

    if (process.env["NODE_ENV"] === "development") {
      console.warn(`[${entry.timestamp}] ${message}`, data)
    }
  }

  error(message: string, error: any, context?: Partial<LogEntry>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      ...context,
    }

    this.logQueue.push(entry)

    if (process.env["NODE_ENV"] === "development") {
      console.error(`[${entry.timestamp}] ${message}`, error)
    }
  }

  debug(message: string, data?: any, context?: Partial<LogEntry>) {
    if (process.env["NODE_ENV"] === "development") {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "debug",
        message,
        data,
        ...context,
      }

      this.logQueue.push(entry)
      console.debug(`[${entry.timestamp}] ${message}`, data)
    }
  }

  metric(
    name: string,
    value: number,
    tags?: Record<string, string>,
    unit?: string
  ) {
    const entry: MetricEntry = {
      name,
      value,
      timestamp: new Date().toISOString(),
      ...(tags && { tags }),
      ...(unit && { unit }),
    }

    this.metricQueue.push(entry)

    // Also track in Redis sorted set for real-time queries
    this.cache.zadd(
      `metrics:${name}:timeseries`,
      Date.now(),
      JSON.stringify(entry)
    )
  }

  startTimer(name: string, tags?: Record<string, string>): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.metric(`${name}_duration_ms`, duration, tags, "ms")
    }
  }

  async trackAnalytics(
    event: string,
    properties?: Record<string, any>,
    context?: Partial<AnalyticsEvent>
  ) {
    const entry: AnalyticsEvent = {
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      ...context,
    }

    this.analyticsQueue.push(entry)
  }

  // Request/Response tracking
  trackRequest(req: any, res: any, duration: number) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "HTTP Request",
      url: req.url,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      requestId: req.headers["x-request-id"],
      userId: req.headers["x-user-id"],
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    }

    this.logQueue.push(entry)

    // Track as metric
    this.metric("http_requests_total", 1, {
      method: req.method,
      status: res.statusCode.toString(),
      endpoint: req.url,
    })

    this.metric(
      "http_request_duration_ms",
      duration,
      {
        method: req.method,
        endpoint: req.url,
      },
      "ms"
    )
  }

  // Performance monitoring
  trackPerformance(
    name: string,
    value: number,
    rating: "good" | "needs-improvement" | "poor"
  ) {
    this.metric(`performance_${name}`, value, { rating }, "ms")
  }

  // Database query monitoring
  trackDatabaseQuery(query: string, duration: number, success: boolean) {
    this.metric(
      "database_query_duration_ms",
      duration,
      {
        success: success.toString(),
      },
      "ms"
    )

    this.log("Database Query", {
      query: query.substring(0, 100), // Truncate long queries
      duration,
      success,
    })
  }

  // External API monitoring
  trackExternalAPI(
    service: string,
    endpoint: string,
    duration: number,
    success: boolean,
    statusCode?: number
  ) {
    this.metric(
      `external_api_duration_ms`,
      duration,
      {
        service,
        endpoint,
        success: success.toString(),
        status: statusCode?.toString() || "unknown",
      },
      "ms"
    )

    this.log("External API Call", {
      service,
      endpoint,
      duration,
      success,
      statusCode,
    })
  }

  // Memory and system metrics
  trackSystemMetrics() {
    if (typeof process !== "undefined") {
      const memUsage = process.memoryUsage()

      this.metric("system_memory_rss", memUsage.rss, {}, "bytes")
      this.metric("system_memory_heap_used", memUsage.heapUsed, {}, "bytes")
      this.metric("system_memory_heap_total", memUsage.heapTotal, {}, "bytes")
      this.metric("system_memory_external", memUsage.external, {}, "bytes")

      const cpuUsage = process.cpuUsage()
      this.metric("system_cpu_user", cpuUsage.user, {}, "microseconds")
      this.metric("system_cpu_system", cpuUsage.system, {}, "microseconds")
    }
  }

  // Get metrics for dashboard
  async getMetrics(name: string, timeRange = 3600000): Promise<MetricEntry[]> {
    try {
      const cutoff = Date.now() - timeRange
      const results = await this.cache.zrange(
        `metrics:${name}:timeseries`,
        cutoff,
        Date.now()
      )

      return results.map((result) => JSON.parse(result)).filter(Boolean)
    } catch (error) {
      console.error("Error getting metrics:", error)
      return []
    }
  }

  // Get recent logs
  async getLogs(
    level: "info" | "warn" | "error" | "debug",
    limit = 100
  ): Promise<LogEntry[]> {
    try {
      const results = await this.cache.pipeline([
        ["LRANGE", `logs:${level}`, "0", (limit - 1).toString()],
      ])

      return results[0]?.map((log: string) => JSON.parse(log)) || []
    } catch (error) {
      console.error("Error getting logs:", error)
      return []
    }
  }

  // Health check
  async getHealthMetrics() {
    try {
      const [errorCount, requestCount, avgResponseTime] = await Promise.all([
        this.cache.get("metrics:http_requests_total:errors") || 0,
        this.cache.get("metrics:http_requests_total:count") || 0,
        this.cache.get("metrics:http_request_duration_ms:avg") || 0,
      ])

      return {
        errorCount,
        requestCount,
        avgResponseTime,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error getting health metrics:", error)
      return null
    }
  }

  // Cleanup on shutdown
  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    // Flush remaining data
    await this.flush()
  }
}

// Singleton instance
const monitoringService = MonitoringService.getInstance()

// Convenient monitor object
export const monitor = {
  log: (message: string, data?: any, context?: Partial<LogEntry>) =>
    monitoringService.log(message, data, context),
  warn: (message: string, data?: any, context?: Partial<LogEntry>) =>
    monitoringService.warn(message, data, context),
  error: (message: string, error: any, context?: Partial<LogEntry>) =>
    monitoringService.error(message, error, context),
  debug: (message: string, data?: any, context?: Partial<LogEntry>) =>
    monitoringService.debug(message, data, context),
  metric: (
    name: string,
    value: number,
    tags?: Record<string, string>,
    unit?: string
  ) => monitoringService.metric(name, value, tags, unit),
  startTimer: (name: string, tags?: Record<string, string>) =>
    monitoringService.startTimer(name, tags),
  trackAnalytics: (
    event: string,
    properties?: Record<string, any>,
    context?: Partial<AnalyticsEvent>
  ) => monitoringService.trackAnalytics(event, properties, context),
  trackRequest: (req: any, res: any, duration: number) =>
    monitoringService.trackRequest(req, res, duration),
  trackPerformance: (
    name: string,
    value: number,
    rating: "good" | "needs-improvement" | "poor"
  ) => monitoringService.trackPerformance(name, value, rating),
  trackDatabaseQuery: (query: string, duration: number, success: boolean) =>
    monitoringService.trackDatabaseQuery(query, duration, success),
  trackExternalAPI: (
    service: string,
    endpoint: string,
    duration: number,
    success: boolean,
    statusCode?: number
  ) =>
    monitoringService.trackExternalAPI(
      service,
      endpoint,
      duration,
      success,
      statusCode
    ),
  trackSystemMetrics: () => monitoringService.trackSystemMetrics(),
}

// Export the service for advanced usage
export { monitoringService }

// Start system metrics collection
if (typeof process !== "undefined") {
  setInterval(() => {
    monitoringService.trackSystemMetrics()
  }, 30000) // Every 30 seconds
}

// Handle graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    monitoringService.shutdown()
  })

  process.on("SIGINT", () => {
    monitoringService.shutdown()
  })
}
