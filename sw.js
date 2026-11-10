const CACHE = 'neuromancer-reader-v3';
const ASSETS = [
  './', './index.html', './styles.css?v=3', './app.js?v=3', './book.json', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  ...Array.from({length: 24}, (_, i) => `./chapters/${String(i + 1).padStart(2, '0')}.html`)
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
