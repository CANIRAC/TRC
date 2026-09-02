// ============================================================
//  CAPA DE DATOS CANIRAC LAGUNA
//  Usa Firebase (Firestore + Auth) cuando está disponible.
//  Si no hay conexión o Firebase no está configurado, cae
//  automáticamente a guardado local (localStorage) para que
//  el sitio siempre funcione.
// ============================================================

import { firebaseConfig, USE_FIREBASE, ADMIN, VAPID_KEY } from "./config.js";
import { SEED_PROVEEDORES, DEFAULT_SITE } from "./seed.js";

const FB_VER = "10.12.5";
const LS = {
  prov: "canirac_providers_v1",
  site: "canirac_site_v1",
  team: "canirac_equipo_v1",
  admin: "canirac_admin_v1"
};

let _app = null;     // instancia de la app de firebase
let _db = null;
let _auth = null;
let _fs = null;      // funciones de firestore
let _authFns = null; // funciones de auth
let _storage = null;    // instancia de storage
let _storageFns = null; // funciones de storage
let _mode = "local"; // 'cloud' | 'local'
let _ready = null;
const _adminListeners = [];

// ---------- utilidades locales ----------
function lget(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
function lset(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function notifyAdmin() {
  const v = isAdmin();
  _adminListeners.forEach(fn => { try { fn(v); } catch (e) {} });
}

// ---------- inicialización ----------
export function init() {
  if (_ready) return _ready;
  _ready = (async () => {
    if (!USE_FIREBASE) { _mode = "local"; return _mode; }
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 9000));
      const [{ initializeApp }, fs, authMod, storageMod] = await Promise.race([
        Promise.all([
          import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
          import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`),
          import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth.js`),
          import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-storage.js`)
        ]),
        timeout
      ]);
      const app = initializeApp(firebaseConfig);
      _app = app;
      _fs = fs;
      _authFns = authMod;
      _db = fs.getFirestore(app);
      _auth = authMod.getAuth(app);
      try { _storageFns = storageMod; _storage = storageMod.getStorage(app); } catch (e) { _storage = null; }
      _mode = "cloud";
      authMod.onAuthStateChanged(_auth, () => notifyAdmin());
      return _mode;
    } catch (e) {
      console.warn("[CANIRAC] Firebase no disponible, usando modo local:", e);
      _mode = "local";
      return _mode;
    }
  })();
  return _ready;
}

export function getMode() { return _mode; }

// ============================================================
//  PROVEEDORES
// ============================================================
export async function getProviders() {
  await init();
  if (_mode === "cloud") {
    try {
      const ref = _fs.doc(_db, "content", "providers");
      const snap = await _fs.getDoc(ref);
      if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length) {
        return snap.data().list;
      }
    } catch (e) { console.warn("getProviders cloud fail -> seed/local", e); }
  }
  return lget(LS.prov, clone(SEED_PROVEEDORES));
}

export async function saveProviders(list) {
  await init();
  lset(LS.prov, list); // siempre guarda copia local
  if (_mode === "cloud") {
    const ref = _fs.doc(_db, "content", "providers");
    await _fs.setDoc(ref, { list, updatedAt: Date.now() });
  }
  return true;
}

// ============================================================
//  CONTENIDO DEL INICIO (carrusel, video, textos)
// ============================================================
export async function getSite() {
  await init();
  if (_mode === "cloud") {
    try {
      const ref = _fs.doc(_db, "content", "site");
      const snap = await _fs.getDoc(ref);
      if (snap.exists()) return Object.assign(clone(DEFAULT_SITE), snap.data());
    } catch (e) { console.warn("getSite cloud fail -> default/local", e); }
  }
  return lget(LS.site, clone(DEFAULT_SITE));
}

export async function saveSite(site) {
  await init();
  lset(LS.site, site);
  if (_mode === "cloud") {
    const ref = _fs.doc(_db, "content", "site");
    await _fs.setDoc(ref, site);
  }
  return true;
}

// ============================================================
//  REGISTROS "FORMA PARTE DEL EQUIPO"
// ============================================================
export async function addEquipo(entry) {
  await init();
  const record = {
    nombre: entry.nombre || "",
    telefono: entry.telefono || "",
    giro: entry.giro || "",
    mensaje: entry.mensaje || "",
    createdAt: Date.now()
  };
  if (_mode === "cloud") {
    const col = _fs.collection(_db, "equipo");
    const res = await _fs.addDoc(col, record);
    return res.id;
  }
  // local
  const list = lget(LS.team, []);
  record.id = "loc_" + Date.now();
  list.unshift(record);
  lset(LS.team, list);
  return record.id;
}

export async function getEquipo() {
  await init();
  if (_mode === "cloud") {
    const col = _fs.collection(_db, "equipo");
    const q = _fs.query(col, _fs.orderBy("createdAt", "desc"));
    const snap = await _fs.getDocs(q);
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }
  return lget(LS.team, []);
}

export async function deleteEquipo(id) {
  await init();
  if (_mode === "cloud") {
    await _fs.deleteDoc(_fs.doc(_db, "equipo", id));
    return true;
  }
  const list = lget(LS.team, []).filter(x => x.id !== id);
  lset(LS.team, list);
  return true;
}

// ============================================================
//  ADMINISTRADOR
// ============================================================
export async function adminLogin(usuario, password) {
  await init();
  usuario = (usuario || "").trim();
  if (_mode === "cloud") {
    const email = usuario.includes("@") ? usuario : ADMIN.email;
    await _authFns.signInWithEmailAndPassword(_auth, email, password);
    notifyAdmin();
    return true;
  }
  // local
  if (usuario === ADMIN.usuario && password === ADMIN.passwordLocal) {
    sessionStorage.setItem(LS.admin, "1");
    notifyAdmin();
    return true;
  }
  throw new Error("Usuario o contraseña incorrectos.");
}

export async function adminLogout() {
  await init();
  if (_mode === "cloud" && _auth) {
    try { await _authFns.signOut(_auth); } catch (e) {}
  }
  sessionStorage.removeItem(LS.admin);
  notifyAdmin();
}

export function isAdmin() {
  // En la nube, SOLO el correo del administrador cuenta como admin.
  // (Así, aunque un visitante inicie sesión con Google, no obtiene acceso de admin.)
  if (_mode === "cloud") return !!(_auth && _auth.currentUser && _auth.currentUser.email === ADMIN.email);
  return sessionStorage.getItem(LS.admin) === "1";
}

// ---------- Acceso de VISITANTES con Google (solo para el catálogo) ----------
export async function googleLogin() {
  await init();
  if (_mode !== "cloud" || !_auth || !_authFns || !_authFns.GoogleAuthProvider) {
    throw new Error("sin-nube");
  }
  const provider = new _authFns.GoogleAuthProvider();
  try { provider.setCustomParameters({ prompt: "select_account" }); } catch (e) {}
  const res = await _authFns.signInWithPopup(_auth, provider);
  return res.user;
}
export function currentUser() {
  return (_auth && _auth.currentUser) ? _auth.currentUser : null;
}
export async function logout() {
  await init();
  if (_mode === "cloud" && _auth) { try { await _authFns.signOut(_auth); } catch (e) {} }
  sessionStorage.removeItem(LS.admin);
  notifyAdmin();
}

// ---------- Datos por usuario (favoritos, búsquedas) ----------
// Se guardan en Firestore en users/{uid} SOLO si el visitante inició sesión.
export async function getUserData() {
  await init();
  const u = currentUser();
  if (_mode === "cloud" && u && _db && _fs) {
    try {
      const ref = _fs.doc(_db, "users", u.uid);
      const snap = await _fs.getDoc(ref);
      return snap.exists() ? snap.data() : {};
    } catch (e) { console.warn("getUserData", e); }
  }
  return null; // invitado / sin nube -> se usa el guardado local
}
export async function saveUserData(data) {
  await init();
  const u = currentUser();
  if (_mode === "cloud" && u && _db && _fs) {
    try {
      const ref = _fs.doc(_db, "users", u.uid);
      await _fs.setDoc(ref, Object.assign({ email: u.email || "", nombre: u.displayName || "", updatedAt: Date.now() }, data), { merge: true });
      return true;
    } catch (e) { console.warn("saveUserData", e); }
  }
  return false;
}

// ============================================================
//  AVISOS PUSH (Firebase Cloud Messaging) — lado del cliente
// ============================================================
// ¿Este dispositivo/navegador puede recibir push?
export function pushSupported() {
  return (typeof window !== "undefined") &&
         ("Notification" in window) &&
         ("serviceWorker" in navigator) &&
         (typeof PushManager !== "undefined");
}

// Núcleo del registro de push. interactive=true pide permiso (botón "Activar");
// interactive=false solo actúa si YA hay permiso (auto-reparación al abrir la app).
async function _registerPush(interactive) {
  await init();
  if (_mode !== "cloud") { if (interactive) throw new Error("sin-nube"); return null; }
  if (!pushSupported()) { if (interactive) throw new Error("sin-soporte"); return null; }
  if (!VAPID_KEY) { if (interactive) throw new Error("falta-vapid"); return null; }

  if (interactive) {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") throw new Error("permiso-denegado");
  } else if (Notification.permission !== "granted") {
    return null; // sin permiso todavía: no hacemos nada
  }

  const msgMod = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-messaging.js`);
  if (msgMod.isSupported) {
    const ok = await msgMod.isSupported().catch(() => false);
    if (!ok) { if (interactive) throw new Error("sin-soporte"); return null; }
  }
  const messaging = msgMod.getMessaging(_app);

  // Registrar el SW de mensajería en SU PROPIO ámbito, para que NO choque con
  // el service worker del catálogo (sw.js). Ese choque hacía que el push llegara
  // pero nadie lo mostrara.
  let reg;
  try {
    reg = await navigator.serviceWorker.register("firebase-messaging-sw.js", { scope: "/firebase-cloud-messaging-push-scope" });
  } catch (e) {
    try { reg = await navigator.serviceWorker.register("firebase-messaging-sw.js"); } catch (e2) { reg = undefined; }
  }

  const token = await msgMod.getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) { if (interactive) throw new Error("sin-token"); return null; }

  // Guardar/actualizar el token. En modo interactivo, si falla, avisamos (throw).
  try {
    await _fs.setDoc(_fs.doc(_db, "pushTokens", token), {
      token,
      email: (currentUser() && currentUser().email) || "",
      ua: (navigator.userAgent || "").slice(0, 140),
      createdAt: Date.now()
    }, { merge: true });
  } catch (e) { console.warn("guardar token push", e); if (interactive) throw e; }

  // Aviso en primer plano (app abierta): mostrar la notificación del sistema.
  try {
    if (msgMod.onMessage) {
      msgMod.onMessage(messaging, (payload) => {
        const d = (payload && (payload.data || payload.notification)) || {};
        try {
          if (reg && reg.showNotification) {
            reg.showNotification(d.title || "CANIRAC Laguna", {
              body: d.body || "",
              icon: d.icon || "icon-192.png",
              data: { url: d.link || d.url || "index.html" },
              tag: "canirac-aviso"
            });
          }
        } catch (e) {}
      });
    }
  } catch (e) {}

  return token;
}

// Botón "Activar": pide permiso y registra. Lanza Error con código si falla.
export async function enablePush() { return _registerPush(true); }

// Al abrir la app: si ya se dio permiso, vuelve a guardar el token (se auto-repara).
export async function refreshPushIfEnabled() {
  try { return await _registerPush(false); }
  catch (e) { console.warn("refreshPush", e); return null; }
}

export function onAdminChange(fn) {
  _adminListeners.push(fn);
  return () => {
    const i = _adminListeners.indexOf(fn);
    if (i >= 0) _adminListeners.splice(i, 1);
  };
}

// Publica los datos semilla en Firestore (acción del panel admin).
export async function publishSeed() {
  await init();
  await saveProviders(clone(SEED_PROVEEDORES));
  const current = await getSite();
  await saveSite(Object.assign(clone(DEFAULT_SITE), current));
  return true;
}

// ============================================================
//  ARCHIVOS (Firebase Storage) — fotos y videos por proveedor
// ============================================================
export function storageAvailable() { return !!(_storage && _storageFns); }

export async function uploadFile(file, folder = "media", onProgress) {
  await init();
  if (!(_mode === "cloud" && _storage && _storageFns)) throw new Error("storage-no-disponible");
  const safe = (file.name || "archivo").replace(/[^\w.\-]+/g, "_").slice(-50);
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safe}`;
  const sref = _storageFns.ref(_storage, path);

  if (onProgress && _storageFns.uploadBytesResumable) {
    // Subida con progreso (para videos): resumible + tiempo límite (90 s)
    const task = _storageFns.uploadBytesResumable(sref, file);
    await new Promise((res, rej) => {
      let done = false;
      const to = setTimeout(() => { if (!done) { done = true; try { task.cancel(); } catch (e) {} rej(new Error("storage-timeout")); } }, 90000);
      task.on("state_changed",
        (s) => { try { onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)); } catch (e) {} },
        (err) => { if (!done) { done = true; clearTimeout(to); rej(err); } },
        () => { if (!done) { done = true; clearTimeout(to); res(); } });
    });
  } else {
    // Subida directa (para imágenes JPG pequeñas): termina o falla rápido (25 s)
    await Promise.race([
      _storageFns.uploadBytes(sref, file),
      new Promise((_, rej) => setTimeout(() => rej(new Error("storage-timeout")), 25000))
    ]);
  }
  return await Promise.race([
    _storageFns.getDownloadURL(sref),
    new Promise((_, rej) => setTimeout(() => rej(new Error("storage-timeout")), 20000))
  ]);
}
