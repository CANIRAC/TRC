/* CANIRAC Laguna — Aviso al administrador por cada solicitud de acceso nueva.
   Se dispara cuando alguien se registra en el catálogo (colección "accesos") y
   manda una notificación push a los dispositivos donde el admin tocó
   "Activar" en Autorizaciones de acceso (colección "adminTokens").

   Publicar (una sola vez, desde la carpeta del sitio):
     npm install --prefix functions-accesos
     firebase deploy --only functions:accesos
   Esto NO toca tu otra función de avisos (enviarAvisoPush). */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const TOKEN_INVALIDO = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument"
]);

exports.avisoSolicitudAcceso = onDocumentCreated("accesos/{uid}", async (event) => {
  const d = event.data && event.data.data();
  if (!d) return;

  const db = getFirestore();
  const snap = await db.collection("adminTokens").get();
  const tokens = snap.docs.map((doc) => doc.id);
  if (!tokens.length) {
    console.log("Solicitud nueva, pero el admin no ha activado avisos en ningún dispositivo.");
    return;
  }

  const quien = d.nombre || d.email || "Alguien";
  const donde = [d.restaurante, d.puesto].filter(Boolean).join(" · ");
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    // Mensaje de solo datos: lo muestra firebase-messaging-sw.js
    data: {
      title: "Nueva solicitud de acceso",
      body: donde ? `${quien} — ${donde}` : quien,
      link: "admin.html",
      tag: "acceso-" + event.params.uid,
      icon: "icon-192.png"
    },
    webpush: { headers: { Urgency: "high", TTL: "86400" } }
  });

  // Limpia los dispositivos que ya no existen
  const malos = [];
  res.responses.forEach((r, i) => {
    if (!r.success && r.error && TOKEN_INVALIDO.has(r.error.code)) malos.push(tokens[i]);
  });
  await Promise.all(malos.map((t) => db.collection("adminTokens").doc(t).delete()));
  console.log(`Aviso enviado: ${res.successCount} ok, ${res.failureCount} con error, ${malos.length} eliminados.`);
});
