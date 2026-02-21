// IOPPS Service Worker
const CACHE_NAME = "iopps-v1";

// Static assets to pre-cache on install
const PRECACHE_URLS = ["/offline"];

// Offline fallback HTML (served when network is unavailable and no cache hit)
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Offline — IOPPS</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0B1D2C;color:#fff;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}
    .card{max-width:360px}
    .icon{width:64px;height:64px;margin:0 auto 24px;border-radius:16px;
          background:linear-gradient(135deg,#0F2B4C,#0D9488);display:flex;align-items:center;justify-content:center;
          font-weight:900;font-size:26px;letter-spacing:2px}
    h1{font-size:22px;margin-bottom:8px}
    p{color:rgba(255,255,255,.6);font-size:15px;line-height:1.5;margin-bottom:24px}
    button{background:#0D9488;color:#fff;border:none;padding:12px 32px;border-radius:12px;
           font-size:15px;font-weight:600;cursor:pointer}
    button:hover{opacity:.9}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">IO</div>
    <h1>You're Offline</h1>
    <p>IOPPS needs an internet connection. Check your connection and try again.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>`;

// Install: pre-cache offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the offline fallback as a response
      const offlineResponse = new Response(OFFLINE_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
      return cache.put("/offline", offlineResponse);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigation and API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (Firebase, analytics, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/offline"))
    );
    return;
  }

  // API / data requests (e.g. Next.js RSC, API routes): network-only
  if (
    request.url.includes("/api/") ||
    request.url.includes("/_next/data/") ||
    request.headers.get("RSC") === "1"
  ) {
    return;
  }

  // Static assets: cache-first
  if (
    request.url.match(/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/) ||
    request.url.includes("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            // Only cache successful responses
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }
});
