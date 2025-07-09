import { chromium } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

interface PerformanceMetrics {
  url: string
  timestamp: string
  metrics: {
    FCP: number // First Contentful Paint
    LCP: number // Largest Contentful Paint
    CLS: number // Cumulative Layout Shift
    TBT: number // Total Blocking Time
    SI: number  // Speed Index
    TTI: number // Time to Interactive
  }
  resources: {
    totalSize: number
    jsSize: number
    cssSize: number
    imageSize: number
    fontSize: number
  }
  errors: string[]
}

const URLS_TO_MONITOR = [
  'http://localhost:3001/',
  'http://localhost:3001/artists',
  'http://localhost:3001/shows',
  'http://localhost:3001/trending',
  'http://localhost:3001/artists/dispatch',
]

async function measurePerformance(url: string): Promise<PerformanceMetrics> {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const errors: string[] = []
  const resources = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    imageSize: 0,
    fontSize: 0,
  }

  // Track errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  // Track resource sizes
  page.on('response', response => {
    const url = response.url()
    const size = response.headers()['content-length'] ? 
      parseInt(response.headers()['content-length']) : 0
    
    resources.totalSize += size

    if (url.endsWith('.js') || response.headers()['content-type']?.includes('javascript')) {
      resources.jsSize += size
    } else if (url.endsWith('.css') || response.headers()['content-type']?.includes('css')) {
      resources.cssSize += size
    } else if (response.headers()['content-type']?.includes('image')) {
      resources.imageSize += size
    } else if (response.headers()['content-type']?.includes('font')) {
      resources.fontSize += size
    }
  })

  // Navigate and wait for load
  await page.goto(url, { waitUntil: 'networkidle' })

  // Get performance metrics
  const performanceData = await page.evaluate(() => {
    const getMetric = (name: string) => {
      const entry = performance.getEntriesByName(name)[0] ||
                   performance.getEntriesByType('paint').find(e => e.name === name)
      return entry ? entry.startTime : 0
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    // Calculate metrics
    const FCP = getMetric('first-contentful-paint')
    
    // Get LCP from PerformanceObserver data
    let LCP = 0
    const observer = new PerformanceObserver(() => {})
    observer.observe({ entryTypes: ['largest-contentful-paint'] })
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
    if (lcpEntries.length > 0) {
      LCP = lcpEntries[lcpEntries.length - 1].startTime
    }

    // Calculate CLS
    let CLS = 0
    const clsEntries = performance.getEntriesByType('layout-shift') as any[]
    clsEntries.forEach(entry => {
      if (!entry.hadRecentInput) {
        CLS += entry.value
      }
    })

    // Calculate Total Blocking Time (simplified)
    const TBT = Math.max(0, navigation.loadEventEnd - navigation.domInteractive - 50)
    
    // Speed Index (simplified calculation)
    const SI = navigation.domContentLoadedEventEnd
    
    // Time to Interactive (simplified)
    const TTI = navigation.loadEventEnd

    return { FCP, LCP, CLS, TBT, SI, TTI }
  })

  await browser.close()

  return {
    url,
    timestamp: new Date().toISOString(),
    metrics: performanceData,
    resources,
    errors
  }
}

