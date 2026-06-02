const CACHE_NAME = 'babypulse-static-v1';
const DYNAMIC_CACHE_NAME = 'babypulse-dynamic-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://img.icons8.com/color/512/baby-bottle.png',
  'https://img.icons8.com/color/192/baby-bottle.png'
];

// Verify if a request URL belongs to Google Auth or Firestore and should be bypassed
function isFirestoreOrAuth(url) {
  return (
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com') ||
    url.includes('/_ah/') ||
    url.includes('firebase')
  );
}

// 1. Install Event: Pre-cache core structural components
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline structural shells');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Evicting legacy cache segment:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event Interceptor
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // Bypass sync queries for Firebase database, Auth and other cloud endpoints
  if (isFirestoreOrAuth(requestUrl) || event.request.method !== 'GET') {
    return; // Pass through to browser/network engine
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Create a network fetch call
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          // If valid response, clone and cache inside dynamic container
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.log('[Service Worker] Fetch failed, relying on offline cache fallback', error);
          // If completely offline and caching fails, check if the request is for navigation pages
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });

      // Prefer cached responses for speed, but fallback/race to network
      return cachedResponse || networkFetch;
    })
  );
});
