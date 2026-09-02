# Guía: Avisos push al celular (Firebase Cloud Function)

Con esto, **cada vez que publiques una notificación en el panel de administración, le llegará una alerta al celular** a todos los que activaron los avisos (aunque no tengan la app abierta).

> **Aviso honesto:** esta parte es la más técnica de todo el proyecto. Se hace **una sola vez** desde una computadora (no desde el celular). Sigue los pasos tal cual; si te atoras en alguno, mándame en cuál y te ayudo.

---

## Cómo funciona (en simple)
1. El visitante entra al catálogo y toca la campana 🔔 → **“Activar”** avisos. Su celular queda registrado.
2. Tú publicas una notificación en el admin.
3. Una pequeña “función” en Firebase se da cuenta y **manda el push** a todos los celulares registrados.

---

## Antes de empezar necesitas
- Una **computadora** (Windows o Mac).
- Tu proyecto de Firebase **canirac-2f1a4** (ya lo tienes) con el **plan Blaze** activo (ya lo tienes).
- Los archivos del sitio (el zip que te envié), descomprimidos en una carpeta.

---

## Parte 1 — Generar la “clave VAPID” (2 min)
Esta clave permite que el navegador reciba push.

1. Entra a la consola: <https://console.firebase.google.com/> → proyecto **canirac-2f1a4**.
2. Arriba a la izquierda, el engrane ⚙️ → **Configuración del proyecto**.
3. Pestaña **Cloud Messaging**.
4. Baja a **“Certificados push web” (Web Push certificates)** → botón **Generar par de claves**.
5. Copia la clave larga que aparece (empieza con letras y números).
6. Abre el archivo **`config.js`** del sitio y pégala entre las comillas:
   ```js
   export const VAPID_KEY = "PEGA_AQUI_TU_CLAVE";
   ```
7. Guarda el archivo.

---

## Parte 2 — Instalar las herramientas (una sola vez)
1. Instala **Node.js** (versión LTS) desde <https://nodejs.org> → descarga, instala con “Siguiente, siguiente”.
2. Abre la **Terminal**:
   - **Windows:** menú inicio → escribe `cmd` → Enter.
   - **Mac:** Aplicaciones → Utilidades → **Terminal**.
3. Instala las herramientas de Firebase (copia y pega, luego Enter):
   ```
   npm install -g firebase-tools
   ```
4. Inicia sesión con tu cuenta de Google (la misma de Firebase):
   ```
   firebase login
   ```
   Se abre el navegador → aceptas → vuelves a la terminal.

---

## Parte 3 — Publicar la función (5 min)
1. En la terminal, **entra a la carpeta del sitio** (donde está `firebase.json`). Ejemplo:
   ```
   cd Downloads/canirac
   ```
   (Cambia la ruta por donde descomprimiste los archivos.)
2. Conecta la carpeta con tu proyecto:
   ```
   firebase use canirac-2f1a4
   ```
3. Instala lo que necesita la función:
   ```
   npm install --prefix functions
   ```
4. Publica la función:
   ```
   firebase deploy --only functions
   ```
   Tarda 1–2 minutos. Al final debe decir **Deploy complete!** y el nombre `enviarAvisoPush`.

> Si te pide “habilitar APIs” (Cloud Functions, Cloud Build, Artifact Registry), acepta con **Yes**. Es normal la primera vez.

---

## Parte 4 — Publicar las reglas actualizadas
Necesitas las reglas nuevas (para los tokens de push y los favoritos por cuenta). Dos opciones:

**Opción fácil (desde la terminal):**
```
firebase deploy --only firestore:rules,storage:rules
```

**Opción manual (desde la consola):**
- Firestore → **Reglas** → pega el contenido de `firestore.rules` → **Publicar**.
- Storage → **Reglas** → pega el contenido de `storage.rules` → **Publicar**.

---

## Parte 5 — Subir el sitio a GitHub
Sube a tu repositorio los archivos del sitio (los mismos de siempre) **incluyendo los nuevos**:
- `firebase-messaging-sw.js`  *(nuevo — es indispensable)*
- `config.js` *(ya con tu clave VAPID pegada)*
- `store.js`, `app.js`, `styles.css`, `index.html` *(actualizados)*

> **Importante:** activa también **Google** y **Correo/contraseña** en Authentication (si no lo has hecho), porque el push convive con el inicio de sesión.

---

## Parte 6 — Probar 🎉
1. Abre tu sitio en el **celular**.
2. Toca la campana 🔔 → **Activar** → acepta el permiso de notificaciones.
3. Desde tu computadora (o el mismo cel), entra al **admin** y publica una **notificación nueva**.
4. En unos segundos, **te llega el push al celular**. ✅

---

## En iPhone (importante)
El push web en iPhone **solo funciona si**:
- El iPhone tiene **iOS 16.4 o más nuevo**, y
- Agregaste la app a la pantalla de inicio: en Safari, botón **Compartir** → **Agregar a pantalla de inicio**, y la **abres desde ese ícono** (no desde Safari).

Recién ahí aparecerá el permiso para activar los avisos.

---

## Costo
Con el plan Blaze, enviar estas notificaciones es prácticamente **gratis** para tu volumen (los primeros 2 millones de invocaciones de funciones al mes son sin costo, y FCM no cobra por los mensajes). Puedes ponerle una **alerta de presupuesto** en Google Cloud para tu tranquilidad.

---

## Si algo falla
- **“Falta configurar la clave VAPID”** al activar → no pegaste la clave en `config.js` (Parte 1) o no subiste ese archivo.
- **No llega el push** → revisa que exista el archivo `firebase-messaging-sw.js` en la raíz del sitio y que la función se haya publicado (Parte 3).
- **En iPhone no aparece “Activar”** → falta agregar la app a la pantalla de inicio y abrirla desde ahí.
- **La función no envía** → en la consola: **Functions → Registros (Logs)** para ver el mensaje; compárteme lo que diga.

¿Te atoras en algún paso? Dime el número del paso y te guío.
