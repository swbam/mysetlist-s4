#!/usr/bin/env node

const { runAccessibilityAudit } = require("./accessibility-audit")
const { testMobileResponsiveness } = require("./mobile-responsiveness-test")
const { runPerformanceAudit } = require("./performance-audit")

async function runComprehensiveUIUXAudit() {
  console.log("🚀 STARTING COMPREHENSIVE UI/UX & PERFORMANCE AUDIT\n")
  console.log("=".repeat(60))

  const results = {
    accessibility: null,
    mobileResponsiveness: null,
    performance: null,
    timestamp: new Date().toISOString(),
    overall: null,
  }

  let totalScore = 0
  let completedTests = 0

  // 1. Accessibility Audit
  console.log("\n🔍 PHASE 1: ACCESSIBILITY AUDIT")
  console.log("-".repeat(40))
  try {
    const accessibilityPassed = await runAccessibilityAudit()
    results.accessibility = {
      passed: accessibilityPassed,
      score: accessibilityPassed ? 100 : 0,
      status: accessibilityPassed ? "PASSED" : "FAILED",
    }
    totalScore += results.accessibility.score
    completedTests++
    console.log(
      `✅ Accessibility audit completed: ${results.accessibility.status}`
    )
  } catch (error) {
    console.error("❌ Accessibility audit failed:", error.message)
    results.accessibility = { error: error.message, score: 0, status: "ERROR" }
  }

  // 2. Mobile Responsiveness Test
  console.log("\n📱 PHASE 2: MOBILE RESPONSIVENESS TEST")
  console.log("-".repeat(40))
  try {
    const mobileResponsive = await testMobileResponsiveness()
    results.mobileResponsiveness = {
      passed: mobileResponsive,
      score: mobileResponsive ? 100 : 75, // Partial credit for mobile issues
      status: mobileResponsive ? "PASSED" : "NEEDS_IMPROVEMENT",
    }
    totalScore += results.mobileResponsiveness.score
    completedTests++
    console.log(
      `✅ Mobile responsiveness test completed: ${results.mobileResponsiveness.status}`
    )
  } catch (error) {
    console.error("❌ Mobile responsiveness test failed:", error.message)
    results.mobileResponsiveness = {
      error: error.message,
      score: 0,
      status: "ERROR",
    }
  }

  // 3. Performance Audit
  console.log("\n⚡ PHASE 3: PERFORMANCE AUDIT")
  console.log("-".repeat(40))
  try {
    const performanceResults = await runPerformanceAudit()
    results.performance = {
      passed: performanceResults,
      score: performanceResults ? 100 : 50, // Partial credit for performance issues
      status: performanceResults ? "PASSED" : "NEEDS_IMPROVEMENT",
    }
    totalScore += results.performance.score
    completedTests++
    console.log(`✅ Performance audit completed: ${results.performance.status}`)
  } catch (error) {
    console.error("❌ Performance audit failed:", error.message)
    results.performance = { error: error.message, score: 0, status: "ERROR" }
  }

  // Calculate overall score
  const overallScore =
    completedTests > 0 ? Math.round(totalScore / completedTests) : 0
  results.overall = {
    score: overallScore,
    status:
      overallScore >= 90
        ? "EXCELLENT"
        : overallScore >= 80
          ? "GOOD"
          : overallScore >= 70
            ? "ACCEPTABLE"
            : overallScore >= 60
              ? "NEEDS_IMPROVEMENT"
              : "POOR",
    grade:
      overallScore >= 90
        ? "A"
        : overallScore >= 80
          ? "B"
          : overallScore >= 70
            ? "C"
            : overallScore >= 60
              ? "D"
              : "F",
  }

  // Generate comprehensive report
  console.log("\n" + "=".repeat(60))
  console.log("📊 COMPREHENSIVE UI/UX & PERFORMANCE AUDIT RESULTS")
  console.log("=".repeat(60))

  console.log(
    `\n🎯 OVERALL SCORE: ${overallScore}% (Grade: ${results.overall.grade})`
  )
  console.log(`📋 STATUS: ${results.overall.status}\n`)

  console.log("📈 DETAILED BREAKDOWN:")
  console.log("┌─────────────────────────────┬─────────┬──────────────────┐")
  console.log("│ Test Category               │ Score   │ Status           │")
  console.log("├─────────────────────────────┼─────────┼──────────────────┤")
  console.log(
    `│ Accessibility (WCAG 2.1 AA) │ ${String(results.accessibility?.score || 0).padStart(5)}%  │ ${(results.accessibility?.status || "ERROR").padEnd(16)} │`
  )
  console.log(
    `│ Mobile Responsiveness       │ ${String(results.mobileResponsiveness?.score || 0).padStart(5)}%  │ ${(results.mobileResponsiveness?.status || "ERROR").padEnd(16)} │`
  )
  console.log(
    `│ Performance (Web Vitals)    │ ${String(results.performance?.score || 0).padStart(5)}%  │ ${(results.performance?.status || "ERROR").padEnd(16)} │`
  )
  console.log("└─────────────────────────────┴─────────┴──────────────────┘")

  // Production readiness assessment
  console.log("\n🚀 PRODUCTION READINESS ASSESSMENT:")

  const productionReady = {
    accessibility: results.accessibility?.passed || false,
    mobileResponsiveness: results.mobileResponsiveness?.passed || false,
    performance: results.performance?.passed || false,
  }

  const readyCount = Object.values(productionReady).filter(Boolean).length
  const isProductionReady = readyCount === 3

  console.log(`┌─────────────────────────────┬─────────────────┐`)
  console.log(`│ Criteria                    │ Ready           │`)
  console.log(`├─────────────────────────────┼─────────────────┤`)
  console.log(
    `│ WCAG 2.1 AA Compliance     │ ${productionReady.accessibility ? "✅ YES" : "❌ NO"} ${"".padEnd(10)} │`
  )
  console.log(
    `│ Mobile-First Design         │ ${productionReady.mobileResponsiveness ? "✅ YES" : "❌ NO"} ${"".padEnd(10)} │`
  )
  console.log(
    `│ Performance Standards       │ ${productionReady.performance ? "✅ YES" : "❌ NO"} ${"".padEnd(10)} │`
  )
  console.log(`└─────────────────────────────┴─────────────────┘`)

  console.log(`\n📊 Production Readiness: ${readyCount}/3 criteria met`)

  if (isProductionReady) {
    console.log("🎉 🎉 🎉 APPLICATION IS PRODUCTION READY! 🎉 🎉 🎉")
  } else {
    console.log(`⚠️  APPLICATION NEEDS IMPROVEMENT BEFORE PRODUCTION`)

    console.log("\n🔧 IMMEDIATE ACTION ITEMS:")
    if (!productionReady.accessibility) {
      console.log(
        "  1. 🔍 Fix accessibility violations found in accessibility-audit-results.json"
      )
      console.log("     • Add proper ARIA labels and descriptions")
      console.log("     • Ensure proper color contrast ratios")
      console.log("     • Test keyboard navigation")
    }

    if (!productionReady.mobileResponsiveness) {
      console.log(
        "  2. 📱 Improve mobile responsiveness issues found in mobile-responsiveness-results.json"
      )
      console.log("     • Fix touch target sizes (minimum 44px)")
      console.log("     • Eliminate horizontal scrolling")
      console.log("     • Optimize mobile navigation")
    }

    if (!productionReady.performance) {
      console.log(
        "  3. ⚡ Address performance issues found in performance-audit-results.json"
      )
      console.log(
        "     • Optimize Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)"
      )
      console.log("     • Reduce bundle size and implement code splitting")
      console.log("     • Add performance monitoring and caching")
    }
  }

  // Recommendations for excellent UX
  if (overallScore < 90) {
    console.log("\n💫 RECOMMENDATIONS FOR WORLD-CLASS UX:")
    console.log("  🎨 Implement smooth micro-interactions and animations")
    console.log("  🔄 Add loading states and skeleton screens")
    console.log("  💬 Provide clear error messages and user feedback")
    console.log("  🎯 Optimize task completion flows")
    console.log("  🧪 Conduct user testing and gather feedback")
    console.log("  📊 Set up continuous monitoring and alerting")
  }

  // Save comprehensive results
  const reportData = {
    ...results,
    summary: {
      overallScore,
      grade: results.overall.grade,
      productionReady: isProductionReady,
      completedTests,
      timestamp: results.timestamp,
    },
  }

  require("fs").writeFileSync(
    "comprehensive-ui-ux-audit-results.json",
    JSON.stringify(reportData, null, 2)
  )

  console.log("\n📄 REPORT FILES GENERATED:")
  console.log("  • comprehensive-ui-ux-audit-results.json (Summary)")
  console.log("  • accessibility-audit-results.json (Detailed accessibility)")
  console.log(
    "  • mobile-responsiveness-results.json (Detailed mobile testing)"
  )
  console.log("  • performance-audit-results.json (Detailed performance)")

  console.log("\n" + "=".repeat(60))
  console.log(
    `UI/UX & PERFORMANCE AUDIT COMPLETED - Grade: ${results.overall.grade}`
  )
  console.log("=".repeat(60))

  return isProductionReady
}

module.exports = { runComprehensiveUIUXAudit }

// Run if called directly
if (require.main === module) {
  runComprehensiveUIUXAudit()
    .then((isProductionReady) => {
      process.exit(isProductionReady ? 0 : 1)
    })
    .catch((error) => {
      console.error("Comprehensive UI/UX audit failed:", error)
      process.exit(1)
    })
}
