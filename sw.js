// Service Worker for Coffee Roaster PWA
// Version 2.0

const CACHE_NAME = 'coffee-roaster-v2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install event - cache all files
self.addEventListener('install', event => {
  console.log('☕ Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('☕ Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('☕ Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('☕ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the new response
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(() => {
          // If both cache and network fail, return offline page
          return caches.match('/index.html');
        });
      })
  );
});

// Background sync for saving roasts when offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-roasts') {
    console.log('☕ Service Worker: Syncing roasts...');
    event.waitUntil(syncRoasts());
  }
});

async function syncRoasts() {
  // This is a placeholder for future sync functionality
  // For now, localStorage handles everything locally
  console.log('☕ Sync: All roasts are stored locally');
  return Promise.resolve();
}

// Push notification support (for future features)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New roasting notification!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification('Coffee Roaster', options)
  );
});

console.log('☕ Service Worker: Loaded successfully');
