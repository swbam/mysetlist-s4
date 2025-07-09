import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '3m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 1000 }, // Ramp up to 1000 users
    { duration: '10m', target: 1000 }, // Stay at 1000 users
    { duration: '3m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests must complete below 5s under stress
    http_req_failed: ['rate<0.2'],     // Error rate must be below 20% under stress
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'

// Simulate realistic user behavior
export default function () {
  const userId = `user_${__VU}_${Date.now()}`
  
  // User journey simulation
  const userJourney = [
    () => browseHomepage(),
    () => searchArtist(),
    () => viewArtistPage(),
    () => viewShow(),
    () => voteOnSongs(userId),
  ]

  // Execute random user actions
  const action = userJourney[Math.floor(Math.random() * userJourney.length)]
  action()
  
  sleep(Math.random() * 3 + 1) // Random sleep between 1-4 seconds
}

function browseHomepage() {
  const res = http.get(`${BASE_URL}/`)
  check(res, {
    'homepage loads': (r) => r.status === 200,
  })
  errorRate.add(res.status !== 200)
}

function searchArtist() {
  const artists = ['dispatch', 'our last night', 'metallica', 'taylor swift']
  const artist = artists[Math.floor(Math.random() * artists.length)]
  
  const res = http.get(`${BASE_URL}/api/search?q=${artist}`)
  check(res, {
    'search works': (r) => r.status === 200,
  })
  errorRate.add(res.status !== 200)
}

function viewArtistPage() {
  const artists = ['dispatch', 'our-last-night', 'metallica', 'taylor-swift']
  const artist = artists[Math.floor(Math.random() * artists.length)]
  
  const res = http.get(`${BASE_URL}/artists/${artist}`)
  check(res, {
    'artist page loads': (r) => r.status === 200,
  })
  errorRate.add(res.status !== 200)
}

function viewShow() {
  const res = http.get(`${BASE_URL}/api/shows/upcoming?limit=10`)
  
  if (res.status === 200) {
    const shows = JSON.parse(res.body)
    if (shows.length > 0) {
      const show = shows[Math.floor(Math.random() * shows.length)]
      const showRes = http.get(`${BASE_URL}/shows/${show.slug}`)
      check(showRes, {
        'show page loads': (r) => r.status === 200,
      })
      errorRate.add(showRes.status !== 200)
    }
  }
}

function voteOnSongs(userId) {
  const payload = JSON.stringify({
    setlistSongId: `song_${Math.floor(Math.random() * 1000)}`,
    voteType: Math.random() > 0.5 ? 'up' : 'down',
    userId: userId,
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const res = http.post(`${BASE_URL}/api/votes`, payload, params)
  check(res, {
    'vote submitted': (r) => r.status === 200 || r.status === 201,
  })
  errorRate.add(![200, 201].includes(res.status))
}