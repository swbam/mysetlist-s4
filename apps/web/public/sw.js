// MySetlist Service Worker
// Provides offline functionality and caching for the web app

const CACHE_NAME = 'mysetlist-v1';
const STATIC_CACHE_NAME = 'mysetlist-static-v1';
const DYNAMIC_CACHE_NAME = 'mysetlist-dynamic-v1';
const API_CACHE_NAME = 'mysetlist-api-v1';

// Cache durations (in milliseconds)
const CACHE_DURATIONS = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  dynamic: 7 * 24 * 60 * 60 * 1000,  // 7 days
  api: 1 * 60 * 60 * 1000,           // 1 hour
  images: 14 * 24 * 60 * 60 * 1000,  // 14 days
};

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
  '/_next/static/css/app.css',
];

// API endpoints to cache
const CACHEABLE_API_ROUTES = [
  '/api/artists',
  '/api/shows',
  '/api/venues',
  '/api/trending',
  '/api/search',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.startsWith('mysetlist-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - serve cached content and implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'offline-votes') {
    event.waitUntil(syncOfflineVotes());
  } else if (event.tag === 'offline-follows') {
    event.waitUntil(syncOfflineFollows());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data,
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.data);
  
  event.notification.close();
  
  const data = event.notification.data;
  let targetUrl = '/';
  
  if (data?.type === 'new-show' && data?.showId) {
    targetUrl = `/shows/${data.showId}`;
  } else if (data?.type === 'setlist-update' && data?.showId) {
    targetUrl = `/shows/${data.showId}/setlist`;
  } else if (data?.type === 'live-show' && data?.showId) {
    targetUrl = `/shows/${data.showId}/live`;
  }
  
  event.waitUntil(
    clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Helper functions
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname === '/manifest.json';
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isImageRequest(url) {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
         url.hostname.includes('images.') ||
         url.hostname.includes('cdn.');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached && !isExpired(cached, CACHE_DURATIONS.static)) {
      return cached;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Static asset fetch failed:', error);
    const cache = await caches.open(STATIC_CACHE_NAME);
    return cache.match(request) || new Response('Asset not available offline', { status: 503 });
  }
}

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Don't cache write operations
  if (request.method !== 'GET') {
    try {
      return await fetch(request);
    } catch (error) {
      // Store offline action for later sync
      if (isVoteRequest(url)) {
        await storeOfflineVote(request);
      } else if (isFollowRequest(url)) {
        await storeOfflineFollow(request);
      }
      return new Response(JSON.stringify({ offline: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Cache-first strategy for GET requests
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached && !isExpired(cached, CACHE_DURATIONS.api)) {
      // Return cached data immediately, but update in background
      fetchAndCache(request, cache);
      return cached;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] API request failed, serving from cache:', error);
    const cache = await caches.open(API_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    return new Response(JSON.stringify({ error: 'Data not available offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleImageRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached && !isExpired(cached, CACHE_DURATIONS.images)) {
      return cached;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Image fetch failed:', error);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return placeholder image
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Image unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Navigation request failed, serving offline page:', error);
    const cache = await caches.open(STATIC_CACHE_NAME);
    return cache.match('/offline') || new Response('Offline', { status: 503 });
  }
}

async function handleDynamicRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Dynamic request failed:', error);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    return cache.match(request) || new Response('Content not available offline', { status: 503 });
  }
}

function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const responseTime = new Date(dateHeader).getTime();
  return Date.now() - responseTime > maxAge;
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.log('[SW] Background fetch failed:', error);
  }
}

function isVoteRequest(url) {
  return url.pathname.includes('/api/votes') || url.pathname.includes('/api/songs/votes');
}

function isFollowRequest(url) {
  return url.pathname.includes('/api/artists/') && url.pathname.includes('/follow');
}

async function storeOfflineVote(request) {
  try {
    const data = await request.json();
    const offlineActions = await getOfflineActions();
    offlineActions.votes = offlineActions.votes || [];
    offlineActions.votes.push({
      id: Date.now(),
      url: request.url,
      method: request.method,
      data,
      timestamp: Date.now(),
    });
    await setOfflineActions(offlineActions);
    
    // Register for background sync
    self.registration.sync.register('offline-votes');
  } catch (error) {
    console.log('[SW] Failed to store offline vote:', error);
  }
}

async function storeOfflineFollow(request) {
  try {
    const data = await request.json();
    const offlineActions = await getOfflineActions();
    offlineActions.follows = offlineActions.follows || [];
    offlineActions.follows.push({
      id: Date.now(),
      url: request.url,
      method: request.method,
      data,
      timestamp: Date.now(),
    });
    await setOfflineActions(offlineActions);
    
    // Register for background sync
    self.registration.sync.register('offline-follows');
  } catch (error) {
    console.log('[SW] Failed to store offline follow:', error);
  }
}

async function syncOfflineVotes() {
  try {
    const offlineActions = await getOfflineActions();
    const votes = offlineActions.votes || [];
    
    for (const vote of votes) {
      try {
        await fetch(vote.url, {
          method: vote.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vote.data),
        });
        
        // Remove successfully synced vote
        offlineActions.votes = offlineActions.votes.filter(v => v.id !== vote.id);
      } catch (error) {
        console.log('[SW] Failed to sync vote:', error);
      }
    }
    
    await setOfflineActions(offlineActions);
  } catch (error) {
    console.log('[SW] Failed to sync offline votes:', error);
  }
}

async function syncOfflineFollows() {
  try {
    const offlineActions = await getOfflineActions();
    const follows = offlineActions.follows || [];
    
    for (const follow of follows) {
      try {
        await fetch(follow.url, {
          method: follow.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(follow.data),
        });
        
        // Remove successfully synced follow
        offlineActions.follows = offlineActions.follows.filter(f => f.id !== follow.id);
      } catch (error) {
        console.log('[SW] Failed to sync follow:', error);
      }
    }
    
    await setOfflineActions(offlineActions);
  } catch (error) {
    console.log('[SW] Failed to sync offline follows:', error);
  }
}

async function getOfflineActions() {
  try {
    const cache = await caches.open('mysetlist-offline-actions');
    const response = await cache.match('/offline-actions');
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.log('[SW] Failed to get offline actions:', error);
  }
  return {};
}

async function setOfflineActions(actions) {
  try {
    const cache = await caches.open('mysetlist-offline-actions');
    await cache.put('/offline-actions', new Response(JSON.stringify(actions), {
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch (error) {
    console.log('[SW] Failed to set offline actions:', error);
  }
}

// Message handling for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service worker loaded');