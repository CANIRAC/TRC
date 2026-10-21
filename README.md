# CANIRAC Laguna — Catálogo de Proveedores (app web)

Sitio tipo **app** (instalable en teléfono y computadora) con:

- **Acceso controlado**: el catálogo solo se abre para personas **autorizadas**. Cada persona se registra con su
  **correo de Google**, crea y confirma una **contraseña** para esta plataforma y llena sus datos (nombre completo,
  fecha de nacimiento, restaurante y puesto). La solicitud llega al panel → **Autorizaciones de acceso**, donde
  eliges **Confirmar acceso** o **Denegar acceso**. Al confirmar, su correo y contraseña quedan habilitados de forma
  permanente (hasta que tú lo cambies). También pueden recuperar su contraseña por correo.
- **Diseño adaptable**: en teléfono se ve como app (barra inferior, menú lateral); en computadora, con menú superior,
  más columnas y pie de página. El zoom manual está desactivado.
- **Inicio**: logo, menú lateral (☰), campana de **notificaciones** (🔔), buscador, **Categorías**, **Proveedores destacados**, banner “¿Eres proveedor?” y sección “¿Por qué elegir CANIRAC Laguna?”.
- **Barra de carga**: al entrar al catálogo se muestra una barra con el mensaje “Cargando catálogo…” para que el usuario sepa que la página está trabajando.
- **Categorías**: explora los proveedores por tipo (Carnes, Bebidas, Limpieza, etc.).
- **Ficha de proveedor** (ventana emergente): datos + botón **WhatsApp** (mensaje predeterminado) + redes + **favorito** + **varias fotos y videos**.
- **Notificaciones**: los avisos que publicas en el admin aparecen en el catálogo al tocar la 🔔 (con punto rojo cuando hay avisos nuevos).
- **Favoritos**: el visitante guarda sus proveedores.
- **Contacto**: WhatsApp, Instagram, Facebook y sitio de la Cámara.
- **Barra inferior**: Inicio · Categorías · Favoritos · Contacto.
- **“¿Eres proveedor? Regístrate aquí”**: las solicitudes de proveedores llegan al **panel de administración**.
- **Panel de administración** (`admin.html`, también instalable como app): **autoriza o deniega accesos**, agrega/edita/elimina proveedores, asigna **categoría**, marca **destacados**, sube **muchas fotos y videos**, gestiona **categorías** (las existentes ya aparecen), publica **notificaciones**, y ve/exporta las solicitudes de proveedores.

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
manifest.json      Configuración de la app instalable del catálogo (PWA)
admin-manifest.json Configuración de la app instalable del panel (PWA)
sw.js              Service worker (funciona sin conexión)
pwa.js             Registro de la PWA, botón "Instalar app" y bloqueo de zoom
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

**B. Acceso admin y de usuarios del catálogo**
1. Authentication → **Comenzar** → activa **Correo electrónico/contraseña** (lo usan el admin
   **y** los usuarios del catálogo para entrar con la contraseña que crean).
2. En la misma pantalla de métodos, activa también **Google** (con esa cuenta se registran y se
   verifica que el correo sea real). Guarda.
3. **Users → Agregar usuario**: el correo del administrador `canirac@caniraclaguna.mx` con su contraseña.
   (Al entrar al panel escribes usuario **canirac** y esa contraseña. Si cambias el correo,
   actualízalo en `config.js` **y** en `firestore.rules` / `storage.rules`.)
4. *(Opcional)* Authentication → **Templates** → “Restablecimiento de contraseña”: cambia el idioma a
   **Español** para el correo de “¿Olvidaste tu contraseña?”.

> **Importante:** publica las reglas nuevas de `firestore.rules` (paso A.2). Son las que impiden que
> alguien sin autorización lea el catálogo: sin ellas, el bloqueo sería solo visual.
>
> Ningún usuario del catálogo puede modificar nada: las reglas solo permiten escribir al administrador.
> Ya **no existe** la entrada como invitado.

**Cómo funciona el acceso**
1. La persona abre el catálogo → **Solicítalo aquí** → **Registrarme con Google**.
2. Llena nombre completo, fecha de nacimiento, restaurante, puesto, y **crea y confirma su contraseña**.
3. En el panel → **Autorizaciones de acceso** aparece como **Pendiente** (con un globo rojo en la pestaña).
4. **Confirmar acceso** → su pantalla se abre sola y, desde entonces, entra con **correo + contraseña**
   (o con Google). **Denegar acceso** → ve el aviso “Acceso no autorizado” y no puede leer el catálogo.
5. Puedes cambiar la decisión cuando quieras; si retiras un acceso, se le cierra al instante.
   **Eliminar** un registro le permite volver a solicitarlo.

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
3. Abre tu sitio. En `admin.html` inicia sesión (**canirac**) y, si la nube está vacía, haz clic en
   **“Completar lista inicial (62)”**. Solo agrega los que falten: **nunca** borra ni cambia los que ya editaste.
4. Para ver el catálogo como administrador, entra en `index.html` con el correo
   `canirac@caniraclaguna.mx` (o el usuario `canirac`) y tu contraseña.

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
