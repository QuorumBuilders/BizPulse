/**
 * BizPulse — Service Worker
 *
 * Strategy: App Shell (cache-first) + API (network-first with fallback).
 *
 * Cache-first for the Next.js app shell (HTML, JS, CSS, fonts, icons).
 * Network-first for API requests — always try the network, fall back to
 * a cached response if offline. IndexedDB (Dexie) handles the real
 * offline data layer; the SW is purely for installability and shell caching.
 */

const CACHE_NAME = 'bizpulse-v1';
const API_ORIGIN = self.location.origin;

// Static assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ---------------------------------------------------------------------------
// Install: pre-cache app shell
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate: delete old caches
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch: cache-first for shell, network-first for API
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (except fonts)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g')) return;

  // API requests: network-first, no caching (data lives in IndexedDB)
  if (url.pathname.startsWith('/api/') || url.port === '8000') {
    event.respondWith(fetch(request).catch(() => new Response('{}', { status: 503 })));
    return;
  }

  // Next.js data fetching (_next/data): network-first
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const cloned = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell + static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        // Only cache successful responses for same-origin static assets
        if (res.ok && url.origin === self.location.origin) {
          const cloned = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return res;
      });
    })
  );
});
