"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift

  // Navigation Timing
  ttfb?: number // Time to First Byte
  domContentLoaded?: number
  loadComplete?: number

  // Resource Metrics
  jsHeapUsed?: number
  jsHeapTotal?: number
  jsHeapLimit?: number

  // Custom Metrics
  componentMountTime?: number
  renderTime?: number

  // Network
  connectionType?: string
  downlink?: number
  effectiveType?: string
}

interface PerformanceMonitorOptions {
  trackCoreWebVitals?: boolean
  trackResourceUsage?: boolean
  trackNetworkInfo?: boolean
  onMetricUpdate?: (metric: string, value: number) => void
  reportInterval?: number
  debug?: boolean
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    trackCoreWebVitals = true,
    trackResourceUsage = true,
    trackNetworkInfo = true,
    onMetricUpdate,
    reportInterval = 5000,
    debug = false,
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics>({})
  const [isMonitoring, setIsMonitoring] = useState(false)
  const metricsRef = useRef<PerformanceMetrics>({} as PerformanceMetrics)
  const observerRef = useRef<PerformanceObserver | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const updateMetric = useCallback(
    (key: keyof PerformanceMetrics, value: number) => {
      ;(metricsRef.current as any)[key] = value
      setMetrics((prev) => ({ ...prev, [key]: value }))
      onMetricUpdate?.(key, value)

      if (debug) {
        console.log(`Performance metric updated: ${key} = ${value}`)
      }
    },
    [onMetricUpdate, debug]
  )

  // Core Web Vitals tracking
  useEffect(() => {
    if (!trackCoreWebVitals || !("PerformanceObserver" in window)) {
      return
    }

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === "paint") {
          if (entry.name === "first-contentful-paint") {
            updateMetric("fcp", entry.startTime)
          }
        } else if (entry.entryType === "largest-contentful-paint") {
          updateMetric("lcp", entry.startTime)
        } else if (entry.entryType === "first-input") {
          updateMetric("fid", (entry as any).processingStart - entry.startTime)
        } else if (entry.entryType === "layout-shift") {
          const layoutShiftEntry = entry as any
          if (!layoutShiftEntry.hadRecentInput) {
            const currentCLS = metricsRef.current.cls || 0
            updateMetric("cls", currentCLS + layoutShiftEntry.value)
          }
        } else if (entry.entryType === "navigation") {
          const navEntry = entry as PerformanceNavigationTiming
          updateMetric("ttfb", navEntry.responseStart - navEntry.requestStart)
          updateMetric(
            "domContentLoaded",
            navEntry.domContentLoadedEventEnd - navEntry.startTime
          )
          updateMetric(
            "loadComplete",
            navEntry.loadEventEnd - navEntry.startTime
          )
        }
      })
    })

    try {
      observer.observe({
        entryTypes: [
          "paint",
          "largest-contentful-paint",
          "first-input",
          "layout-shift",
          "navigation",
        ],
      })
      observerRef.current = observer
    } catch (_error) {
      if (debug) {
        console.warn("PerformanceObserver not supported:", _error)
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [trackCoreWebVitals, updateMetric, debug])

  // Resource usage tracking
  useEffect(() => {
    if (!trackResourceUsage) {
      return
    }

    const trackMemoryUsage = () => {
      // Memory usage (Chrome only)
      if ("memory" in performance) {
        const memory = (performance as any).memory
        updateMetric("jsHeapUsed", memory.usedJSHeapSize)
        updateMetric("jsHeapTotal", memory.totalJSHeapSize)
        updateMetric("jsHeapLimit", memory.jsHeapSizeLimit)
      }
    }

    trackMemoryUsage()
    intervalRef.current = setInterval(trackMemoryUsage, reportInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [trackResourceUsage, reportInterval, updateMetric])

  // Network information tracking
  useEffect(() => {
    if (!trackNetworkInfo || !("connection" in navigator)) {
      return
    }

    const connection = (navigator as any).connection

    const updateNetworkInfo = () => {
      updateMetric("downlink", connection.downlink)
      setMetrics((prev) => ({
        ...prev,
        connectionType: connection.type,
        effectiveType: connection.effectiveType,
      }))
    }

    updateNetworkInfo()
    connection.addEventListener("change", updateNetworkInfo)

    return () => {
      connection.removeEventListener("change", updateNetworkInfo)
    }
  }, [trackNetworkInfo, updateMetric])

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  const markComponentMount = useCallback(
    (_componentName: string) => {
      const startTime = performance.now()
      updateMetric("componentMountTime", startTime)

      if (debug) {
        console.log(
          `Component mount tracked: ${_componentName} at ${startTime}ms`
        )
      }
    },
    [updateMetric, debug]
  )

  const measureRenderTime = useCallback(
    (renderFn: () => void) => {
      const startTime = performance.now()
      renderFn()
      const endTime = performance.now()
      const renderTime = endTime - startTime

      updateMetric("renderTime", renderTime)

      if (debug) {
        console.log(`Render time measured: ${renderTime}ms`)
      }

      return renderTime
    },
    [updateMetric, debug]
  )

  const getPerformanceScore = useCallback(() => {
    const scores = {
      fcp: metrics.fcp
        ? metrics.fcp < 1800
          ? 100
          : metrics.fcp < 3000
            ? 50
            : 0
        : null,
      lcp: metrics.lcp
        ? metrics.lcp < 2500
          ? 100
          : metrics.lcp < 4000
            ? 50
            : 0
        : null,
      fid: metrics.fid
        ? metrics.fid < 100
          ? 100
          : metrics.fid < 300
            ? 50
            : 0
        : null,
      cls: metrics.cls
        ? metrics.cls < 0.1
          ? 100
          : metrics.cls < 0.25
            ? 50
            : 0
        : null,
    }

    const validScores = Object.values(scores).filter(
      (score) => score !== null
    ) as number[]

    if (validScores.length === 0) {
      return null
    }

    const averageScore =
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length

    return {
      overall: Math.round(averageScore),
      breakdown: scores,
    }
  }, [metrics])

  const exportMetrics = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: metricsRef.current,
      score: getPerformanceScore(),
    }

    return exportData
  }, [getPerformanceScore])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    markComponentMount,
    measureRenderTime,
    getPerformanceScore,
    exportMetrics,
    updateMetric,
  }
}

// Hook for monitoring specific component performance
export function useComponentPerformance(
  componentName: string,
  deps: any[] = []
) {
  const {
    markComponentMount,
    measureRenderTime: _measureRenderTime,
    metrics,
  } = usePerformanceMonitor({
    debug: process.env["NODE_ENV"] === "development",
  })

  const mountTimeRef = useRef<number>(0)
  const renderCountRef = useRef(0)

  useEffect(() => {
    const mountTime = performance.now()
    mountTimeRef.current = mountTime
    markComponentMount(componentName)
  }, [])

  useEffect(() => {
    renderCountRef.current += 1

    if (process.env["NODE_ENV"] === "development") {
      console.log(
        `Component ${componentName} rendered #${renderCountRef.current}`
      )
    }
  }, deps)

  const measureOperation = useCallback(
    (_operationName: string, operation: () => void) => {
      const startTime = performance.now()
      operation()
      const duration = performance.now() - startTime

      if (process.env["NODE_ENV"] === "development") {
        console.log(
          `${componentName} operation ${_operationName}: ${duration}ms`
        )
      }

      return duration
    },
    [componentName]
  )

  return {
    mountTime: mountTimeRef.current,
    renderCount: renderCountRef.current,
    measureOperation,
    metrics,
  }
}
