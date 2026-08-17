const CACHE_NAME = 'academix-pwa-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon.png',
  '/shortcut-focus.png',
  '/shortcut-quiz.png',
  '/shortcut-research.png',
  '/shortcut-puzzles.png',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png',
  '/widget-data.json',
  '/widget-template.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for standard web resources
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  
  // Skip API proxy routes
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Background Sync Event Handler (PWABuilder Resiliency Requirement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-app-data' || event.tag === 'sync-notes' || event.tag === 'background-sync') {
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('[Service Worker] Background sync executed for tag:', event.tag);
      })
    );
  }
});

// Periodic Background Sync Event Handler (PWABuilder Instant Data Requirement)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'get-daily-challenges' || event.tag === 'sync-content' || event.tag === 'periodic-data-update') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch('/widget-data.json').then((response) => {
          if (response.ok) {
            cache.put('/widget-data.json', response);
          }
        });
      }).catch((err) => console.log('[Service Worker] Periodic sync error:', err))
    );
  }
});

// Push Notification Event Handler (PWABuilder Re-engagement Requirement)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Academix Aletheon',
    body: 'New study challenge or research insight available!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const dataJson = event.data.json();
      payload = { ...payload, ...dataJson };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: payload.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Open Academix' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
