// Polish Football Network Service Worker
// Provides offline capabilities and performance optimizations

const CACHE_NAME = 'polish-football-network-v1';
const STATIC_CACHE_NAME = 'static-v1';
const DYNAMIC_CACHE_NAME = 'dynamic-v1';
const API_CACHE_NAME = 'api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-72x72.png',
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-128x128.png',
  '/assets/icons/icon-144x144.png',
  '/assets/icons/icon-152x152.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-384x384.png',
  '/assets/icons/icon-512x512.png',
  '/assets/images/default-club-logo.png',
  '/assets/fonts/roboto-v30-latin-300.woff2',
  '/assets/fonts/roboto-v30-latin-regular.woff2',
  '/assets/fonts/roboto-v30-latin-500.woff2'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/clubs',
  '/api/connections',
  '/api/graph/data'
];

// Files that should be cached with stale-while-revalidate strategy
const STALE_WHILE_REVALIDATE_ASSETS = [
  '/main.js',
  '/polyfills.js',
  '/styles.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with different strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (requestUrl.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(event.request)) {
    event.respondWith(handleStaticAsset(event.request));
  } else if (isAPIRequest(event.request)) {
    event.respondWith(handleAPIRequest(event.request));
  } else if (isNavigationRequest(event.request)) {
    event.respondWith(handleNavigationRequest(event.request));
  } else if (isStaleWhileRevalidateAsset(event.request)) {
    event.respondWith(handleStaleWhileRevalidate(event.request));
  } else {
    event.respondWith(handleDynamicContent(event.request));
  }
});

// Check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.startsWith('/assets/');
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Check if request is navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Check if request is for stale-while-revalidate asset
function isStaleWhileRevalidateAsset(request) {
  const url = new URL(request.url);
  return STALE_WHILE_REVALIDATE_ASSETS.some(asset => url.pathname.endsWith(asset));
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling static asset:', error);

    // Return offline fallback for images
    if (request.destination === 'image') {
      return caches.match('/assets/images/offline-placeholder.png');
    }

    throw error;
  }
}

// Handle API requests with network-first strategy and background sync
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache');

    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add header to indicate this is cached data
      const response = cachedResponse.clone();
      response.headers.set('X-Cache-Status', 'HIT');
      return response;
    }

    // Return offline response for API requests
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your connection.',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': 'OFFLINE'
      }
    });
  }
}

// Handle navigation requests with network-first, cache fallback
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error(`Navigation response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('[SW] Network failed for navigation, serving offline page');

    // Try to serve cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Serve offline page
    return caches.match('/index.html');
  }
}

// Handle stale-while-revalidate assets
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch new version in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we might have a cached version
    return cachedResponse;
  });

  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Handle dynamic content with cache-first for performance
async function handleDynamicContent(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Return cached version and update in background
      fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      }).catch(() => {
        // Background update failed, but we have cached version
      });

      return cachedResponse;
    }

    // No cache, fetch from network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling dynamic content:', error);
    throw error;
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'graph-data-sync') {
    event.waitUntil(syncGraphData());
  } else if (event.tag === 'user-actions-sync') {
    event.waitUntil(syncUserActions());
  }
});

// Sync graph data when connection is restored
async function syncGraphData() {
  try {
    console.log('[SW] Syncing graph data...');

    // Fetch latest graph data
    const response = await fetch('/api/graph/data');
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put('/api/graph/data', response.clone());

      // Notify all clients about updated data
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'GRAPH_DATA_SYNCED',
          data: 'Graph data has been updated'
        });
      });
    }
  } catch (error) {
    console.error('[SW] Error syncing graph data:', error);
    throw error;
  }
}

// Sync user actions when connection is restored
async function syncUserActions() {
  try {
    console.log('[SW] Syncing user actions...');

    // This would sync any queued user actions
    // Implementation depends on your offline action queue strategy

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'USER_ACTIONS_SYNCED',
        data: 'User actions have been synced'
      });
    });
  } catch (error) {
    console.error('[SW] Error syncing user actions:', error);
    throw error;
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/assets/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Polish Football Network', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_GRAPH_DATA') {
    // Cache specific graph data
    event.waitUntil(cacheGraphData(event.data.data));
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear specific cache
    event.waitUntil(clearCache(event.data.cacheName));
  }
});

// Cache graph data manually
async function cacheGraphData(data) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put('/api/graph/data', response);
    console.log('[SW] Graph data cached manually');
  } catch (error) {
    console.error('[SW] Error caching graph data:', error);
  }
}

// Clear specific cache
async function clearCache(cacheName) {
  try {
    if (cacheName) {
      await caches.delete(cacheName);
      console.log(`[SW] Cache cleared: ${cacheName}`);
    } else {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[SW] All caches cleared');
    }
  } catch (error) {
    console.error('[SW] Error clearing cache:', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker loaded');
