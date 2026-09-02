/* Service Worker — CANIRAC Laguna PWA
   Sube el número de versión (CACHE) cada vez que cambies archivos
   para que se actualice en los dispositivos. */
const CACHE = "canirac-v6";
const ASSETS = [
  "index.html", "admin.html", "styles.css",
  "app.js", "ui.js", "config.js", "seed.js", "store.js", "pwa.js",
  "manifest.json", "logo.png", "logoapp.png",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // addAll falla si un archivo no existe; lo hacemos tolerante
      Promise.allSettled(ASSETS.map((u) => c.add(new Request(u, { cache: "reload" }))))
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // No interceptar otros orígenes (Firebase / Google Fonts / gstatic, etc.)
  if (url.origin !== self.location.origin) return;

  // Navegación: intenta red; si no hay conexión, usa index.html cacheado
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("index.html")));
    return;
  }

  // Estáticos del mismo origen: cache-first con actualización en segundo plano
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});
