/* Service Worker — CANIRAC Laguna PWA (catálogo + panel admin)
   - Código (HTML, JS, CSS, JSON): primero la red, y si no hay conexión, la copia
     guardada. Así nunca se mezclan versiones viejas y nuevas de los archivos.
   - Imágenes y video: primero la copia guardada (más rápido), si no, la red.
   Sube el número de versión (CACHE) cuando cambies la lista de archivos. */
const CACHE = "canirac-v16";
const LIBS = "canirac-libs-v1"; // librerías de Firebase y tipografías (no cambian)
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== LIBS).map((k) => caches.delete(k))))
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

  // Librerías de Firebase (la URL lleva la versión fija, nunca cambia) y archivos
  // de tipografía: se guardan en el teléfono. Antes se descargaban en CADA apertura
  // de la app, y eso hacía que tardara en cargar.
  if ((url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(LIBS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) c.put(req, res.clone()).catch(() => {});
        return res;
      })))
    );
    return;
  }
  // Hoja de tipografías de Google: la guardada al instante y se actualiza en segundo plano
  if (url.hostname === "fonts.googleapis.com") {
    e.respondWith(
      caches.open(LIBS).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }
  // No interceptar otros orígenes (Firestore, Storage, autenticación, etc.)
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
