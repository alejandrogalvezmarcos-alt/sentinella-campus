// Service worker: funciona sense connexió (xarxa primer, memòria cau si no n'hi ha)
const CACHE = 'sentinella-v3';
const SHELL = ['./', 'index.html', 'assets/styles.css', 'assets/icon.svg', 'assets/alpha.png', 'manifest.webmanifest', 'js/app.js', 'js/util.js', 'js/i18n.js', 'js/store.js', 'js/content.js', 'js/psico.js', 'js/fitness.js', 'js/charts.js', 'js/config.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
