// Kaasni service worker: makes the site installable as an app and shows a friendly page
// when there is no internet. Deliberately caches NOTHING else: no pages, no API data and
// no app code, so nothing private is ever kept on the device and updates are instant.
const CACHE = 'kz-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Page loads go to the network as usual; only when that fails is the offline page shown.
// Every other request (API, scripts, images, sockets) is left to the browser untouched.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
