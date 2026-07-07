// ============================================================
//  CAPA DE DATOS CANIRAC LAGUNA
//  Usa Firebase (Firestore + Auth) cuando está disponible.
//  Si no hay conexión o Firebase no está configurado, cae
//  automáticamente a guardado local (localStorage) para que
//  el sitio siempre funcione.
// ============================================================

import { firebaseConfig, USE_FIREBASE, ADMIN } from "./config.js";
import { SEED_PROVEEDORES, DEFAULT_SITE } from "./seed.js";

const FB_VER = "10.12.5";
const LS = {
  prov: "canirac_providers_v1",
  site: "canirac_site_v1",
  team: "canirac_equipo_v1",
  admin: "canirac_admin_v1"
};

let _db = null;
let _auth = null;
let _fs = null;      // funciones de firestore
let _authFns = null; // funciones de auth
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
      const [{ initializeApp }, fs, authMod] = await Promise.race([
        Promise.all([
          import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
          import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`),
          import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth.js`)
        ]),
        timeout
      ]);
      const app = initializeApp(firebaseConfig);
      _fs = fs;
      _authFns = authMod;
      _db = fs.getFirestore(app);
      _auth = authMod.getAuth(app);
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
  if (_mode === "cloud") return !!(_auth && _auth.currentUser);
  return sessionStorage.getItem(LS.admin) === "1";
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
