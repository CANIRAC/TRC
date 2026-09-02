/* CANIRAC Laguna — Service Worker de mensajería (avisos push)
   Recibe los avisos aunque la app esté cerrada y SIEMPRE los muestra.
   Es un manejador de push "puro" (sin SDK), que es lo más confiable en iPhone.
   No necesitas editar este archivo. */

// Aviso recibido (app cerrada o en segundo plano)
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  const d = payload.data || payload.notification || payload || {};
  const title = d.title || "CANIRAC Laguna";
  const options = {
    body: d.body || "Tienes un nuevo aviso",
    icon: d.icon || "icon-192.png",
    badge: "icon-192.png",
    data: { url: d.link || d.url || "index.html" },
    tag: "canirac-aviso"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Al tocar el aviso, abre el catálogo
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) { if ("focus" in w) return w.focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
