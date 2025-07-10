'use client';

import { MonitoringService } from './monitoring';

/**
 * Production-ready monitoring service with comprehensive metrics
 */
export class ProductionMonitoringService extends MonitoringService {
  private static alertThresholds = {
    errorRate: 0.01, // 1% error rate
    responseTime: 500, // 500ms response time
    uptime: 0.999, // 99.9% uptime
    memoryUsage: 0.8, // 80% memory usage
    cpuUsage: 0.7, // 70% CPU usage
    diskUsage: 0.9, // 90% disk usage
  };

  private static performanceBudgets = {
    LCP: 2500, // Largest Contentful Paint
    FCP: 1800, // First Contentful Paint
    CLS: 0.1, // Cumulative Layout Shift
    INP: 200, // Interaction to Next Paint
    TTFB: 800, // Time to First Byte
  };

  private static alertChannels = {
    slack: process.env.SLACK_WEBHOOK_URL,
    pagerduty: process.env.PAGERDUTY_INTEGRATION_KEY,
    email: process.env.ALERT_EMAIL,
  };

  /**
   * Initialize production monitoring
   */
  static initializeProduction(): void {
    ProductionMonitoringService.setupErrorTracking();
    ProductionMonitoringService.setupPerformanceMonitoring();
    ProductionMonitoringService.setupResourceMonitoring();
    ProductionMonitoringService.setupAlertSystem();
    ProductionMonitoringService.setupHealthChecks();
  }