async function generateReport(results: PerformanceMetrics[]) {
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      averageMetrics: {
        FCP: 0,
        LCP: 0,
        CLS: 0,
        TBT: 0,
        SI: 0,
        TTI: 0,
      },
      totalResourceSize: 0,
      totalErrors: 0,
    }
  }

  // Calculate averages
  results.forEach(result => {
    Object.keys(result.metrics).forEach(metric => {
      report.summary.averageMetrics[metric as keyof typeof report.summary.averageMetrics] += 
        result.metrics[metric as keyof typeof result.metrics] / results.length
    })
    report.summary.totalResourceSize += result.resources.totalSize
    report.summary.totalErrors += result.errors.length
  })

  // Generate HTML report
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .metric { display: inline-block; margin: 10px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .good { background-color: #d4edda; }
        .warning { background-color: #fff3cd; }
        .bad { background-color: #f8d7da; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Performance Report</h1>
    <p>Generated: ${report.timestamp}</p>
    
    <h2>Summary</h2>
    <div>
        <div class="metric ${report.summary.averageMetrics.FCP < 1500 ? 'good' : report.summary.averageMetrics.FCP < 2500 ? 'warning' : 'bad'}">
            <strong>Avg FCP:</strong> ${report.summary.averageMetrics.FCP.toFixed(0)}ms
        </div>
        <div class="metric ${report.summary.averageMetrics.LCP < 2500 ? 'good' : report.summary.averageMetrics.LCP < 4000 ? 'warning' : 'bad'}">
            <strong>Avg LCP:</strong> ${report.summary.averageMetrics.LCP.toFixed(0)}ms
        </div>
        <div class="metric ${report.summary.averageMetrics.CLS < 0.1 ? 'good' : report.summary.averageMetrics.CLS < 0.25 ? 'warning' : 'bad'}">
            <strong>Avg CLS:</strong> ${report.summary.averageMetrics.CLS.toFixed(3)}
        </div>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
        <tr>
            <th>URL</th>
            <th>FCP (ms)</th>
            <th>LCP (ms)</th>
            <th>CLS</th>
            <th>TBT (ms)</th>
            <th>TTI (ms)</th>
            <th>Total Size (KB)</th>
            <th>Errors</th>
        </tr>
        ${results.map(r => `
        <tr>
            <td>${r.url}</td>
            <td class="${r.metrics.FCP < 1500 ? 'good' : r.metrics.FCP < 2500 ? 'warning' : 'bad'}">${r.metrics.FCP.toFixed(0)}</td>
            <td class="${r.metrics.LCP < 2500 ? 'good' : r.metrics.LCP < 4000 ? 'warning' : 'bad'}">${r.metrics.LCP.toFixed(0)}</td>
            <td class="${r.metrics.CLS < 0.1 ? 'good' : r.metrics.CLS < 0.25 ? 'warning' : 'bad'}">${r.metrics.CLS.toFixed(3)}</td>
            <td>${r.metrics.TBT.toFixed(0)}</td>
            <td>${r.metrics.TTI.toFixed(0)}</td>
            <td>${(r.resources.totalSize / 1024).toFixed(0)}</td>
            <td>${r.errors.length}</td>
        </tr>
        `).join('')}
    </table>
    
    <h2>Resource Breakdown</h2>
    <table>
        <tr>
            <th>URL</th>
            <th>JS (KB)</th>
            <th>CSS (KB)</th>
            <th>Images (KB)</th>
            <th>Fonts (KB)</th>
        </tr>
        ${results.map(r => `
        <tr>
            <td>${r.url}</td>
            <td>${(r.resources.jsSize / 1024).toFixed(0)}</td>
            <td>${(r.resources.cssSize / 1024).toFixed(0)}</td>
            <td>${(r.resources.imageSize / 1024).toFixed(0)}</td>
            <td>${(r.resources.fontSize / 1024).toFixed(0)}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>
  `

  // Save reports
  const reportsDir = path.join(process.cwd(), 'performance-reports')
  await fs.mkdir(reportsDir, { recursive: true })
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await fs.writeFile(
    path.join(reportsDir, `performance-${timestamp}.json`),
    JSON.stringify(report, null, 2)
  )
  await fs.writeFile(
    path.join(reportsDir, `performance-${timestamp}.html`),
    html
  )

  console.log(`Performance report saved to: performance-reports/performance-${timestamp}.html`)
}

async function main() {
  console.log('🚀 Starting performance monitoring...')
  
  const results: PerformanceMetrics[] = []
  
  for (const url of URLS_TO_MONITOR) {
    console.log(`Measuring: ${url}`)
    try {
      const metrics = await measurePerformance(url)
      results.push(metrics)
      
      // Quick summary
      console.log(`  FCP: ${metrics.metrics.FCP.toFixed(0)}ms`)
      console.log(`  LCP: ${metrics.metrics.LCP.toFixed(0)}ms`)
      console.log(`  CLS: ${metrics.metrics.CLS.toFixed(3)}`)
    } catch (error) {
      console.error(`Failed to measure ${url}:`, error)
    }
  }
  
  await generateReport(results)
  console.log('✅ Performance monitoring complete!')
}

main().catch(console.error)