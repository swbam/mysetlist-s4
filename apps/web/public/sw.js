// Service Worker for TheSet
const CACHE_NAME = "mysetlist-v1";
const RUNTIME_CACHE = "mysetlist-runtime";

// Files to cache on install
const PRECACHE_URLS = ["/", "/offline.html"];

// Install event - cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - network-first strategy for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Static assets - cache first
  if (
    request.method === "GET" &&
    (request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "image")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.open(RUNTIME_CACHE).then((cache) => {
          return fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      }),
    );
    return;
  }
});

// Messages for manual cache control
self.addEventListener("message", (event) => {
  const action = event.data?.action;
  switch (action) {
    case "CLEAR_ALL_CACHES":
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;

    case "CLEAR_API_CACHE":
      caches.delete(DATA_CACHE_NAME).then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;

    case "UPDATE_TRENDING":
      // Force refresh of trending data
      clearTrendingCache().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map((name) => caches.delete(name)));
}

async function clearTrendingCache() {
  const cache = await caches.open(DATA_CACHE_NAME);
  const requests = await cache.keys();
  const trendingRequests = requests.filter((req) =>
    req.url.includes("/api/trending/"),
  );

  return Promise.all(trendingRequests.map((req) => cache.delete(req)));
}

console.log("[ServiceWorker] Service Worker loaded and ready");
