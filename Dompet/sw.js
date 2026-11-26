// Service worker Nusa Wallet. Naikkan CACHE_VERSION setiap kali file aplikasi diperbarui.
const CACHE_VERSION = 'nusawallet-v4';
const APP_SHELL = [
  './', './index.html', './app.css', './app.js', './nux-bridge.js', './manifest.json',
  './lib/nusa-core.js', './lib/nusa-seed.js', './lib/qrcode.js',
  './icons/logo.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Hanya file milik aplikasi ini yang ditangani. API/explorer/situs lain langsung ke jaringan (tidak pernah di-cache).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
