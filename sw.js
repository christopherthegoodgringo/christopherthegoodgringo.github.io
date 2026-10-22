// Service worker for the installable apps (travelers "/", business owners "/owner/", admin "/admin/").
// Pages and listing data: network first, so visitors always get the latest; the saved copy is used when offline.
// Scripts, styles, images: saved copy first, refreshed in the background. Videos, Supabase, Stripe and other sites: never touched.
const VERSION = 'gg-2026-10-22c';
const CORE = VERSION + '-core', PAGES = VERSION + '-pages', FILES = VERSION + '-files';
const PRECACHE = ['/offline.html', '/assets/cgg-wordmark.svg?v=1', '/assets/app/icon-any-192.png', '/assets/app/apple-touch-icon-180.png?v=1'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function networkFirst(req, cacheName, fallback) {
  try {
    const res = await fetch(req);
    if (res.ok) { const c = await caches.open(cacheName); c.put(req, res.clone()); trim(cacheName, 80); }
    return res;
  } catch (err) {
    const hit = await caches.match(req) || await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (fallback) { const off = await caches.match(fallback); if (off) return off; }
    throw err;
  }
}

async function staleWhileRevalidate(req, event) {
  const c = await caches.open(FILES);
  const hit = await c.match(req);
  const fresh = fetch(req).then((res) => { if (res.ok) { c.put(req, res.clone()); trim(FILES, 150); } return res; });
  if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
  try { return await fresh; } catch (err) {
    const old = await caches.match(req, { ignoreSearch: true }); // an older ?v= of the same file still works offline
    if (old) return old;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/media/') || url.pathname === '/sw.js') return;

  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, PAGES, '/offline.html')); return; }
  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/i18n/') || url.pathname.endsWith('.webmanifest')) {
    e.respondWith(networkFirst(req, PAGES)); return;
  }
  if (/\.(js|css|svg|png|jpe?g|webp|gif|ico|woff2?)$/i.test(url.pathname)) { e.respondWith(staleWhileRevalidate(req, e)); return; }
});
