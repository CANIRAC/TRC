// ============================================================
//  CAPA DE DATOS CANIRAC LAGUNA
//  Usa Firebase (Firestore + Auth) cuando está disponible.
//  Si no hay conexión o Firebase no está configurado, cae
//  automáticamente a guardado local (localStorage) para que
//  el sitio siempre funcione.
// ============================================================

import { firebaseConfig, USE_FIREBASE, ADMIN, VAPID_KEY, PRUEBA_DIAS } from "./config.js";
import { SEED_PROVEEDORES, DEFAULT_SITE } from "./seed.js";

const FB_VER = "10.12.5";
const LS = {
  prov: "canirac_providers_v1",
  site: "canirac_site_v1",
  team: "canirac_equipo_v1",
  admin: "canirac_admin_v1",
  acc: "canirac_accesos_v1"
};
const ACC = "accesos"; // colección de solicitudes de acceso al catálogo

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
// appName: el panel usa su propia instancia ("admin") para que su sesión NO se
// mezcle con la del catálogo (comparten dominio y, sin esto, comparten sesión).
export function init(appName) {
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
      const app = appName ? initializeApp(firebaseConfig, appName) : initializeApp(firebaseConfig);
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
// strict=true (panel admin): si la nube falla, LANZA el error en vez de devolver
// la copia local/semilla. Así el admin nunca sobrescribe la nube con datos viejos.
export async function getProviders({ strict = false } = {}) {
  await init();
  if (_mode === "cloud") {
    try {
      const ref = _fs.doc(_db, "content", "providers");
      const snap = await _fs.getDoc(ref);
      if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length) {
        const list = snap.data().list;
        lset(LS.prov, list); // copia para usar sin conexión
        return list;
      }
      if (strict) return clone(SEED_PROVEEDORES); // nube vacía: primera vez
    } catch (e) {
      if (strict) throw e;
      console.warn("getProviders cloud fail -> seed/local", e);
    }
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
export async function getSite({ strict = false } = {}) {
  await init();
  if (_mode === "cloud") {
    try {
      const ref = _fs.doc(_db, "content", "site");
      const snap = await _fs.getDoc(ref);
      if (snap.exists()) {
        const site = Object.assign(clone(DEFAULT_SITE), snap.data());
        lset(LS.site, site);
        return site;
      }
      if (strict) return clone(DEFAULT_SITE);
    } catch (e) {
      if (strict) throw e;
      console.warn("getSite cloud fail -> default/local", e);
    }
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
    // Ahora hay usuarios del catálogo con contraseña: solo el correo admin entra al panel.
    if (!isAdmin()) {
      try { await _authFns.signOut(_auth); } catch (e) {}
      const err = new Error("Esta cuenta no tiene permisos de administrador.");
      err.code = "no-admin";
      throw err;
    }
    notifyAdmin();
    return true;
  }
  // local
  if (!ADMIN.passwordLocal) throw new Error("Sin conexión con la nube. Revisa tu internet e inténtalo de nuevo.");
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

export function isAdminEmail(email) {
  return (email || "").trim().toLowerCase() === ADMIN.email.toLowerCase();
}
export function isAdmin() {
  // En la nube, SOLO el correo del administrador cuenta como admin.
  // (Así, aunque un usuario del catálogo inicie sesión, no obtiene acceso de admin.)
  if (_mode === "cloud") return !!(_auth && _auth.currentUser && isAdminEmail(_auth.currentUser.email));
  return sessionStorage.getItem(LS.admin) === "1";
}

// Espera a que Firebase restaure la sesión guardada (si la hay) y la devuelve.
export async function authReady() {
  await init();
  if (_mode !== "cloud" || !_auth) return null;
  if (_auth.authStateReady) await _auth.authStateReady();
  else await new Promise(res => { const off = _authFns.onAuthStateChanged(_auth, () => { off(); res(); }); });
  return _auth.currentUser || null;
}

// ---------- Acceso al CATÁLOGO ----------
function googleProvider() {
  const provider = new _authFns.GoogleAuthProvider();
  try { provider.setCustomParameters({ prompt: "select_account" }); } catch (e) {}
  return provider;
}
// Registro / inicio con la cuenta de Google (verifica que el correo sea real).
export async function googleLogin() {
  await init();
  if (_mode !== "cloud" || !_auth || !_authFns || !_authFns.GoogleAuthProvider) {
    throw new Error("sin-nube");
  }
  const res = await _authFns.signInWithPopup(_auth, googleProvider());
  return res.user;
}
// Inicio con el correo y la contraseña creados en esta plataforma.
export async function emailLogin(email, password) {
  await init();
  if (_mode !== "cloud") throw new Error("sin-nube");
  email = (email || "").trim();
  if (!email.includes("@") && email.toLowerCase() === ADMIN.usuario) email = ADMIN.email;
  const res = await _authFns.signInWithEmailAndPassword(_auth, email, password);
  return res.user;
}
export async function resetPassword(email) {
  await init();
  if (_mode !== "cloud") throw new Error("sin-nube");
  try { _auth.languageCode = "es"; } catch (e) {}
  await _authFns.sendPasswordResetEmail(_auth, (email || "").trim());
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

// Agrega (o cambia) la contraseña de esta plataforma a la cuenta de Google.
// Después, la persona puede entrar con correo + contraseña.
async function setPlatformPassword(user, password, retried) {
  const hasPwd = (user.providerData || []).some(p => p.providerId === "password");
  try {
    if (hasPwd) await _authFns.updatePassword(user, password);
    else await _authFns.linkWithCredential(user, _authFns.EmailAuthProvider.credential(user.email, password));
  } catch (e) {
    const c = (e && e.code) || "";
    if (c === "auth/provider-already-linked") { await _authFns.updatePassword(user, password); return; }
    if (c === "auth/requires-recent-login" && !retried) {
      await _authFns.reauthenticateWithPopup(user, googleProvider());
      return setPlatformPassword(_auth.currentUser, password, true);
    }
    throw e;
  }
}

// Envía la solicitud de acceso. Queda "pendiente" hasta que el admin decida y,
// mientras tanto, la persona tiene PRUEBA_DIAS días de prueba (los cuenta el
// servidor con inicioPrueba = hora del servidor, así nadie puede alargarla).
export async function registerAccess(data) {
  await init();
  if (_mode !== "cloud") throw new Error("sin-nube");
  const u = currentUser();
  if (!u || !u.email) throw new Error("sin-sesion");
  await setPlatformPassword(u, data.password);
  // Token nuevo: así las reglas ven la cuenta ya vinculada (Google + contraseña).
  try { await u.getIdToken(true); } catch (e) {}
  const rec = {
    uid: u.uid,
    email: u.email,
    nombre: data.nombre,
    fechaNacimiento: data.fechaNacimiento,
    restaurante: data.restaurante,
    puesto: data.puesto,
    foto: u.photoURL || "",
    estado: "pendiente",
    createdAt: Date.now(),
    inicioPrueba: _fs.serverTimestamp()
  };
  await _fs.setDoc(_fs.doc(_db, ACC, u.uid), rec);
  return Object.assign({}, rec, { inicioPrueba: Date.now() });
}

// Fin del periodo de prueba (milisegundos) de una solicitud, o 0 si no aplica.
export function trialEnd(acc) {
  if (!acc) return 0;
  const ip = acc.inicioPrueba;
  const start = (ip && typeof ip.toMillis === "function") ? ip.toMillis()
    : (typeof ip === "number") ? ip
    : (typeof acc.createdAt === "number") ? acc.createdAt : 0;
  return start ? start + PRUEBA_DIAS * 86400000 : 0;
}
// ¿Puede entrar al catálogo? (confirmado, o pendiente con prueba vigente)
export function accessState(acc, now = Date.now()) {
  if (!acc) return "sin-registro";
  if (acc.estado === "aprobado") return "aprobado";
  if (acc.estado === "denegado") return "denegado";
  return trialEnd(acc) > now ? "prueba" : "prueba-vencida";
}
export async function getMyAccess() {
  await init();
  const u = currentUser();
  if (_mode !== "cloud" || !u) return null;
  const snap = await _fs.getDoc(_fs.doc(_db, ACC, u.uid));
  return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
}
// Escucha en vivo el estado de MI solicitud (aprobación o revocación al instante).
export function watchMyAccess(cb) {
  const u = currentUser();
  if (_mode !== "cloud" || !u) return () => {};
  return _fs.onSnapshot(_fs.doc(_db, ACC, u.uid),
    s => cb(s.exists() ? Object.assign({ id: s.id }, s.data()) : null),
    e => console.warn("watchMyAccess", e));
}

// ---------- Autorizaciones (panel admin) ----------
export async function watchAccessRequests(cb, onError) {
  await init();
  if (_mode === "cloud") {
    const q = _fs.query(_fs.collection(_db, ACC), _fs.orderBy("createdAt", "desc"));
    return _fs.onSnapshot(q,
      snap => cb(snap.docs.map(d => Object.assign({ id: d.id }, d.data()))),
      e => { console.warn("watchAccessRequests", e); if (onError) onError(e); });
  }
  cb(lget(LS.acc, []));
  return () => {};
}
export async function setAccessStatus(uid, estado) {
  await init();
  const patch = { estado, decididoAt: Date.now(), decididoPor: (currentUser() && currentUser().email) || ADMIN.usuario };
  if (_mode === "cloud") {
    await _fs.updateDoc(_fs.doc(_db, ACC, uid), patch);
    return true;
  }
  lset(LS.acc, lget(LS.acc, []).map(r => r.id === uid ? Object.assign({}, r, patch) : r));
  return true;
}
export async function deleteAccess(uid) {
  await init();
  if (_mode === "cloud") {
    await _fs.deleteDoc(_fs.doc(_db, ACC, uid));
    return true;
  }
  lset(LS.acc, lget(LS.acc, []).filter(r => r.id !== uid));
  return true;
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
// col: "pushTokens" (usuarios del catálogo) o "adminTokens" (dispositivos del admin,
// que reciben el aviso de cada solicitud de acceso nueva).
async function _registerPush(interactive, col = "pushTokens") {
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
  // (Sin respaldo en el ámbito raíz: eso reemplazaría a sw.js y rompería el modo sin conexión.)
  let reg;
  try {
    reg = await navigator.serviceWorker.register("firebase-messaging-sw.js", { scope: "/firebase-cloud-messaging-push-scope" });
  } catch (e) {
    if (interactive) throw new Error("sin-soporte");
    return null;
  }

  const token = await msgMod.getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) { if (interactive) throw new Error("sin-token"); return null; }

  // Guardar/actualizar el token. En modo interactivo, si falla, avisamos (throw).
  try {
    await _fs.setDoc(_fs.doc(_db, col, token), {
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
              tag: d.tag || "canirac-aviso"
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

// Panel admin: avisos de solicitudes de acceso en este dispositivo.
export async function enableAdminPush() { return _registerPush(true, "adminTokens"); }
export async function refreshAdminPushIfEnabled() {
  try { return await _registerPush(false, "adminTokens"); }
  catch (e) { console.warn("refreshAdminPush", e); return null; }
}

export function onAdminChange(fn) {
  _adminListeners.push(fn);
  return () => {
    const i = _adminListeners.indexOf(fn);
    if (i >= 0) _adminListeners.splice(i, 1);
  };
}

// Publica los datos semilla en Firestore (acción del panel admin).
// Solo AGREGA los proveedores de la lista inicial que falten: nunca borra ni
// sobrescribe los que ya editaste (fotos, videos, descripciones…).
// Devuelve cuántos proveedores se agregaron.
export async function publishSeed() {
  await init();
  const current = await getProviders({ strict: true });
  const ids = new Set(current.map(p => String(p.id)));
  const merged = current.slice();
  SEED_PROVEEDORES.forEach(s => { if (!ids.has(String(s.id))) merged.push(clone(s)); });
  merged.sort((a, b) => (+a.id || 0) - (+b.id || 0));
  await saveProviders(merged);
  const site = await getSite({ strict: true });
  await saveSite(Object.assign(clone(DEFAULT_SITE), site));
  return merged.length - current.length;
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
