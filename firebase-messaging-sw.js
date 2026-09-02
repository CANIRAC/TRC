/* CANIRAC Laguna — Service Worker de mensajería (avisos push)
   Recibe los avisos cuando la app está cerrada o en segundo plano.
   No necesitas editar este archivo. */
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBQfqXwOGRSo1manTh6y_ouyfE_wY9UrVM",
  authDomain: "canirac-2f1a4.firebaseapp.com",
  projectId: "canirac-2f1a4",
  storageBucket: "canirac-2f1a4.firebasestorage.app",
  messagingSenderId: "115819887894",
  appId: "1:115819887894:web:5e3ca8de54c36832482437",
  measurementId: "G-NM08HT0Y96"
});

const messaging = firebase.messaging();

// Aviso recibido con la app cerrada / en segundo plano
messaging.onBackgroundMessage((payload) => {
  const n = (payload && payload.notification) || {};
  const titulo = n.title || "CANIRAC Laguna";
  const opciones = {
    body: n.body || "Tienes un nuevo aviso",
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { url: (payload.fcmOptions && payload.fcmOptions.link) || "index.html" }
  };
  self.registration.showNotification(titulo, opciones);
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
