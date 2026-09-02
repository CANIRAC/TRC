# CANIRAC Laguna — Catálogo de Proveedores (app web)

Sitio tipo **app** con:

- **Inicio**: logo, menú lateral (☰), campana de **notificaciones** (🔔), buscador, **Categorías**, **Proveedores destacados**, banner “¿Eres proveedor?” y sección “¿Por qué elegir CANIRAC Laguna?”.
- **Barra de carga**: al entrar al catálogo se muestra una barra con el mensaje “Cargando catálogo…” para que el usuario sepa que la página está trabajando.
- **Categorías**: explora los proveedores por tipo (Carnes, Bebidas, Limpieza, etc.).
- **Ficha de proveedor** (ventana emergente): datos + botón **WhatsApp** (mensaje predeterminado) + redes + **favorito** + **varias fotos y videos**.
- **Notificaciones**: los avisos que publicas en el admin aparecen en el catálogo al tocar la 🔔 (con punto rojo cuando hay avisos nuevos).
- **Favoritos**: el visitante guarda sus proveedores.
- **Contacto**: WhatsApp, Instagram, Facebook y sitio de la Cámara.
- **Barra inferior**: Inicio · Categorías · Favoritos · Contacto.
- **Registro** “Forma parte del equipo”: las solicitudes llegan al **panel de administración**.
- **Panel de administración** (`admin.html`): agrega/edita/elimina proveedores, asigna **categoría**, marca **destacados**, sube **muchas fotos y videos**, gestiona **categorías** (las existentes ya aparecen), publica **notificaciones**, y ve/exporta las solicitudes de equipo.

Funciona con **Firebase** (nube), así los cambios se sincronizan en todos los dispositivos. Si no hay conexión, usa una copia local para no quedarse en blanco.

> Todo el diseño usa colores e íconos propios (no depende de fotos externas), por eso **siempre se ve completo**, incluso antes de que agregues fotos.

---

## Archivos (todos van juntos, en la raíz del repositorio)
```
index.html         La app (inicio, categorías, favoritos, contacto)
admin.html         Panel de administración
styles.css         Estilos
app.js             Lógica de la app
config.js          ⚙️ Firebase, usuario admin, WhatsApp, contacto
store.js           Firebase (Firestore + Storage) + respaldo local
seed.js            Los 62 proveedores con categorías
ui.js              Logo e íconos
manifest.json      Configuración de la app instalable (PWA)
sw.js              Service worker (funciona sin conexión)
pwa.js             Registro de la PWA
firestore.rules    Reglas de seguridad de la base de datos
storage.rules      Reglas de seguridad de fotos/videos (Storage)
logo.png           Logo principal
logoapp.png        Ícono de la app
```

> **Importante:** todos los archivos van **sueltos en la raíz** del repositorio (sin carpetas `css/`, `js/` ni `assets/`). Así es como funciona en GitHub Pages.

---

## Configurar Firebase (una vez, ~10 min)
Proyecto ya conectado: **canirac-2f1a4** (consola: https://console.firebase.google.com/).

**A. Base de datos**
1. Firestore Database → **Crear base de datos** → modo producción → crear.
2. Pestaña **Reglas** → pega el contenido de `firestore.rules` → **Publicar**.

**B. Acceso admin y de visitantes**
1. Authentication → **Comenzar** → activa **Correo electrónico/contraseña** (para el admin).
2. En la misma pantalla de métodos, activa también **Google** (para que los visitantes puedan
   entrar con su cuenta de Google en el catálogo). Guarda.
3. **Users → Agregar usuario**: correo `canirac@caniraclaguna.mx`, contraseña `Ul1979_*`.
   (Al entrar al panel escribes usuario **canirac** y esa contraseña. Si cambias el correo,
   actualízalo en `config.js` **y** en `firestore.rules` / `storage.rules`.)

> Aunque un visitante inicie sesión con Google, **no** puede modificar nada: las reglas solo
> permiten escribir al correo del administrador. Si un visitante no quiere iniciar sesión, usa
> el botón **“Entrar como invitado”**.

**C. Almacenamiento de fotos y videos (Storage)** — *necesario para subir muchas fotos/videos*
1. En la consola de Firebase entra a **Build → Storage** → **Comenzar / Get started**.
2. Firebase te pedirá activar el **plan Blaze** (pago por uso). Como vas a pagar el espacio,
   elige **Blaze** y confirma. (Puedes poner un **presupuesto/alerta** para no gastar de más.)
3. Elige la ubicación del bucket (deja la que sugiere) y termina.
4. Pestaña **Reglas / Rules** de Storage → pega el contenido de `storage.rules` → **Publicar**.
   - Estas reglas permiten que **cualquiera VEA** las fotos/videos (para el catálogo) y que
     **solo el administrador** (con sesión) pueda **subir o borrar**.

> Si NO activas Storage, la app sigue funcionando: las fotos se guardan comprimidas dentro de la
> base de datos y los videos solo por enlace (YouTube/Vimeo/enlace directo). Con Storage activado
> puedes subir **muchas** fotos y videos pesados directamente desde el panel.

**D. Dominios autorizados**
Authentication → Settings → **Authorized domains → Add domain**: agrega
`canirac.github.io` **y** `proveedores-caniraclaguna.com` (tu dominio).

---

## Publicar
1. Sube **todos los archivos** (sueltos, en la raíz) a tu repositorio (reemplaza los anteriores).
2. GitHub → Settings → Pages (rama `main`).
3. Abre tu sitio. En `admin.html` inicia sesión (**canirac**) y haz clic **una vez** en
   **“Cargar lista inicial (62)”** para guardar los proveedores con sus categorías en la nube.

---

## Cómo usar las funciones nuevas del panel

**Categorías** (pestaña *Categorías* del admin)
- Las categorías **ya existentes** aparecen automáticamente con cuántos proveedores tiene cada una.
- Puedes editar su **nombre**, **color**, ponerle un **emoji** o una **imagen**, y asignar proveedores.

**Notificaciones** (pestaña *Notificaciones* del admin)
- Escribe un **título**, un **mensaje**, opcionalmente un **enlace** y una **imagen**, y **publica**.
- El aviso aparece en el catálogo al tocar la 🔔 (los visitantes ven un punto rojo cuando hay algo nuevo).

**Fotos y videos por proveedor** (al editar un proveedor)
- **Fotos**: puedes subir **varias** (botón de agregar fotos, admite selección múltiple).
- **Videos**: agrega **varios** por enlace (YouTube/Vimeo/enlace directo `.mp4`) o subiéndolos a Storage.
- Todo se muestra en la ficha del proveedor dentro del catálogo.

---

## Cambiar textos, colores o logo
- **Color principal**: en `styles.css`, variable `--primary` (actual `#1877E6`).
  Para usar el **teal de tu marca**, cámbialo a `#00758D`.
- **WhatsApp / Instagram / Facebook / contraseña**: `config.js`.
- **Logo**: reemplaza `logo.png` (y `logoapp.png` para el ícono de la app) por tus archivos.
- **Categorías**: las editas desde el panel (pestaña *Categorías*). La lista base está en `seed.js`.
