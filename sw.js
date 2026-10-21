/* Service Worker — CANIRAC Laguna PWA (catálogo + panel admin)
   - Código (HTML, JS, CSS, JSON): primero la red, y si no hay conexión, la copia
     guardada. Así nunca se mezclan versiones viejas y nuevas de los archivos.
   - Imágenes y video: primero la copia guardada (más rápido), si no, la red.
   Sube el número de versión (CACHE) cuando cambies la lista de archivos. */
const CACHE = "canirac-v13";
const ASSETS = [
  "./", "index.html", "admin.html", "styles.css",
  "app.js", "ui.js", "config.js", "seed.js", "store.js", "pwa.js",
  "manifest.json", "admin-manifest.json", "logo.png", "logoapp.png",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting(); // la versión nueva toma el control en cuanto se instala
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

function putInCache(req, res) {
  if (res && res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // No interceptar otros orígenes (Firebase / Google Fonts / gstatic, etc.)
  if (url.origin !== self.location.origin) return;
  // Videos grandes (peticiones por rangos): directo a la red
  if (req.headers.has("range")) return;

  // Navegación: red; sin conexión, la MISMA página guardada (admin.html sigue siendo el panel)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => putInCache(req, res)).catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || caches.match(/admin(\.html)?$/.test(url.pathname) ? "admin.html" : "index.html"))
      )
    );
    return;
  }

  const isCode = /\.(js|css|json|html)$/.test(url.pathname);
  if (isCode) {
    e.respondWith(
      fetch(req).then((res) => putInCache(req, res)).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Imágenes, íconos y demás: copia guardada primero
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => putInCache(req, res)))
  );
});
