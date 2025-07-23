// MySetlist Service Worker
// Provides offline caching, background sync, and performance optimization

const CACHE_NAME = 'mysetlist-v1.2.0';
const API_CACHE_NAME = 'mysetlist-api-v1.2.0';
const STATIC_CACHE_NAME = 'mysetlist-static-v1.2.0';

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  API: 30 * 60 * 1000, // 30 minutes
  IMAGES: 24 * 60 * 60 * 1000, // 24 hours
  TRENDING: 10 * 60 * 1000, // 10 minutes
};

// Resources to cache immediately on install
const ESSENTIAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/_next/static/css/', // CSS files
  '/_next/static/chunks/', // JS chunks
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/artists',
  '/api/shows',
  '/api/trending',
  '/api/venues',
  '/api/search',
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache essential static resources
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(ESSENTIAL_RESOURCES.filter(url => !url.endsWith('/')));
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName.startsWith('mysetlist-') &&
                cacheName !== CACHE_NAME &&
                cacheName !== API_CACHE_NAME &&
                cacheName !== STATIC_CACHE_NAME
              );
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle requests from our domain
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // Handle static resources
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(handleStaticResource(request));
    return;
  }
  
  // Handle page requests
  if (request.destination === 'document') {
    event.respondWith(handlePageRequest(request));
    return;
  }
  
  // Default: network first
  event.respondWith(fetch(request));
});

// Handle API requests with cache-first strategy for GET requests
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Don't cache mutations
  if (request.method !== 'GET') {
    try {
      return await fetch(request);
    } catch (error) {
      // Return offline response for mutations
      return new Response(
        JSON.stringify({ error: 'Offline', offline: true }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  // Check if this API should be cached
  const shouldCache = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
  
  if (!shouldCache) {
    return fetch(request);
  }
  
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Determine cache strategy based on endpoint
  const isTrendingAPI = url.pathname.includes('/trending');
  const maxAge = isTrendingAPI ? CACHE_EXPIRATION.TRENDING : CACHE_EXPIRATION.API;
  
  // Check if cached response is still valid
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
    const isExpired = Date.now() - cachedDate.getTime() > maxAge;
    
    if (!isExpired) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
  }
  
  // Fetch from network
  try {
    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      
      // Add cache timestamp
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, serving from cache:', request.url);
    
    // Return cached response even if expired when offline
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        offline: true,
        message: 'Data not available offline' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check expiration
    const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
    const isExpired = Date.now() - cachedDate.getTime() > CACHE_EXPIRATION.IMAGES;
    
    if (!isExpired) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version if available
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return placeholder image
    return new Response(
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14" fill="#9ca3af">Image unavailable</text></svg>'], 
      { type: 'image/svg+xml' }),
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

// Handle static resources with cache-first strategy
async function handleStaticResource(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check expiration for static resources
    const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
    const isExpired = Date.now() - cachedDate.getTime() > CACHE_EXPIRATION.STATIC;
    
    if (!isExpired) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version if available
    return cachedResponse || fetch(request);
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    // Always try network first for pages to get latest content
    return await fetch(request);
  } catch (error) {
    // Try to return cached page
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlinePage = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - MySetlist</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
              color: #374151;
            }
            .container {
              text-align: center;
              max-width: 400px;
              padding: 2rem;
            }
            h1 {
              font-size: 2rem;
              margin-bottom: 1rem;
              color: #111827;
            }
            p {
              margin-bottom: 1.5rem;
              line-height: 1.6;
            }
            button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Offline</h1>
            <p>
              It looks like you're not connected to the internet. 
              Some cached content may still be available.
            </p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
          
          <script>
            // Auto-reload when back online
            window.addEventListener('online', () => {
              window.location.reload();
            });
          </script>
        </body>
      </html>
    `;
    
    return new Response(offlinePage, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background sync for pending votes
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'vote-sync') {
    event.waitUntil(syncPendingVotes());
  }
  
  if (event.tag === 'follow-sync') {
    event.waitUntil(syncPendingFollows());
  }
});

// Sync pending votes when back online
async function syncPendingVotes() {
  try {
    // Get pending votes from IndexedDB
    const pendingVotes = await getPendingVotes();
    
    for (const vote of pendingVotes) {
      try {
        const response = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vote)
        });
        
        if (response.ok) {
          await removePendingVote(vote.id);
          console.log('[SW] Synced vote:', vote);
        }
      } catch (error) {
        console.error('[SW] Failed to sync vote:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Sync pending follows when back online
async function syncPendingFollows() {
  try {
    const pendingFollows = await getPendingFollows();
    
    for (const follow of pendingFollows) {
      try {
        const response = await fetch('/api/user/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(follow)
        });
        
        if (response.ok) {
          await removePendingFollow(follow.id);
          console.log('[SW] Synced follow:', follow);
        }
      } catch (error) {
        console.error('[SW] Failed to sync follow:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Follow sync failed:', error);
  }
}

// IndexedDB helpers for background sync
async function getPendingVotes() {
  // Simplified implementation - in production use proper IndexedDB wrapper
  return [];
}

async function removePendingVote(id) {
  // Remove from IndexedDB
}

async function getPendingFollows() {
  return [];
}

async function removePendingFollow(id) {
  // Remove from IndexedDB
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view' && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Periodic cache cleanup and version management
self.addEventListener('message', (event) => {
  if (event.data.action === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupCache());
  }
  
  if (event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'VERSION_CHECK') {
    // Respond with current version
    event.ports[0].postMessage({ 
      version: 'v1.2.0',
      timestamp: Date.now(),
      cacheNames: [CACHE_NAME, API_CACHE_NAME, STATIC_CACHE_NAME]
    });
  }
});

async function cleanupCache() {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('mysetlist-')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        const cachedDate = new Date(response.headers.get('sw-cached-date') || 0);
        const maxAge = cacheName.includes('api') ? CACHE_EXPIRATION.API : CACHE_EXPIRATION.STATIC;
        
        if (Date.now() - cachedDate.getTime() > maxAge) {
          await cache.delete(request);
          console.log('[SW] Cleaned expired cache entry:', request.url);
        }
      }
    }
  }
}