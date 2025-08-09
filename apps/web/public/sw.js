<<<<<<< HEAD
// Service Worker for MySetlist
const CACHE_NAME = 'mysetlist-v1';
const RUNTIME_CACHE = 'mysetlist-runtime';

// Files to cache on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network-first strategy for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API calls - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - cache first
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // Default - network first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});
=======
// MySetlist Service Worker - Production Ready
// Version: 2.0.0

const CACHE_NAME = 'mysetlist-v2';
const DATA_CACHE_NAME = 'mysetlist-data-v2';
const STATIC_CACHE_NAME = 'mysetlist-static-v2';

// Cache version - increment when cache strategy changes
const CACHE_VERSION = 2;

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/offline',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  // Critical CSS and JS files are handled dynamically
];

// API endpoints that should always fetch fresh data
const FRESH_DATA_PATTERNS = [
  /\/api\/trending\/live/,
  /\/api\/user\//,
  /\/api\/auth\//,
  /\/api\/sync\//,
  /\/api\/health/,
  /\/api\/votes\//,
  /\/api\/setlists\/live/,
];

// API endpoints that can be cached for short periods
const CACHEABLE_API_PATTERNS = [
  /\/api\/trending\/artists/,
  /\/api\/trending\/shows/,
  /\/api\/trending\/venues/,
  /\/api\/venues/,
  /\/api\/artists/,
  /\/api\/setlists(?!\/live)/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Caching static files');
        return cache.addAll(STATIC_FILES).catch(err => {
          console.warn('[ServiceWorker] Some static files failed to cache:', err);
          // Don't fail the install if some files don't exist yet
        });
      }),
      
      // Clear old data caches to prevent stale content
      clearOldCaches()
    ]).then(() => {
      console.log('[ServiceWorker] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event');
  
  event.waitUntil(
    Promise.all([
      // Clean up old cache versions
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== DATA_CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME) {
              console.log('[ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Clear old service worker data
      clearOldServiceWorkerData(),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle network requests with proper caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default: try network first
  event.respondWith(networkFirst(request));
});

// Handle API requests with appropriate caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Always fetch fresh data for certain patterns
  if (FRESH_DATA_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return networkOnly(request);
  }
  
  // Use stale-while-revalidate for cacheable APIs
  if (CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return staleWhileRevalidate(request, DATA_CACHE_NAME, 300000); // 5 minutes
  }
  
  // Default: network first with short cache
  return networkFirst(request, DATA_CACHE_NAME, 60000); // 1 minute
}

// Handle static assets
async function handleStaticAsset(request) {
  // Try cache first for static assets
  return cacheFirst(request, STATIC_CACHE_NAME);
}

// Handle navigation requests
async function handleNavigation(request) {
  // Always try network first for HTML pages
  try {
    const response = await fetch(request);
    
    // Cache successful HTML responses
    if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback to cached version or offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation failures
    return caches.match('/offline') || new Response('Offline', { status: 503 });
  }
}

// Network-only strategy (no caching)
async function networkOnly(request) {
  try {
    const response = await fetch(request);
    
    // Add no-cache headers to prevent browser caching of fresh data
    if (response.ok) {
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'SW-Cache-Strategy': 'network-only'
        }
      });
      return newResponse;
    }
    
    return response;
  } catch (error) {
    console.warn('[ServiceWorker] Network request failed:', request.url);
    return new Response(JSON.stringify({ 
      error: 'Network unavailable', 
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Always fetch fresh data in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      // Add cache headers and timestamp
      const responseWithHeaders = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'SW-Cache-Strategy': 'stale-while-revalidate',
          'SW-Cache-Time': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithHeaders.clone());
      return responseWithHeaders;
    }
    return response;
  }).catch(err => {
    console.warn('[ServiceWorker] Background fetch failed:', err);
    return null;
  });
  
  // Return cached version if available and not too old
  if (cached) {
    const cacheTime = cached.headers.get('SW-Cache-Time');
    const age = cacheTime ? Date.now() - parseInt(cacheTime) : Infinity;
    
    if (age < maxAge) {
      // Return cached version, fetch is happening in background
      return cached;
    }
  }
  
  // Wait for fresh data if no valid cache
  return fetchPromise || cached || networkError();
}

// Network-first strategy
async function networkFirst(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    
    if (response.ok && cacheName) {
      const cache = await caches.open(cacheName);
      const responseWithHeaders = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'SW-Cache-Strategy': 'network-first',
          'SW-Cache-Time': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithHeaders.clone());
      return responseWithHeaders;
    }
    
    return response;
  } catch (error) {
    // Try cache on network failure
    if (cacheName) {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      
      if (cached && maxAge) {
        const cacheTime = cached.headers.get('SW-Cache-Time');
        const age = cacheTime ? Date.now() - parseInt(cacheTime) : Infinity;
        
        if (age < maxAge) {
          return cached;
        }
      }
      
      if (cached) {
        return cached;
      }
    }
    
    return networkError();
  }
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return networkError();
  }
}

// Helper functions
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/.test(pathname) ||
         pathname.startsWith('/_next/static/');
}

function networkError() {
  return new Response(JSON.stringify({ 
    error: 'Network error', 
    offline: true 
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function clearOldCaches() {
  // Clear any caches from previous versions to prevent stale content
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames
      .filter(name => name.includes('mysetlist') && !name.includes(`-v${CACHE_VERSION}`))
      .map(name => {
        console.log('[ServiceWorker] Clearing old cache:', name);
        return caches.delete(name);
      })
  );
}

async function clearOldServiceWorkerData() {
  // Clear any IndexedDB or localStorage data from previous versions
  try {
    // Clear any old offline action data
    const oldDataCache = await caches.open('mysetlist-data-v0');
    await caches.delete('mysetlist-data-v0');
  } catch (err) {
    // Ignore errors for non-existent caches
  }
}

// Message handling for manual cache updates
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
      
    case 'CLEAR_API_CACHE':
      caches.delete(DATA_CACHE_NAME).then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
      
    case 'UPDATE_TRENDING':
      // Force refresh of trending data
      clearTrendingCache().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function clearTrendingCache() {
  const cache = await caches.open(DATA_CACHE_NAME);
  const requests = await cache.keys();
  const trendingRequests = requests.filter(req => 
    req.url.includes('/api/trending/')
  );
  
  return Promise.all(
    trendingRequests.map(req => cache.delete(req))
  );
}

console.log('[ServiceWorker] Service Worker loaded and ready');
>>>>>>> fccdd438ab7273b15f8870d2cd1c08442bb2d530
