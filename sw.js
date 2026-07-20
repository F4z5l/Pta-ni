/**
 * sw.js — minimal, honest service worker.
 * Precaches the app shell so LUMEN opens instantly (and works offline) after
 * the first visit. Runtime requests use a cache-first strategy for same-origin
 * static assets and fall back to network otherwise.
 */

const CACHE_NAME = "lumen-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/config.js",
  "./js/mockData.js",
  "./js/api.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/router.js",
  "./js/screens.js",
  "./js/app.js",
  "./icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const isSameOrigin = new URL(request.url).origin === self.location.origin;
  if (!isSameOrigin) return; // let fonts/images/CDN go straight to network

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