  /**
   * Setup error tracking and alerting
   */
  private static setupErrorTracking(): void {
    // Global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        ProductionMonitoringService.handleError(event.error, {
          type: 'javascript_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        ProductionMonitoringService.handleError(
          new Error(event.reason?.toString() || 'Unhandled promise rejection'),
          {
            type: 'unhandled_promise_rejection',
            reason: event.reason,
          }
        );
      });
    }

    // API error tracking
    ProductionMonitoringService.setupAPIErrorTracking();
  }

  /**
   * Setup API error tracking
   */
  private static setupAPIErrorTracking(): void {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0].toString();

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        // Track API performance
        ProductionMonitoringService.trackMetric({
          name: 'api.response_time',
          value: duration,
          unit: 'ms',
          tags: {
            url,
            status: response.status.toString(),
            method: args[1]?.method || 'GET',
          },
        });

        // Check for errors
        if (!response.ok) {
          ProductionMonitoringService.handleAPIError(response, duration, url);
        }

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        ProductionMonitoringService.handleAPIError(error, duration, url);
        throw error;
      }
    };
  }

  /**
   * Handle API errors
   */
  private static handleAPIError(
    error: any,
    duration: number,
    url: string
  ): void {
    const errorData = {
      url,
      duration,
      status: error.status || 'network_error',
      message: error.message || 'API request failed',
    };

    ProductionMonitoringService.trackError(
      error instanceof Error ? error : new Error(errorData.message),
      errorData
    );

    // Check if error rate exceeds threshold
    ProductionMonitoringService.checkErrorRateThreshold();
  }

  /**
   * Setup performance monitoring
   */
  private static setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Core Web Vitals monitoring
    ProductionMonitoringService.setupCoreWebVitals();

    // Resource timing monitoring
    ProductionMonitoringService.setupResourceTimingMonitoring();

    // Navigation timing monitoring
    ProductionMonitoringService.setupNavigationTimingMonitoring();
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private static setupCoreWebVitals(): void {
    if ('PerformanceObserver' in window) {
      // LCP monitoring
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries.at(-1);

        ProductionMonitoringService.trackMetric({
          name: 'performance.lcp',
          value: lastEntry.startTime,
          unit: 'ms',
          tags: { page: window.location.pathname },
        });

        ProductionMonitoringService.checkPerformanceBudget(
          'LCP',
          lastEntry.startTime
        );
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID monitoring
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const fid = (entry as any).processingStart - entry.startTime;

          ProductionMonitoringService.trackMetric({
            name: 'performance.fid',
            value: fid,
            unit: 'ms',
            tags: { page: window.location.pathname },
          });

          ProductionMonitoringService.checkPerformanceBudget('FID', fid);
        });
      });

      fidObserver.observe({ entryTypes: ['first-input'] });

      // CLS monitoring
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });

        ProductionMonitoringService.trackMetric({
          name: 'performance.cls',
          value: clsValue,
          unit: 'score',
          tags: { page: window.location.pathname },
        });

        ProductionMonitoringService.checkPerformanceBudget('CLS', clsValue);
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Setup resource timing monitoring
   */
  private static setupResourceTimingMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming;

          ProductionMonitoringService.trackMetric({
            name: 'performance.resource_load_time',
            value: resource.loadEventEnd - resource.startTime,
            unit: 'ms',
            tags: {
              resource_type: resource.initiatorType,
              resource_name: resource.name.split('/').pop() || 'unknown',
            },
          });
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    }
  }

  /**
   * Setup navigation timing monitoring
   */
  private static setupNavigationTimingMonitoring(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        const metrics = {
          dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp_connect: navigation.connectEnd - navigation.connectStart,
          ttfb: navigation.responseStart - navigation.requestStart,
          dom_content_loaded:
            navigation.domContentLoadedEventEnd - navigation.navigationStart,
          page_load: navigation.loadEventEnd - navigation.navigationStart,
        };

        Object.entries(metrics).forEach(([name, value]) => {
          ProductionMonitoringService.trackMetric({
            name: `performance.${name}`,
            value,
            unit: 'ms',
            tags: { page: window.location.pathname },
          });
        });

        ProductionMonitoringService.checkPerformanceBudget(
          'TTFB',
          metrics.ttfb
        );
      }
    });
  }

  /**
   * Setup resource monitoring
   */
  private static setupResourceMonitoring(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Memory monitoring
    ProductionMonitoringService.setupMemoryMonitoring();

    // Network monitoring
    ProductionMonitoringService.setupNetworkMonitoring();

    // Battery monitoring (if available)
    ProductionMonitoringService.setupBatteryMonitoring();
  }

  /**
   * Setup memory monitoring
   */
  private static setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      const monitorMemory = () => {
        const memory = (performance as any).memory;
        const usagePercent =
          (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        ProductionMonitoringService.trackMetric({
          name: 'system.memory_usage',
          value: usagePercent,
          unit: 'percent',
          tags: {
            used: memory.usedJSHeapSize.toString(),
            total: memory.totalJSHeapSize.toString(),
            limit: memory.jsHeapSizeLimit.toString(),
          },
        });

        // Check memory threshold
        if (
          usagePercent >
          ProductionMonitoringService.alertThresholds.memoryUsage * 100
        ) {
          ProductionMonitoringService.sendAlert('HIGH_MEMORY_USAGE', {
            usage: usagePercent,
            threshold:
              ProductionMonitoringService.alertThresholds.memoryUsage * 100,
          });
        }
      };

      // Monitor memory every 30 seconds
      setInterval(monitorMemory, 30000);
      monitorMemory(); // Initial check
    }
  }

  /**
   * Setup network monitoring
   */
  private static setupNetworkMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const monitorNetwork = () => {
        ProductionMonitoringService.trackMetric({
          name: 'network.downlink',
          value: connection.downlink,
          unit: 'mbps',
          tags: {
            type: connection.type,
            effective_type: connection.effectiveType,
          },
        });
      };

      connection.addEventListener('change', monitorNetwork);
      monitorNetwork(); // Initial check
    }
  }

  /**
   * Setup battery monitoring
   */
  private static setupBatteryMonitoring(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const monitorBattery = () => {
          ProductionMonitoringService.trackMetric({
            name: 'device.battery_level',
            value: battery.level * 100,
            unit: 'percent',
            tags: {
              charging: battery.charging.toString(),
            },
          });
        };

        battery.addEventListener('chargingchange', monitorBattery);
        battery.addEventListener('levelchange', monitorBattery);
        monitorBattery(); // Initial check
      });
    }
  }

  /**
   * Setup alert system
   */
  private static setupAlertSystem(): void {
    // Initialize alert counters
    ProductionMonitoringService.initializeAlertCounters();

    // Setup alert throttling
    ProductionMonitoringService.setupAlertThrottling();
  }

  /**
   * Initialize alert counters
   */
  private static initializeAlertCounters(): void {
    if (typeof window !== 'undefined') {
      window.monitoringAlerts = {
        errorCount: 0,
        lastErrorTime: 0,
        alertsSent: new Map(),
      };
    }
  }

  /**
   * Setup alert throttling
   */
  private static setupAlertThrottling(): void {
    // Prevent alert spam by throttling similar alerts
    ProductionMonitoringService.alertThrottleMap = new Map();
  }

  /**
   * Check performance budget
   */
  private static checkPerformanceBudget(metric: string, value: number): void {
    const budget =
      ProductionMonitoringService.performanceBudgets[
        metric as keyof typeof this.performanceBudgets
      ];

    if (budget && value > budget) {
      ProductionMonitoringService.sendAlert('PERFORMANCE_BUDGET_EXCEEDED', {
        metric,
        value,
        budget,
        page: window.location.pathname,
      });
    }
  }

  /**
   * Check error rate threshold
   */
  private static checkErrorRateThreshold(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const alerts = (window as any).monitoringAlerts;
    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    // Count errors in the last minute
    if (now - alerts.lastErrorTime < timeWindow) {
      alerts.errorCount++;
    } else {
      alerts.errorCount = 1;
      alerts.lastErrorTime = now;
    }

    // Check if error rate exceeds threshold
    const errorRate = alerts.errorCount / 60; // errors per second
    if (errorRate > ProductionMonitoringService.alertThresholds.errorRate) {
      ProductionMonitoringService.sendAlert('HIGH_ERROR_RATE', {
        errorRate,
        threshold: ProductionMonitoringService.alertThresholds.errorRate,
        timeWindow: '1 minute',
      });
    }
  }

  /**
   * Send alert
   */
  private static sendAlert(type: string, data: any): void {
    const alertKey = `${type}_${JSON.stringify(data)}`;
    const now = Date.now();

    // Throttle similar alerts (max 1 per 5 minutes)
    if (ProductionMonitoringService.alertThrottleMap.has(alertKey)) {
      const lastSent =
        ProductionMonitoringService.alertThrottleMap.get(alertKey);
      if (now - lastSent < 300000) {
        // 5 minutes
        return;
      }
    }

    ProductionMonitoringService.alertThrottleMap.set(alertKey, now);

    // Send to configured channels
    ProductionMonitoringService.sendSlackAlert(type, data);
    ProductionMonitoringService.sendPagerDutyAlert(type, data);
    ProductionMonitoringService.sendEmailAlert(type, data);

    // Track alert as metric
    ProductionMonitoringService.trackMetric({
      name: 'alerts.sent',
      value: 1,
      tags: {
        type,
        severity: ProductionMonitoringService.getAlertSeverity(type),
      },
    });
  }

  /**
   * Send Slack alert
   */
  private static sendSlackAlert(type: string, data: any): void {
    if (!ProductionMonitoringService.alertChannels.slack) {
      return;
    }

    const payload = {
      text: `🚨 MySetlist Alert: ${type}`,
      attachments: [
        {
          color: ProductionMonitoringService.getAlertColor(type),
          fields: Object.entries(data).map(([key, value]) => ({
            title: key,
            value: value.toString(),
            short: true,
          })),
          footer: 'MySetlist Production Monitoring',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    fetch(ProductionMonitoringService.alertChannels.slack, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(console.error);
  }

  /**
   * Send PagerDuty alert
   */
  private static sendPagerDutyAlert(type: string, data: any): void {
    if (!ProductionMonitoringService.alertChannels.pagerduty) {
      return;
    }

    const payload = {
      routing_key: ProductionMonitoringService.alertChannels.pagerduty,
      event_action: 'trigger',
      payload: {
        summary: `MySetlist Alert: ${type}`,
        severity: ProductionMonitoringService.getAlertSeverity(type),
        source: 'MySetlist Production',
        custom_details: data,
      },
    };

    fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(console.error);
  }

  /**
   * Send email alert
   */
  private static sendEmailAlert(_type: string, _data: any): void {
    if (!ProductionMonitoringService.alertChannels.email) {
      return;
    }
  }

  /**
   * Get alert severity
   */
  private static getAlertSeverity(type: string): string {
    const criticalAlerts = ['HIGH_ERROR_RATE', 'PERFORMANCE_BUDGET_EXCEEDED'];
    return criticalAlerts.includes(type) ? 'critical' : 'warning';
  }

  /**
   * Get alert color for Slack
   */
  private static getAlertColor(type: string): string {
    const severity = ProductionMonitoringService.getAlertSeverity(type);
    return severity === 'critical' ? 'danger' : 'warning';
  }

  /**
   * Setup health checks
   */
  private static setupHealthChecks(): void {
    // Periodic health check
    setInterval(() => {
      ProductionMonitoringService.performHealthCheck();
    }, 60000); // Every minute

    // Initial health check
    ProductionMonitoringService.performHealthCheck();
  }

  /**
   * Perform health check
   */
  private static performHealthCheck(): void {
    const startTime = performance.now();

    fetch('/api/health')
      .then((response) => {
        const duration = performance.now() - startTime;

        ProductionMonitoringService.trackMetric({
          name: 'health.check_duration',
          value: duration,
          unit: 'ms',
          tags: { status: response.status.toString() },
        });

        if (!response.ok) {
          ProductionMonitoringService.sendAlert('HEALTH_CHECK_FAILED', {
            status: response.status,
            duration,
          });
        }
      })
      .catch((error) => {
        const duration = performance.now() - startTime;

        ProductionMonitoringService.trackError(error, {
          type: 'health_check_error',
          duration,
        });

        ProductionMonitoringService.sendAlert('HEALTH_CHECK_ERROR', {
          error: error.message,
          duration,
        });
      });
  }

  /**
   * Handle errors with enhanced context
   */
  private static handleError(error: Error, context: any): void {
    // Enhanced error tracking for production
    const errorData = {
      ...context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: ProductionMonitoringService.getSessionId(),
      userId: ProductionMonitoringService.getUserId(),
    };

    ProductionMonitoringService.trackError(error, errorData);

    // Send critical errors immediately
    if (ProductionMonitoringService.isCriticalError(error)) {
      ProductionMonitoringService.sendAlert('CRITICAL_ERROR', {
        message: error.message,
        stack: error.stack,
        ...errorData,
      });
    }
  }

  /**
   * Check if error is critical
   */
  private static isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      /ChunkLoadError/,
      /Loading chunk/,
      /Database connection/,
      /Authentication failed/,
      /Network error/,
    ];

    return criticalPatterns.some((pattern) => pattern.test(error.message));
  }

  /**
   * Get session ID
   */
  private static getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'anonymous';
  }

  /**
   * Get user ID
   */
  private static getUserId(): string {
    return localStorage.getItem('userId') || 'anonymous';
  }

  private static alertThrottleMap = new Map<string, number>();
}

// Initialize production monitoring
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  ProductionMonitoringService.initializeProduction();
}

// Global declarations
declare global {
  interface Window {
    monitoringAlerts: {
      errorCount: number;
      lastErrorTime: number;
      alertsSent: Map<string, number>;
    };
  }
}
