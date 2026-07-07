# CANIRAC Laguna — Sitio web editable

Sitio web oficial de **CANIRAC Laguna** con:

- **Inicio** con logotipo, redes sociales (Instagram y WhatsApp con mensaje predeterminado), botón **Proveedores**, botón **Forma parte del equipo**, **carrusel de fotos** y **video** (editables).
- **Proveedores**: directorio con las 62 empresas, tarjetas con efecto 3D, **buscador** por nombre / giro / característica y **ventana emergente** con datos + botón de **WhatsApp** (mensaje predeterminado) y redes sociales.
- **Forma parte del equipo**: mini formulario (nombre, teléfono, giro) cuyas solicitudes llegan al **panel de administración**.
- **Panel de administración** (`admin.html`): usuario **canirac**. Permite agregar/editar/eliminar proveedores, fotos, descripción; administrar el carrusel y el video; y ver/exportar las solicitudes de equipo.

Todo funciona sobre **Firebase** (base de datos en la nube), de modo que los cambios se sincronizan en **todos los dispositivos** y las solicitudes llegan a tu panel. Si en algún momento no hay conexión, el sitio sigue funcionando con una copia local.

---

## 1) Estructura de archivos

```
index.html            Inicio
proveedores.html      Directorio de proveedores
equipo.html           Formulario "Forma parte del equipo"
admin.html            Panel de administración
css/styles.css        Estilos (colores y tipografías del Brand Book)
js/config.js          ⚙️ Configuración (Firebase, usuario admin, WhatsApp, mensajes)
js/store.js           Conexión con Firebase + respaldo local
js/seed.js            Los 62 proveedores (datos iniciales)
js/ui.js              Logo e íconos
assets/logo.svg       Imagotipo CANIRAC (puedes reemplazarlo por el tuyo)
firestore.rules       Reglas de seguridad de la base de datos (paso 2)
```

---

## 2) Configurar Firebase (una sola vez, ~5 minutos)

Tu proyecto ya está conectado: **canirac-2f1a4**. Solo faltan 3 pasos en la consola de Firebase (https://console.firebase.google.com/).

### Paso A — Crear la base de datos (Firestore)
1. Menú izquierdo → **Compilación → Firestore Database** → **Crear base de datos**.
2. Elige **modo de producción** y la ubicación más cercana (ej. `nam5` / EE. UU.). Crear.
3. Pestaña **Reglas** → borra lo que haya y **pega el contenido del archivo `firestore.rules`** de este proyecto → **Publicar**.

### Paso B — Activar el inicio de sesión del administrador
1. Menú izquierdo → **Compilación → Authentication** → **Comenzar**.
2. En **Sign-in method**, activa **Correo electrónico/contraseña** → Guardar.
3. Pestaña **Users** → **Agregar usuario**:
   - **Correo:** `canirac@caniraclaguna.mx`
   - **Contraseña:** `Ul1979_*`  *(o la que prefieras)*
   - Agregar.

   > Al entrar al panel escribirás **usuario: `canirac`** y esa contraseña. El sistema usa ese correo por detrás.
   > Si cambias el correo, actualízalo también en `js/config.js` (campo `ADMIN.email`).

### Paso C — Autorizar el dominio del sitio
1. **Authentication → Settings → Authorized domains → Add domain**.
2. Agrega: **`canirac.github.io`** (y cualquier otro dominio donde publiques el sitio).

✅ Listo. Firebase queda configurado.

---

## 3) Publicar el sitio en GitHub Pages

1. Sube **todos los archivos** de esta carpeta a tu repositorio `canirac.github.io` (raíz).
2. En GitHub: **Settings → Pages → Branch: `main` / `/root`** → Save.
3. Abre `https://canirac.github.io` en unos minutos.

> Si usas GitHub, arrastra los archivos en “Add file → Upload files”, o usa `git`.

---

## 4) Primer uso del panel

1. Entra a `https://canirac.github.io/admin.html`.
2. Usuario **canirac**, tu contraseña → **Entrar**.
3. Verás el indicador **● Nube (Firebase)** arriba a la derecha.
4. Haz clic en **“Cargar lista inicial (62)”** una sola vez para guardar los 62 proveedores en la nube.
5. ¡Ya puedes editar! Agrega fotos, descripciones, cambia el carrusel, el video, etc.
   Todos los cambios se publican automáticamente para los visitantes.

---

## 5) Cómo se usa el panel

- **Proveedores:** botón ✏️ para editar (datos, WhatsApp, redes, **fotos**, descripción), 🗑️ para eliminar, **+ Agregar proveedor** para uno nuevo.
- **Inicio (carrusel y video):** agrega fotos por **URL** o **subiendo una imagen**; ordénalas o elimínalas. Pega el enlace de **YouTube/Vimeo/.mp4** para el video.
- **Equipo:** aquí llegan las solicitudes del formulario. Puedes **exportarlas a CSV**.

---

## 6) Cambiar textos, mensajes o el logo

- **Mensajes de WhatsApp, Instagram, contraseña local:** archivo `js/config.js`.
- **Tu logo:** reemplaza `assets/logo.svg` por tu archivo (de preferencia en **SVG**; el color teal de marca es `#00758D`). Si solo tienes `logo.png`, colócalo como `assets/logo.png` y avísame para dejar el sitio usándolo.

---

## Colores y tipografías (Brand Book CANIRAC)

- Teal `#00758D` · Rojo `#C23B33` · Naranja `#EE7623` · Gris `#D0CFCD`
- Tipografías web: **Jost** (similar a *Basicaline*, principal) y **Barlow Condensed** (similar a *Akzidenz-Grotesk Condensed*, secundaria).
