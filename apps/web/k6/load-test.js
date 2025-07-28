/**
 * Enhanced K6 Load Testing Suite for MySetlist App
 * Tests normal and peak user load scenarios with comprehensive metrics
 */

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js"
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js"
import { check, group, sleep } from "k6"
import http from "k6/http"
import { Counter, Rate, Trend } from "k6/metrics"

// Custom metrics
const errorRate = new Rate("errors")
const voteLatency = new Trend("vote_latency")
const searchLatency = new Trend("search_latency")
const pageLoadTime = new Trend("page_load_time")
const apiCalls = new Counter("api_calls")

// Enhanced load test configuration
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 200 }, // Ramp up to 200 users
    { duration: "5m", target: 200 }, // Stay at 200 users
    { duration: "2m", target: 300 }, // Peak load test
    { duration: "3m", target: 300 }, // Stay at peak
    { duration: "2m", target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<2500", "p(99)<5000"], // 95% under 2.5s, 99% under 5s
    http_req_failed: ["rate<0.1"], // Error rate must be below 10%
    errors: ["rate<0.05"], // Custom error rate under 5%
    vote_latency: ["p(95)<1000"], // Voting should be under 1s
    search_latency: ["p(95)<800"], // Search should be under 800ms
    page_load_time: ["p(95)<3000"], // Page loads under 3s
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001"

// Test data
const TEST_ARTISTS = [
  "dispatch",
  "our-last-night",
  "metallica",
  "taylor-swift",
  "the-weeknd",
]
const TEST_VENUES = ["red-rocks", "madison-square-garden", "hollywood-bowl"]
const SEARCH_QUERIES = ["dispatch", "rock", "concert", "tour", "live music"]

// Main test function with comprehensive user journey
export default function () {
  const userId = `user_${__VU}_${__ITER}`

  // Test Group 1: Homepage and Initial Load
  group("Homepage Load Performance", () => {
    const startTime = Date.now()
    const res = http.get(`${BASE_URL}/`)
    const loadTime = Date.now() - startTime

    pageLoadTime.add(loadTime)
    apiCalls.add(1)

    check(res, {
      "homepage status is 200": (r) => r.status === 200,
      "homepage loads quickly": (r) => r.timings.duration < 2000,
      "homepage contains navigation": (r) => r.body.includes("nav"),
      "homepage has search": (r) => r.body.includes("search"),
    })
    errorRate.add(res.status !== 200)
  })

  sleep(1)

  // Test Group 2: Search Functionality
  group("Search Performance", () => {
    const query =
      SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)]
    const startTime = Date.now()
    const res = http.get(`${BASE_URL}/api/search?q=${query}`)
    const searchTime = Date.now() - startTime

    searchLatency.add(searchTime)
    apiCalls.add(1)

    check(res, {
      "search API status is 200": (r) => r.status === 200,
      "search API returns results": (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.artists && Array.isArray(body.artists)
        } catch (e) {
          return false
        }
      },
      "search response time acceptable": (r) => r.timings.duration < 1000,
    })
    errorRate.add(res.status !== 200)
  })

  sleep(1)

  // Test Group 3: Artist Page Performance
  group("Artist Page Performance", () => {
    const artist = TEST_ARTISTS[Math.floor(Math.random() * TEST_ARTISTS.length)]
    const startTime = Date.now()
    const res = http.get(`${BASE_URL}/artists/${artist}`)
    const loadTime = Date.now() - startTime

    pageLoadTime.add(loadTime)
    apiCalls.add(1)

    check(res, {
      "artist page status is 200": (r) => r.status === 200,
      "artist page loads quickly": (r) => r.timings.duration < 3000,
      "artist page has content": (r) => r.body.length > 1000,
    })
    errorRate.add(res.status !== 200)
  })

  sleep(1)

  // Test Group 4: Trending Page Performance
  group("Trending Page Performance", () => {
    const startTime = Date.now()
    const res = http.get(`${BASE_URL}/trending`)
    const loadTime = Date.now() - startTime

    pageLoadTime.add(loadTime)
    apiCalls.add(1)

    check(res, {
      "trending page status is 200": (r) => r.status === 200,
      "trending page loads quickly": (r) => r.timings.duration < 2500,
      "trending page has data": (r) => r.body.includes("trending"),
    })
    errorRate.add(res.status !== 200)
  })

  sleep(1)

  // Test Group 5: API Endpoints Performance
  group("API Endpoints Performance", () => {
    // Test shows API
    const showsRes = http.get(`${BASE_URL}/api/shows/upcoming?limit=10`)
    apiCalls.add(1)

    check(showsRes, {
      "shows API responds": (r) => r.status === 200,
      "shows API fast": (r) => r.timings.duration < 1000,
    })
    errorRate.add(showsRes.status !== 200)

    // Test trending API
    const trendingRes = http.get(`${BASE_URL}/api/trending/artists`)
    apiCalls.add(1)

    check(trendingRes, {
      "trending API responds": (r) => r.status === 200,
      "trending API fast": (r) => r.timings.duration < 1000,
    })
    errorRate.add(trendingRes.status !== 200)
  })

  sleep(1)

  // Test Group 6: Voting System Performance
  group("Voting System Performance", () => {
    const votePayload = {
      setlistSongId: `song_${Math.floor(Math.random() * 1000)}`,
      voteType: Math.random() > 0.5 ? "up" : "down",
      userId: userId,
    }

    const params = {
      headers: {
        "Content-Type": "application/json",
      },
    }

    const startTime = Date.now()
    const res = http.post(
      `${BASE_URL}/api/votes`,
      JSON.stringify(votePayload),
      params
    )
    const voteTime = Date.now() - startTime

    voteLatency.add(voteTime)
    apiCalls.add(1)

    check(res, {
      "vote API responds": (r) =>
        r.status === 200 || r.status === 201 || r.status === 400,
      "vote API fast": (r) => r.timings.duration < 1000,
    })
    errorRate.add(![200, 201, 400].includes(res.status))
  })

  // Realistic user behavior - random pause
  sleep(Math.random() * 3 + 1)
}

// Enhanced summary with HTML report
export function handleSummary(data) {
  return {
    "load-test-results.html": htmlReport(data),
    "load-test-results.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  }
}

// Setup function
export function setup() {
  console.log("🚀 Starting MySetlist Load Test")
  console.log(`📍 Base URL: ${BASE_URL}`)
  console.log(`👥 Test Artists: ${TEST_ARTISTS.join(", ")}`)

  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`)
  if (healthRes.status !== 200) {
    console.error("❌ Health check failed - aborting tests")
    return null
  }

  console.log("✅ Health check passed")
  return { baseUrl: BASE_URL, startTime: Date.now() }
}

// Teardown function
export function teardown(data) {
  const duration = Date.now() - data.startTime
  console.log("🏁 Load test completed")
  console.log(`⏱️  Total duration: ${Math.round(duration / 1000)}s`)
  console.log(`📊 Check load-test-results.html for detailed report`)
}
