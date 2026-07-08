# CANIRAC Laguna — Directorio de Proveedores (app web)

Sitio tipo **app** con:

- **Inicio**: logo, menú lateral (☰), buscador, **Categorías**, **Proveedores destacados**, banner “¿Eres proveedor?” y sección “¿Por qué elegir CANIRAC Laguna?”.
- **Categorías**: explora los proveedores por tipo (Carnes, Bebidas, Limpieza, etc.).
- **Ficha de proveedor** (ventana emergente): datos + botón **WhatsApp** (mensaje predeterminado) + redes + **favorito**.
- **Favoritos**: el visitante guarda sus proveedores.
- **Contacto**: WhatsApp, Instagram, Facebook y sitio de la Cámara.
- **Barra inferior**: Inicio · Categorías · Favoritos · Contacto.
- **Registro** “Forma parte del equipo”: las solicitudes llegan al **panel de administración**.
- **Panel de administración** (`admin.html`): agrega/edita/elimina proveedores, asigna **categoría**, marca **destacados**, sube **fotos**, y ve/exporta las solicitudes de equipo.

Funciona con **Firebase** (nube), así los cambios se sincronizan en todos los dispositivos. Si no hay conexión, usa una copia local para no quedarse en blanco.

> Todo el diseño usa colores e íconos propios (no depende de fotos externas), por eso **siempre se ve completo**, incluso antes de que agregues fotos.

---

## Archivos
```
index.html         La app (inicio, categorías, favoritos, contacto)
admin.html         Panel de administración
css/styles.css     Estilos
js/app.js          Lógica de la app
js/config.js       ⚙️ Firebase, usuario admin, WhatsApp, contacto
js/store.js        Firebase + respaldo local
js/seed.js         Los 62 proveedores con categorías
js/ui.js           Logo e íconos
firestore.rules    Reglas de seguridad de la base de datos
```

---

## Configurar Firebase (una vez, ~5 min)
Proyecto ya conectado: **canirac-2f1a4** (consola: https://console.firebase.google.com/).

**A. Base de datos**
1. Firestore Database → **Crear base de datos** → modo producción → crear.
2. Pestaña **Reglas** → pega el contenido de `firestore.rules` → **Publicar**.

**B. Acceso admin**
1. Authentication → **Comenzar** → activa **Correo electrónico/contraseña**.
2. **Users → Agregar usuario**: correo `canirac@caniraclaguna.mx`, contraseña `Ul1979_*`.
   (Al entrar escribes usuario **canirac** y esa contraseña. Si cambias el correo, actualízalo en `js/config.js`.)

**C. Dominios autorizados**
Authentication → Settings → **Authorized domains → Add domain**: agrega
`canirac.github.io` **y** `proveedores-caniraclaguna.com` (tu dominio).

---

## Publicar
1. Sube **todos los archivos** a tu repositorio (reemplaza los anteriores).
2. GitHub → Settings → Pages (rama `main`).
3. Abre tu sitio. En `admin.html` inicia sesión (**canirac**) y haz clic **una vez** en
   **“Cargar lista inicial (62)”** para guardar los proveedores con sus categorías en la nube.

---

## Cambiar textos, colores o logo
- **Color principal**: en `css/styles.css`, variable `--primary` (actual `#1877E6`).
  Para usar el **teal de tu marca**, cámbialo a `#00758D`.
- **WhatsApp / Instagram / Facebook / contraseña**: `js/config.js`.
- **Logo**: reemplaza `assets/logo.svg` por tu archivo (SVG de preferencia).
- **Categorías**: se editan en `js/seed.js` (lista `CATEGORIAS`). Cada proveedor tiene su
  categoría editable desde el panel de administración.
