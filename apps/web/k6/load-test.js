import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2500'], // 95% of requests must complete below 2.5s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'

export default function () {
  // Test homepage
  let res = http.get(`${BASE_URL}/`)
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads quickly': (r) => r.timings.duration < 2000,
  })
  errorRate.add(res.status !== 200)

  sleep(1)

  // Test search API
  res = http.get(`${BASE_URL}/api/search?q=dispatch`)
  check(res, {
    'search API status is 200': (r) => r.status === 200,
    'search API returns results': (r) => {
      const body = JSON.parse(r.body)
      return body.artists && body.artists.length > 0
    },
  })
  errorRate.add(res.status !== 200)

  sleep(1)

  // Test trending page
  res = http.get(`${BASE_URL}/trending`)
  check(res, {
    'trending page status is 200': (r) => r.status === 200,
    'trending page loads quickly': (r) => r.timings.duration < 2500,
  })
  errorRate.add(res.status !== 200)

  sleep(1)

  // Test artist page
  res = http.get(`${BASE_URL}/artists/dispatch`)
  check(res, {
    'artist page status is 200': (r) => r.status === 200,
    'artist page loads quickly': (r) => r.timings.duration < 3000,
  })
  errorRate.add(res.status !== 200)

  sleep(2)
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  }
}