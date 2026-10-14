// cache offline: la partita funziona anche senza rete
const CACHE = 'fmv-1.0.0';
const FILES = ["./", "fonts/barlow-semi-condensed-latin-400-normal.woff2", "fonts/barlow-semi-condensed-latin-500-normal.woff2", "fonts/barlow-semi-condensed-latin-600-normal.woff2", "fonts/barlow-semi-condensed-latin-700-normal.woff2", "fonts/barlow-semi-condensed-latin-800-normal.woff2", "fonts/barlow-semi-condensed-latin-900-normal.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "manifest.webmanifest"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url); if (u.origin !== location.origin) return;
  // pagina: prima la rete (aggiornamenti), poi la cache; il resto: prima la cache
  if (e.request.mode === 'navigate') e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; }).catch(() => caches.match('index.html')));
  else e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
