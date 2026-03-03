const SW_PREFIX = "zulari";

function getVersionFromSelf() {
  try {
    const u = new URL(self.location.href);
    return u.searchParams.get("h") || "v1";
  } catch (_) {
    return "v1";
  }
}

const VERSION = getVersionFromSelf();
const STATIC_CACHE = `${SW_PREFIX}-static-${VERSION}`;
const PAGE_CACHE = `${SW_PREFIX}-pages-${VERSION}`;

function isSameOrigin(urlString) {
  try {
    const url = new URL(urlString);
    return url.origin === self.location.origin;
  } catch (_) {
    return false;
  }
}

function isStaticRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname || "/";
  const dest = request.destination;

  if (dest === "style" || dest === "script" || dest === "font" || dest === "image") return true;
  if (path === "/style.css") return true;
  if (path.startsWith("/js/")) return true;
  if (path.startsWith("/vendor/")) return true;
  if (path.startsWith("/images/")) return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(`${SW_PREFIX}-`) && !name.endsWith(`-${VERSION}`))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw _;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!request || request.method !== "GET") return;
  if (!isSameOrigin(request.url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  if (isStaticRequest(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});
