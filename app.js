// ============================================================
//  CANIRAC Laguna — App (Directorio de Proveedores)
// ============================================================
import { brandHTML, ICONS, CATEGORY_ICONS, waLink, escapeHtml, safeUrl, safeColor, toast, CAMARA_WA, videoEmbed, createLoader } from "./ui.js";
import { CONTACTO, MENSAJE_PROVEEDOR, PRUEBA_DIAS } from "./config.js";
import { CATEGORIAS } from "./seed.js";
import {
  init as storeInit, getMode, authReady, getProviders, getSite, addEquipo, googleLogin, emailLogin, resetPassword,
  currentUser, logout, isAdminEmail, getMyAccess, watchMyAccess, registerAccess, trialEnd, accessState,
  getUserData, saveUserData, enablePush, pushSupported, refreshPushIfEnabled
} from "./store.js";

const FAV_KEY = "canirac_favs_v1";
const RECENT_KEY = "canirac_recent_v1";      // búsquedas recientes
const ACCESS_KEY = "canirac_access_v1";      // acceso confirmado (para abrir sin conexión)
const AUTO_KEY = "canirac_notif_auto_v1";    // pop-up de aviso: una vez por sesión
let PROV = [], SITE = null, ACCESS = null;
let entered = false, dataReady = false, autoNotifShown = false, unwatchAccess = null;
let favs = loadFavs();
let recent = loadRecent();

// ---------- Iconos ----------
function fillIcons(root=document){
  root.querySelectorAll("[data-ic]").forEach(el=>{
    const svg = ICONS[el.dataset.ic] || "";
    if (!svg) return;
    const isLeaf = !el.children.length && !el.textContent.trim();
    if (isLeaf) el.innerHTML = svg;
    else el.insertAdjacentHTML("afterbegin", svg);
    el.removeAttribute("data-ic");
  });
  root.querySelectorAll("[data-g]").forEach(el=>{ el.innerHTML = ICONS.google; el.removeAttribute("data-g"); });
}

// ---------- Utilidades ----------
function loadFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY))||[]; }catch(e){ return []; } }
function saveFavsLocal(){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(favs)); }catch(e){} }
function saveFavs(){ saveFavsLocal(); if(currentUser()) saveUserData({ favs, searches: recent }); }
function isFav(id){ return favs.includes(String(id)); }
function toggleFav(id){ id=String(id); const i=favs.indexOf(id); if(i>=0)favs.splice(i,1); else favs.push(id); saveFavs(); }
function refreshFavButtons(){
  document.querySelectorAll("[data-fav]").forEach(b=>{ const on=isFav(b.dataset.fav); b.classList.toggle("on",on); b.innerHTML=on?ICONS.heartFilled:ICONS.heart; });
}
function norm(s){ return (s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
function initials(n){ return (n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function catIcon(cat){ return CATEGORY_ICONS[cat] || CATEGORY_ICONS["Otros"]; }
function provWa(p){ return (p.whatsapp || p.telContacto || p.telNegocio || "").replace(/[^\d]/g,""); }
function plural(n, s, p){ return `${n} ${n===1?s:(p||s+"es")}`; }
function firstName(s){ return ((s||"").trim().split(/\s+/)[0]) || ""; }

// ---------- Búsquedas recientes (por cuenta si hay sesión) ----------
function loadRecent(){ try{ return JSON.parse(localStorage.getItem(RECENT_KEY))||[]; }catch(e){ return []; } }
function saveRecentLocal(){ try{ localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); }catch(e){} }
function addRecent(term){
  term=(term||"").trim(); if(term.length<2) return;
  recent=[term, ...recent.filter(x=>x.toLowerCase()!==term.toLowerCase())].slice(0,8);
  saveRecentLocal(); renderRecent();
  if(currentUser()) saveUserData({ favs, searches: recent });
}
function renderRecent(){
  const box=document.getElementById("recentSearches");
  if(!box) return;
  const inp=document.getElementById("searchInput");
  const empty=(!inp || !inp.value.trim());
  if(!recent.length || !empty){ box.style.display="none"; box.innerHTML=""; return; }
  box.style.display="";
  box.innerHTML = `<span class="rc-lbl">Recientes</span>` +
    recent.map(t=>`<button class="rc-chip" data-q="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("") +
    `<button class="rc-clear" id="rcClear">Borrar</button>`;
  box.querySelectorAll(".rc-chip").forEach(b=>b.onclick=()=>{
    const inp=document.getElementById("searchInput"); if(!inp) return;
    inp.value=b.dataset.q; inp.dispatchEvent(new Event("input")); inp.focus();
  });
  const clr=document.getElementById("rcClear");
  if(clr) clr.onclick=()=>{ recent=[]; saveRecentLocal(); renderRecent(); if(currentUser()) saveUserData({ favs, searches: recent }); };
}

// ============================================================
//  ARRANQUE (se ejecuta al final del archivo)
// ============================================================
function paintStatic(){
  document.getElementById("headerBrand").innerHTML = brandHTML({ onDark:true, vertical:true });
  document.getElementById("drawerBrand").innerHTML = brandHTML({ onDark:true, vertical:true });
  document.getElementById("gateBrand").innerHTML = brandHTML({ onDark:true, vertical:true });
  document.getElementById("gateSocial").innerHTML =
    `<a href="${CONTACTO.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.ig}</a>
     <a href="${CAMARA_WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONS.wa}</a>
     <a href="${CONTACTO.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.fb}</a>`;
  ["pendingWa","deniedWa"].forEach(id=>{
    const a=document.getElementById(id);
    a.href = waLink(CONTACTO.whatsapp, "Hola, solicité acceso al Catálogo de Proveedores de CANIRAC Laguna y quisiera dar seguimiento.");
    a.innerHTML = `${ICONS.wa} Escribir a CANIRAC Laguna`;
  });
  renderDrawerSocial();
  renderDrawerInfo();
  renderFooter();
  fillIcons();
  wireGate();
  wireBell();
  wireNav();
  wireSearch();
  wireModals();
  wireRefresh();
  wireCompactHeader();
}

// Copia local del catálogo (la guarda store.js cada vez que descarga de la nube).
function readDataCache(){
  try{
    const prov = JSON.parse(localStorage.getItem("canirac_providers_v1"));
    const site = JSON.parse(localStorage.getItem("canirac_site_v1"));
    return (Array.isArray(prov) && prov.length) ? { prov, site: site || {} } : null;
  }catch(e){ return null; }
}

async function start(){
  // Arranque instantáneo: si esta persona ya tenía acceso en este dispositivo,
  // se muestra de inmediato la última copia del catálogo mientras se verifica
  // la sesión y se descargan los datos nuevos en segundo plano.
  const cachedAccess = readAccessCache(), cachedData = readDataCache();
  if(cachedAccess && cachedData){
    safe(showCatalog, cachedData.prov, cachedData.site);
    updateSessionUI(null);
    hideGate();
    loader.done();
  } else {
    showGate("checking");
  }
  loader.set(25, "Conectando…");
  let mode = "local";
  try{ mode = await storeInit(); }catch(e){ mode = "local"; }
  loader.set(50, "Verificando tu sesión…");

  // Sin nube (sin internet o Firebase bloqueado): solo entra quien ya fue autorizado aquí.
  if(mode !== "cloud"){
    if(readAccessCache()) return enterApp(null, { offline:true });
    return showGate("offline");
  }
  let user = null;
  try{ user = await authReady(); }catch(e){ user = null; }
  loader.set(65, user ? "Verificando tu acceso…" : "Casi listo…");
  await routeUser(user);
}

// Decide qué ve la persona según su sesión y el estado de su solicitud.
async function routeUser(user){
  if(!user){ showGate("login"); return; }
  if(isAdminEmail(user.email)) return enterApp(user);
  let acc;
  try{ acc = await getMyAccess(); }
  catch(e){
    console.warn("[CANIRAC] getMyAccess:", e);
    const cached = readAccessCache();
    if(cached && cached.uid===user.uid) return enterApp(user, { offline:true });
    showGate("login");
    setMsg("loginMsg", "No se pudo verificar tu acceso. Revisa tu conexión e inténtalo de nuevo." + (e && e.code ? ` [${e.code}]` : ""));
    return;
  }
  ACCESS = acc;
  const st = accessState(acc);
  if(st==="sin-registro"){ showProfileForm(user); return; }
  if(st==="aprobado" || st==="prueba") return enterApp(user);
  clearAccessCache();
  if(st==="denegado"){ showGate("denied"); return; }
  showPending(acc); // prueba vencida: espera la decisión del admin
}

// ---------- Periodo de prueba ----------
function daysLeft(acc){ return Math.max(0, Math.ceil((trialEnd(acc) - Date.now()) / 86400000)); }
let trialTimer = null;
function paintTrial(){
  const bar = document.getElementById("trialBar");
  if(!bar) return;
  clearTimeout(trialTimer);
  if(accessState(ACCESS)!=="prueba"){ bar.hidden = true; return; }
  const n = daysLeft(ACCESS);
  bar.innerHTML = `${ICONS.clock}<span><b>Periodo de prueba:</b> ${n===1?"te queda 1 día":`te quedan ${n} días`}. CANIRAC Laguna está revisando tu solicitud.</span>`;
  bar.hidden = false;
  // Al terminar la prueba (con la app abierta) se bloquea el catálogo.
  const ms = trialEnd(ACCESS) - Date.now();
  if(ms > 0 && ms < 2147000000) trialTimer = setTimeout(()=>{ if(accessState(ACCESS)==="prueba-vencida"){ clearAccessCache(); closeAllOverlays(); showPending(ACCESS); } }, ms + 1000);
}

// ============================================================
//  PANTALLA DE ACCESO (login / registro / estados)
// ============================================================
function showGate(view){
  const gate = document.getElementById("gate");
  gate.style.display = "";
  gate.classList.remove("gone");
  document.body.classList.add("locked");
  gate.querySelectorAll(".gv").forEach(s=>s.classList.toggle("hidden", s.dataset.gv!==view));
  gate.scrollTop = 0;
  if(view!=="checking") loader.done();
  const focusMap = { login:"l-email", forgot:"f-email", profile:"r-nombre" };
  if(focusMap[view] && window.matchMedia("(min-width:960px)").matches){
    setTimeout(()=>{ const el=document.getElementById(focusMap[view]); if(el && !el.value) el.focus(); }, 60);
  }
}
function hideGate(){
  const gate = document.getElementById("gate");
  gate.classList.add("gone");
  document.body.classList.remove("locked");
  setTimeout(()=>{ if(gate.classList.contains("gone")) gate.style.display="none"; }, 450);
}
function setMsg(id, text, ok){
  const m=document.getElementById(id); if(!m) return;
  m.className = "form-msg" + (text ? (ok?" ok":" err") : "");
  m.textContent = text || "";
}
function busy(btn, on, label){
  if(!btn) return;
  if(on){ btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = label || "Un momento…"; }
  else { btn.disabled = false; if(btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}
function authError(e){
  const c = (e && (e.code || e.message)) || "";
  if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return "Correo o contraseña incorrectos. Si aún no tienes cuenta, solicita tu acceso.";
  if(/invalid-email/.test(c)) return "Escribe un correo válido.";
  if(/too-many-requests/.test(c)) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if(/popup-closed|cancelled-popup/.test(c)) return "Se cerró la ventana de Google antes de terminar.";
  if(/popup-blocked/.test(c)) return "Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.";
  if(/network/.test(c)) return "Sin conexión. Revisa tu internet.";
  if(/unauthorized-domain/.test(c)) return "Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).";
  if(/operation-not-allowed/.test(c)) return "Falta activar este método de acceso en Firebase (Authentication → Sign-in method).";
  if(/weak-password/.test(c)) return "La contraseña es muy débil.";
  if(/credential-already-in-use|email-already-in-use/.test(c)) return "Ese correo ya tiene otra cuenta. Inicia sesión con tu contraseña o recupérala.";
  if(/permission-denied/.test(c)) return "El servidor rechazó la solicitud (permiso denegado). Verifica que estén publicadas las reglas nuevas de Firestore. [permission-denied]";
  if(c==="sin-nube") return "Sin conexión con el servidor. Inténtalo de nuevo.";
  // El código entre corchetes ayuda a diagnosticar el problema.
  return "Ocurrió un error. Inténtalo de nuevo." + (c ? ` [${String(c).replace(/^auth\//,"").slice(0,60)}]` : "");
}

function wireGate(){
  document.querySelectorAll("[data-gv-go]").forEach(b=>b.addEventListener("click", ()=>{
    if(b.dataset.gvGo==="forgot"){ document.getElementById("f-email").value = document.getElementById("l-email").value.trim(); setMsg("forgotMsg",""); }
    if(b.dataset.gvGo==="register") setMsg("regStartMsg","");
    showGate(b.dataset.gvGo);
  }));
  document.querySelectorAll("[data-eye]").forEach(b=>{
    b.innerHTML = ICONS.eye;
    b.addEventListener("click", ()=>{
      const inp=document.getElementById(b.dataset.eye); const show = inp.type==="password";
      inp.type = show ? "text" : "password";
      b.innerHTML = show ? ICONS.eyeOff : ICONS.eye;
      b.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    });
  });
  document.querySelectorAll("[data-logout]").forEach(b=>b.addEventListener("click", doLogout));

  // Iniciar sesión con correo + contraseña
  document.getElementById("loginForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const email=document.getElementById("l-email").value.trim();
    const pass=document.getElementById("l-pass").value;
    if(!email || !pass){ setMsg("loginMsg","Escribe tu correo y tu contraseña."); return; }
    setMsg("loginMsg","");
    const btn=document.getElementById("loginBtn"); busy(btn,true,"Entrando…");
    try{
      const user = await emailLogin(email, pass);
      document.getElementById("l-pass").value = "";
      showGate("checking");
      await routeUser(user);
    }catch(err){ console.warn("[CANIRAC] login:", err); setMsg("loginMsg", authError(err)); }
    finally{ busy(btn,false); }
  });

  // Google (desde "Iniciar sesión" o desde "Solicitar acceso")
  const google = async (btn, msgId)=>{
    setMsg(msgId,"");
    busy(btn,true,"Conectando con Google…");
    try{
      const user = await googleLogin();
      showGate("checking");
      await routeUser(user);
    }catch(err){ console.warn("[CANIRAC] Google:", err); setMsg(msgId, authError(err)); }
    finally{ busy(btn,false); }
  };
  document.getElementById("googleLoginBtn").addEventListener("click", e=>google(e.currentTarget, "loginMsg"));
  document.getElementById("googleRegBtn").addEventListener("click", e=>google(e.currentTarget, "regStartMsg"));

  // Recuperar contraseña
  document.getElementById("forgotForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const email=document.getElementById("f-email").value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setMsg("forgotMsg","Escribe un correo válido."); return; }
    const btn=document.getElementById("forgotBtn"); busy(btn,true,"Enviando…");
    try{
      await resetPassword(email);
      setMsg("forgotMsg","Si ese correo está registrado, te llegará un enlace para crear una nueva contraseña. Revisa también tu carpeta de spam.", true);
    }catch(err){ setMsg("forgotMsg", authError(err)); }
    finally{ busy(btn,false); }
  });

  // Registro: datos + contraseña
  const p1=document.getElementById("r-pass"), p2=document.getElementById("r-pass2");
  p1.addEventListener("input", ()=>{ paintPwRules(); paintPwMatch(); });
  p2.addEventListener("input", paintPwMatch);
  document.getElementById("regForm").addEventListener("submit", submitRegistration);
  document.getElementById("regCancel").addEventListener("click", doLogout);
  // Fecha de nacimiento: no se permite una fecha futura
  document.getElementById("r-nac").max = isoDate(new Date());
}

function pwChecks(v){ return { len: v.length>=8, let: /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(v), num: /\d/.test(v) }; }
function paintPwRules(){
  const v=document.getElementById("r-pass").value, c=pwChecks(v);
  document.querySelectorAll("#pwRules li").forEach(li=>li.classList.toggle("ok", !!c[li.dataset.rule]));
  let score = (c.len?1:0)+(c.let?1:0)+(c.num?1:0) + (v.length>=12?1:0) + (/[^A-Za-z0-9]/.test(v)?1:0);
  const m=document.getElementById("pwMeter");
  m.dataset.level = !v ? "" : score<=2 ? "low" : score===3 ? "mid" : "high";
}
function paintPwMatch(){
  const a=document.getElementById("r-pass").value, b=document.getElementById("r-pass2").value, el=document.getElementById("pwMatch");
  if(!b){ el.textContent=""; el.className="pw-match"; return; }
  const ok = a===b;
  el.textContent = ok ? "✓ Las contraseñas coinciden" : "Las contraseñas no coinciden";
  el.className = "pw-match " + (ok?"ok":"err");
}
function isoDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function showProfileForm(user){
  const photo = safeUrl(user.photoURL);
  document.getElementById("regAccount").innerHTML = `
    <span class="acct-av">${photo?`<img src="${escapeHtml(photo)}" alt="" referrerpolicy="no-referrer">`:escapeHtml(initials(user.displayName||user.email))}</span>
    <span class="acct-meta"><small>Cuenta de Google verificada</small><b>${escapeHtml(user.email||"")}</b></span>
    <button type="button" class="link-btn" id="regSwitch">Cambiar</button>`;
  document.getElementById("regSwitch").onclick = doLogout;
  const n=document.getElementById("r-nombre");
  if(!n.value && user.displayName) n.value = user.displayName;
  setMsg("regMsg","");
  showGate("profile");
}

async function submitRegistration(e){
  e.preventDefault();
  const data = {
    nombre: document.getElementById("r-nombre").value.trim().replace(/\s+/g," "),
    fechaNacimiento: document.getElementById("r-nac").value,
    restaurante: document.getElementById("r-rest").value.trim().replace(/\s+/g," "),
    puesto: document.getElementById("r-puesto").value.trim().replace(/\s+/g," "),
    password: document.getElementById("r-pass").value
  };
  const pass2 = document.getElementById("r-pass2").value;
  const err = (msg, field)=>{ setMsg("regMsg", msg); if(field){ const f=document.getElementById(field); f.focus(); f.classList.add("invalid"); setTimeout(()=>f.classList.remove("invalid"), 1600); } };

  if(data.nombre.length<3 || !/\s/.test(data.nombre)) return err("Escribe tu nombre completo (nombre y apellido).", "r-nombre");
  if(!data.fechaNacimiento) return err("Indica tu fecha de nacimiento.", "r-nac");
  const born = new Date(data.fechaNacimiento+"T12:00:00");
  if(isNaN(born) || born > new Date() || born.getFullYear() < 1920) return err("Revisa tu fecha de nacimiento.", "r-nac");
  if(data.restaurante.length<2) return err("Escribe el nombre del restaurante al que perteneces.", "r-rest");
  if(data.puesto.length<2) return err("Escribe tu puesto.", "r-puesto");
  const c = pwChecks(data.password);
  if(!c.len || !c.let || !c.num) return err("Tu contraseña debe tener al menos 8 caracteres, una letra y un número.", "r-pass");
  if(data.password !== pass2) return err("Las contraseñas no coinciden.", "r-pass2");

  setMsg("regMsg","");
  const btn=document.getElementById("regBtn"); busy(btn,true,"Enviando solicitud…");
  try{
    const rec = await registerAccess(data);
    ACCESS = rec;
    ["r-pass","r-pass2"].forEach(id=>document.getElementById(id).value="");
    paintPwRules(); paintPwMatch();
    toast(`¡Bienvenido! Tienes ${PRUEBA_DIAS} días de prueba 🎉`, "", 4500);
    enterApp(currentUser());
  }catch(er){
    console.warn("[CANIRAC] registro:", er);
    setMsg("regMsg", authError(er));
  }finally{ busy(btn,false); }
}

function fmtDate(ts, withTime){
  try{
    const d = new Date(ts);
    const s = d.toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});
    return withTime ? s+" "+d.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}) : s;
  }catch(e){ return ""; }
}
// Prueba vencida y sin decisión del admin todavía.
function showPending(acc){
  const row=(k,v)=>`<div><dt>${k}</dt><dd>${escapeHtml(v||"—")}</dd></div>`;
  document.getElementById("pendingSummary").innerHTML =
    row("Nombre", acc.nombre) + row("Correo", acc.email) + row("Restaurante", acc.restaurante) +
    row("Puesto", acc.puesto) + row("Enviada", acc.createdAt ? fmtDate(acc.createdAt, true) : "");
  showGate("pending");
  // Se abre sola en cuanto el admin confirma (o muestra el aviso si la deniega).
  if(unwatchAccess) unwatchAccess();
  unwatchAccess = watchMyAccess(a=>{
    if(!a) return;
    ACCESS = a;
    if(a.estado==="aprobado"){
      if(unwatchAccess){ unwatchAccess(); unwatchAccess=null; }
      toast("¡Tu acceso fue confirmado! Bienvenido 🎉", "", 4000);
      if(entered){ writeAccessCache(currentUser()); hideGate(); paintTrial(); watchRevocation(currentUser()); }
      else enterApp(currentUser());
    }
    else if(a.estado==="denegado"){ showGate("denied"); }
  });
}

async function doLogout(){
  try{ if(unwatchAccess) unwatchAccess(); }catch(e){}
  try{ await logout(); }catch(e){}
  clearAccessCache();
  location.reload();
}

// Copia local del acceso (para abrir sin conexión). En prueba, guarda cuándo vence.
function readAccessCache(){
  try{
    const c = JSON.parse(localStorage.getItem(ACCESS_KEY));
    if(c && c.hasta && c.hasta < Date.now()) return null; // la prueba ya venció
    return c;
  }catch(e){ return null; }
}
function writeAccessCache(u){
  if(!u) return;
  const hasta = accessState(ACCESS)==="prueba" ? trialEnd(ACCESS) : 0;
  try{ localStorage.setItem(ACCESS_KEY, JSON.stringify({ uid:u.uid, email:u.email||"", nombre:(ACCESS&&ACCESS.nombre)||u.displayName||"", hasta, ts:Date.now() })); }catch(e){}
}
function clearAccessCache(){ try{ localStorage.removeItem(ACCESS_KEY); }catch(e){} }

// ============================================================
//  ENTRAR AL CATÁLOGO
// ============================================================
async function enterApp(user, { offline=false } = {}){
  if(entered) return;
  entered = true;
  if(user) writeAccessCache(user);
  if(!catalogShown) loader.show("Cargando proveedores…", 70);
  hideGate();
  updateSessionUI(user);
  paintTrial();
  // Failsafe: aunque algo falle o la red tarde, nunca dejar la barra de carga atorada.
  const failsafe = setTimeout(hideLoading, 12000);
  try{
    await loadData();
    if(user && !offline){
      syncUser();               // favoritos e historial de la cuenta
      refreshPushIfEnabled();   // si ya dio permiso, vuelve a guardar su token (auto-repara)
      watchRevocation(user);
    }
    dataReady = true;
    maybeAutoNotif();
  }catch(e){
    console.error("[CANIRAC] Error al iniciar el catálogo:", e);
  }finally{
    clearTimeout(failsafe);
    hideLoading();
  }
}
// Si el admin retira el acceso mientras la persona usa el catálogo, se bloquea al instante.
function watchRevocation(user){
  if(!user || isAdminEmail(user.email)) return;
  if(unwatchAccess) unwatchAccess();
  let wasTrial = accessState(ACCESS)==="prueba";
  unwatchAccess = watchMyAccess(a=>{
    if(!a){ clearAccessCache(); closeAllOverlays(); showProfileForm(user); return; } // el admin borró su registro
    ACCESS = a;
    const st = accessState(a);
    if(st==="aprobado" || st==="prueba"){
      if(st==="aprobado" && wasTrial) toast("¡Tu acceso fue confirmado! Ya es permanente 🎉", "", 4500);
      wasTrial = st==="prueba";
      writeAccessCache(user); paintTrial();
      // Si se le había retirado y el admin lo vuelve a confirmar, se abre de nuevo.
      if(document.body.classList.contains("locked")) hideGate();
      return;
    }
    clearAccessCache();
    closeAllOverlays();
    if(st==="prueba-vencida") showPending(a); else showGate("denied");
  });
}
// Ejecuta una función de render sin que un error tumbe el resto del catálogo.
function safe(fn, ...args){ try{ return fn(...args); }catch(e){ console.error("[CANIRAC] Error en "+((fn&&fn.name)||"render")+":", e); } }
function hideLoading(){ loader.done("¡Listo!"); }

// Descarga proveedores y configuración AL MISMO TIEMPO (antes iba uno tras otro).
async function loadData(){
  const [prov, site] = await Promise.all([
    getProviders().catch(()=>[]),
    getSite().catch(()=>({}))
  ]);
  loader.set(94, "Preparando catálogo…");
  showCatalog(prov, site);
}
let catalogShown = false;
// Pinta todo el catálogo con los datos dados (también al actualizar).
function showCatalog(prov, site){
  PROV = (prov||[]).map(p=>Object.assign({fotos:[],descripcion:"",badge:"",promo:"",destacado:false,categoria:"Otros",color:"#00758D",video:"",videos:[],logo:"",portada:"",ubicacion:""},p));
  SITE = site || {};
  safe(applyTheme, SITE);
  safe(renderMarquee, SITE.slider);
  safe(renderCategorias);
  safe(renderDestacados);
  safe(renderContacto);
  safe(renderAbout);
  safe(renderNotifs);
  safe(renderRecent);
  // Si está viendo una lista o una búsqueda, se actualiza sin moverlo de lugar.
  const y = window.scrollY;
  if(curNav!=="inicio") safe(render, curNav, { keepScroll:true });
  const inp = document.getElementById("searchInput");
  if(inp && inp.value.trim()) inp.dispatchEvent(new Event("input"));
  if(catalogShown) window.scrollTo({ top:y, behavior:"instant" });
  catalogShown = true;
}

// ---------- Actualizar ----------
let refreshing = false, hiddenAt = 0;
async function refreshData(){
  if(refreshing || !entered) return;
  refreshing = true;
  try{ await loadData(); }
  catch(e){ console.warn("[CANIRAC] refresh:", e); }
  finally{ refreshing = false; }
}
// Encabezado compacto al bajar (con margen para que no "parpadee" en el límite)
function wireCompactHeader(){
  let on = false;
  window.addEventListener("scroll", ()=>{
    const y = window.scrollY;
    if(!on && y > 90){ on = true; document.body.classList.add("scrolled"); }
    else if(on && y < 12){ on = false; document.body.classList.remove("scrolled"); }
  }, { passive:true });
}
function isStandalone(){ return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
function wireRefresh(){
  // Botón "Actualizar" del menú: recarga completa (arregla cualquier pantalla trabada).
  document.querySelectorAll("[data-refresh]").forEach(b=>b.addEventListener("click", ()=>{ closeAllOverlays(); location.reload(); }));
  // Al volver a la app después de un rato, trae los datos nuevos sin recargar.
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden){ hiddenAt = Date.now(); return; }
    if(hiddenAt && Date.now() - hiddenAt > 5*60*1000) refreshData();
  });
  // Jalar hacia abajo para actualizar (solo en la app instalada: el navegador ya lo tiene).
  const ptr = document.getElementById("ptr");
  let y0 = null, pull = 0;
  window.addEventListener("touchstart", e=>{
    if(!isStandalone() || window.scrollY > 0 || e.touches.length !== 1) { y0 = null; return; }
    if(document.body.classList.contains("locked") || OVERLAYS.some(isOpen)) { y0 = null; return; }
    y0 = e.touches[0].clientY; pull = 0;
  }, { passive:true });
  window.addEventListener("touchmove", e=>{
    if(y0===null) return;
    pull = Math.max(0, Math.min(110, (e.touches[0].clientY - y0) * .5));
    if(window.scrollY > 0) pull = 0;
    ptr.style.opacity = pull > 10 ? Math.min(1, pull/70) : 0;
    ptr.style.transform = `translate(-50%, ${pull - 60}px) rotate(${pull*3}deg)`;
  }, { passive:true });
  window.addEventListener("touchend", ()=>{
    if(y0===null) return;
    y0 = null;
    if(pull >= 70){ ptr.classList.add("spin"); ptr.style.transform = "translate(-50%, 16px)"; location.reload(); }
    else { ptr.style.opacity = 0; ptr.style.transform = "translate(-50%,-60px)"; }
  });
}

// ---------- Sesión (menú lateral + encabezado) ----------
async function syncUser(){
  const u = currentUser();
  if(!u) return;
  try{
    const data = await getUserData();
    if(data){
      if(Array.isArray(data.favs)) favs = Array.from(new Set([...favs.map(String), ...data.favs.map(String)]));
      if(Array.isArray(data.searches)) recent = Array.from(new Set([...recent, ...data.searches])).slice(0,8);
      saveFavsLocal(); saveRecentLocal();
      saveUserData({ favs, searches: recent }); // que ambos dispositivos converjan
      renderRecent();
      refreshFavButtons();
    }
  }catch(e){ console.warn("[CANIRAC] syncUser:", e); }
}
function updateSessionUI(u){
  const cached = readAccessCache() || {};
  const fullName = (ACCESS && ACCESS.nombre) || (u && u.displayName) || cached.nombre || "";
  const email = (u && u.email) || cached.email || "";
  const name = firstName(fullName) || (isAdminEmail(email) ? "Administrador" : "Usuario");
  const photo = safeUrl(u && u.photoURL);
  const av = photo ? `<img src="${escapeHtml(photo)}" alt="" referrerpolicy="no-referrer">` : escapeHtml(initials(fullName || email || "U"));
  document.getElementById("userAv").innerHTML = av;
  document.getElementById("userName").textContent = name;
  const hello = document.getElementById("helloTxt");
  if(hello && fullName) hello.textContent = `Hola, ${firstName(fullName)} 👋`;

  const extra = ACCESS && ACCESS.restaurante ? `<small>${escapeHtml(ACCESS.restaurante)}${ACCESS.puesto?" · "+escapeHtml(ACCESS.puesto):""}</small>` : "";
  document.getElementById("drawerSession").innerHTML =
    `<div class="ds-user"><span class="ds-av">${av}</span>
       <div class="ds-meta"><b>Hola, ${escapeHtml(name)}</b><small>${escapeHtml(email)}</small>${extra}</div></div>
     <button class="ds-btn" id="sessLogout">${ICONS.logout} Cerrar sesión</button>`;
  document.getElementById("sessLogout").onclick = doLogout;
}

// ---------- Apariencia (color y logo configurables desde el admin) ----------
// Se guarda en el teléfono y el <head> lo aplica ANTES de pintar la página:
// así la app ya no aparece azul (u otro color) mientras termina de cargar.
const THEME_KEY = "canirac_theme_v2";
const ORANGE = "#EE7623"; // naranja CANIRAC (color por defecto)
function applyTheme(site){
  const t = (site && site.tema) || {};
  const primary = /^#[0-9a-f]{6}$/i.test(t.primary||"") ? t.primary : ORANGE;
  setPrimary(primary);
  const logo = safeUrl(t.logo);
  if(logo) setLogo(logo);
  // Logo del encabezado: tamaño y estilo (blanco sin fondo / colores originales)
  const logoH = Math.max(40, Math.min(220, parseInt(t.logoH,10) || 100));
  const logoStyle = t.logoStyle === "original" ? "original" : "blanco";
  const r = document.documentElement.style;
  r.setProperty("--logo-h", logoH + "px");
  r.setProperty("--logo-filter", logoStyle === "original" ? "none" : "brightness(0) invert(1)");
  try{
    localStorage.setItem(THEME_KEY, JSON.stringify({
      primary, primaryD: shade(primary,-30), primaryL: shade(primary,30), grad: gradOf(primary),
      logoH, logoStyle
    }));
  }catch(e){}
}
function gradOf(c){ return `linear-gradient(160deg, ${shade(c,16)} 0%, ${shade(c,-20)} 100%)`; }
function setPrimary(c){
  const r = document.documentElement.style;
  r.setProperty("--primary", c);
  r.setProperty("--primary-d", shade(c,-30));
  r.setProperty("--primary-l", shade(c,30));
  r.setProperty("--grad", gradOf(c));
  const meta = document.querySelector('meta[name="theme-color"]'); if(meta) meta.content = c;
}
function setLogo(url){
  document.querySelectorAll(".brand-img").forEach(img=>{ img.src = url; img.style.display="block"; const f=img.nextElementSibling; if(f) f.style.display="none"; });
}

// ---------- Notificaciones (campana) ----------
const NOTIF_SEEN = "canirac_notif_seen_v1";
function getNotifs(){ return (SITE && Array.isArray(SITE.notificaciones)) ? SITE.notificaciones : []; }
function lastSeen(){ try{ return (+localStorage.getItem(NOTIF_SEEN))||0; }catch(e){ return 0; } }
function renderNotifs(){
  const dot = document.getElementById("bellDot");
  if(!dot) return;
  const unseen = getNotifs().filter(n => (n.createdAt||0) > lastSeen()).length;
  dot.style.display = unseen>0 ? "block" : "none";
}
function wireBell(){
  const bell = document.getElementById("bellBtn");
  if(bell) bell.addEventListener("click", ()=>openNotifs(true));
}
// Pop-up automático de aviso al entrar (una vez por sesión, solo si hay algo nuevo).
function maybeAutoNotif(){
  if(!entered || !dataReady || autoNotifShown) return;
  let sessShown = false;
  try{ sessShown = sessionStorage.getItem(AUTO_KEY)==="1"; }catch(e){}
  if(sessShown){ autoNotifShown = true; return; }
  const unseen = getNotifs().filter(n => (n.createdAt||0) > lastSeen());
  if(unseen.length){
    autoNotifShown = true;
    try{ sessionStorage.setItem(AUTO_KEY,"1"); }catch(e){}
    setTimeout(()=>openNotifs(false), 600); // no marca como visto: el punto rojo permanece
  }
}

// ---------- Activar avisos push en este celular ----------
const PUSH_ON = "canirac_push_on_v1";
function pushRowHtml(){
  if(!pushSupported() || !currentUser()) return "";
  let on=false; try{ on = (localStorage.getItem(PUSH_ON)==="1") && (Notification.permission==="granted"); }catch(e){}
  if(on) return `<div class="push-row on">✅ Avisos activados en este dispositivo</div>`;
  return `<div class="push-row">
    <div class="push-txt"><b>Recibe los avisos en tu dispositivo</b><small>Aunque no tengas la app abierta.</small></div>
    <button class="push-btn" id="pushEnableBtn">Activar</button>
  </div>`;
}
function wirePushRow(){
  const b=document.getElementById("pushEnableBtn");
  if(!b) return;
  b.onclick=async()=>{
    b.disabled=true; const prev=b.textContent; b.textContent="Activando…";
    try{
      await enablePush();
      try{ localStorage.setItem(PUSH_ON,"1"); }catch(e){}
      toast("¡Listo! Avisos activados en este dispositivo");
      openNotifs(false); // re-render para mostrar el estado activado
    }catch(e){
      b.disabled=false; b.textContent=prev;
      const c=(e&&e.message)||"";
      if(c==="permiso-denegado") toast("Debes permitir las notificaciones en tu navegador","err",4500);
      else if(c==="falta-vapid") toast("Falta configurar la clave VAPID (ver guía)","err",4500);
      else if(c==="sin-soporte") toast("En iPhone: agrega la app a tu inicio y ábrela desde ahí para activar","err",5500);
      else if(c==="sin-nube") toast("Se necesita conexión con la nube","err",4000);
      else toast("No se pudo activar. Intenta de nuevo.","err",4000);
      console.warn("[CANIRAC] enablePush:", e);
    }
  };
}
function openNotifs(markSeen=true){
  const list = getNotifs().slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const body = document.getElementById("notifBody");
  const pushRow = pushRowHtml();
  if(!list.length){
    body.innerHTML = pushRow + `<div class="notif-empty">No hay notificaciones por ahora.</div>`;
  } else {
    body.innerHTML = pushRow + list.map(n=>{
      const img = safeUrl(n.imagen), link = safeUrl(n.enlace);
      return `
      <div class="notif-item${n.provId?" clickable":""}"${n.provId?` data-prov="${escapeHtml(String(n.provId))}"`:""}>
        ${img?`<img class="notif-img" src="${escapeHtml(img)}" alt="">`:""}
        <div class="notif-txt">
          <div class="notif-title">${escapeHtml(n.titulo||"")}</div>
          <div class="notif-msg">${escapeHtml(n.mensaje||"")}</div>
          ${link?`<a class="notif-link" href="${escapeHtml(link)}" target="_blank" rel="noopener">Ver más ›</a>`:""}
          ${n.provId?`<a class="notif-link nolink">Ver proveedor ›</a>`:""}
          <div class="notif-date">${n.createdAt?fmtDate(n.createdAt):""}</div>
        </div>
      </div>`;}).join("");
    body.querySelectorAll(".notif-item.clickable").forEach(el=>el.addEventListener("click", e=>{
      if(e.target.closest("a.notif-link[href]")) return; // enlace externo: dejar navegar
      const id = el.getAttribute("data-prov");
      if(id) openModal(id); // reemplaza el modal de avisos por la ficha
    }));
  }
  wirePushRow();
  if(markSeen){
    try{ localStorage.setItem(NOTIF_SEEN, String(Date.now())); }catch(e){}
    const dot=document.getElementById("bellDot"); if(dot) dot.style.display="none";
  }
  openOverlay("notifModal");
}

// ============================================================
//  VENTANAS (modales + menú) integradas con el botón «atrás»
//  En Android / navegador, «atrás» cierra la ventana abierta o
//  regresa a la vista anterior, en vez de salir de la app.
// ============================================================
const OVERLAYS = ["notifModal","provModal","joinModal","drawer"];
function isOpen(id){ const el=document.getElementById(id); return !!(el && el.classList.contains("open")); }
function syncScrollLock(){
  const any = OVERLAYS.some(isOpen) || isOpen("lightbox");
  document.body.style.overflow = any ? "hidden" : "";
}
function uiClose(id){
  const el=document.getElementById(id); if(el) el.classList.remove("open");
  if(id==="drawer") document.getElementById("overlay").classList.remove("open");
}
function closeAllOverlays(){ OVERLAYS.forEach(uiClose); const lb=document.getElementById("lightbox"); if(lb) lb.classList.remove("open"); syncScrollLock(); }
function openOverlay(id){
  OVERLAYS.filter(x=>x!==id).forEach(uiClose);
  document.getElementById(id).classList.add("open");
  if(id==="drawer") document.getElementById("overlay").classList.add("open");
  syncScrollLock();
  const st = history.state || {};
  if(st.ov) history.replaceState(Object.assign({}, st, { ov:id }), "");
  else history.pushState({ nav:curNav, d:(st.d||0)+1, ov:id }, "");
}
function closeOverlay(id){
  if(!isOpen(id)) return;
  uiClose(id); syncScrollLock();
  const st = history.state || {};
  if(st.ov) history.back();
}
function closeDrawer(){ closeOverlay("drawer"); }

// ============================================================
//  NAVEGACIÓN ENTRE VISTAS
// ============================================================
const views = ["inicio","categorias","lista","contacto"];
let curNav = "inicio";
function showView(v, keepScroll){
  views.forEach(x=>document.getElementById("view-"+x).classList.toggle("hidden", x!==v));
  if(!keepScroll) window.scrollTo({top:0,behavior:"instant"});
}
function setActive(active){
  document.querySelectorAll(".bnav,.top-nav a,.drawer-menu a[data-nav]").forEach(b=>b.classList.toggle("active", b.dataset.nav===active));
}
// Dibuja la vista pedida (sin tocar el historial).
function render(nav, { keepScroll=false } = {}){
  curNav = nav;
  if(nav.startsWith("cat:")){
    const cats = getAllCats(); const cat = cats[+nav.slice(4)];
    if(!cat) return render("categorias");
    const list = catProviders(cat);
    openList(cat.nombre, plural(list.length,"proveedor"), list, "", keepScroll);
    setActive("categorias"); return;
  }
  switch(nav){
    case "categorias": showView("categorias", keepScroll); setActive("categorias"); break;
    case "contacto": showView("contacto", keepScroll); setActive("contacto"); break;
    case "todos": openList("Todos los proveedores", "", PROV, "", keepScroll); setActive("todos"); break;
    case "favoritos": openList("Favoritos", "Tus proveedores guardados", PROV.filter(p=>isFav(p.id)), "Aún no tienes favoritos. Toca el ♥ de un proveedor para guardarlo aquí.", keepScroll); setActive("favoritos"); break;
    case "destacados": openList("Proveedores destacados", "", PROV.filter(p=>p.destacado), "", keepScroll); setActive("destacados"); break;
    case "promociones": openList("Promociones", "Proveedores con ofertas", PROV.filter(p=>p.promo || /%/.test(p.badge)), "", keepScroll); setActive("promociones"); break;
    default: curNav="inicio"; if(!keepScroll) resetHomeSearch(); showView("inicio", keepScroll); setActive("inicio");
  }
}
// Navega y registra el paso en el historial.
function go(nav){
  const st = history.state || {};
  const wasOverlay = !!st.ov;
  OVERLAYS.forEach(uiClose); syncScrollLock();
  render(nav);
  if(nav==="inicio"){
    if(st.d>0) history.go(-st.d);
    return;
  }
  const state = { nav, d: wasOverlay ? st.d : (st.d||0)+1 };
  if(wasOverlay) history.replaceState(state, ""); else history.pushState(state, "");
}
window.addEventListener("popstate", e=>{
  const st = e.state || { nav:"inicio", d:0 };
  const lb=document.getElementById("lightbox"); if(lb) lb.classList.remove("open");
  OVERLAYS.forEach(uiClose); syncScrollLock();
  if(st.ov){ history.replaceState({ nav:st.nav, d:st.d }, ""); } // «adelante» a una ventana ya cerrada
  const nav = st.nav || "inicio";
  if(nav!==curNav) render(nav);
});
function wireNav(){
  document.querySelectorAll("[data-nav]").forEach(el=>el.addEventListener("click", ()=>go(el.dataset.nav)));
  document.getElementById("menuBtn").addEventListener("click", ()=>openOverlay("drawer"));
  document.getElementById("userBtn").addEventListener("click", ()=>openOverlay("drawer"));
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("overlay").addEventListener("click", closeDrawer);
  document.getElementById("listBack").addEventListener("click", ()=>go("inicio"));
}

// ============================================================
//  CATEGORÍAS
// ============================================================
// Categorías por defecto + personalizadas (desde el admin)
function getAllCats(){
  // Si el admin ya definió categorías (incluye las base editadas), se usan esas;
  // si no, se usan las categorías base por defecto.
  if (SITE && Array.isArray(SITE.categorias) && SITE.categorias.length) return SITE.categorias;
  return CATEGORIAS;
}
function catProviders(cat){
  if (Array.isArray(cat.ids)) { const set = new Set(cat.ids.map(String)); return PROV.filter(p=>set.has(String(p.id))); }
  return PROV.filter(p=>p.categoria===cat.nombre);
}
// El azul era el color por defecto anterior: se muestra con el teal CANIRAC.
function brandColor(c){ return /^#1877e6$/i.test(String(c||"").trim()) ? "#00758D" : safeColor(c, "#00758D"); }
function catByName(name){ return getAllCats().find(c=>c.nombre===name) || CATEGORIAS.find(c=>c.nombre===name) || {}; }
function catVisual(cat){
  const icon = cat.emoji ? `<span class="cat-emoji">${escapeHtml(cat.emoji)}</span>` : (CATEGORY_ICONS[cat.nombre] || CATEGORY_ICONS["Otros"]);
  const img = safeUrl(cat.imagen);
  // Si la foto no carga, se quita y queda el ícono (no un hueco en blanco)
  return img ? `<img class="cat-img" src="${escapeHtml(img)}" alt="" loading="lazy" onerror="this.parentNode.classList.remove('has-img');this.replaceWith(document.createRange().createContextualFragment(this.dataset.fb||''))" data-fb="${escapeHtml(icon)}">` : icon;
}
function catCardHTML(cat, idx, showCount){
  const n = showCount ? catProviders(cat).length : 0;
  return `<button class="cat" data-ci="${idx}">
    <span class="tile ${cat.imagen?'has-img':''}" style="color:${brandColor(cat.color)}">${catVisual(cat)}</span>
    <span class="lbl">${escapeHtml(cat.nombre)}</span>
    ${showCount?`<span class="cnt">${plural(n,"proveedor")}</span>`:""}
  </button>`;
}
function renderCategorias(){
  const cats = getAllCats();
  const home = document.getElementById("catGridHome");
  const all = document.getElementById("catGridAll");
  home.innerHTML = cats.map((c,i)=>catCardHTML(c,i,false)).join("");
  all.innerHTML = cats.map((c,i)=>catCardHTML(c,i,true)).join("");
  [home,all].forEach(g=>g.querySelectorAll(".cat").forEach(b=>b.onclick=()=>go("cat:"+b.dataset.ci)));
}
// Slider de logos (marquee) en el inicio
function renderMarquee(images){
  const el = document.getElementById("logoMarquee");
  if(!el) return;
  const imgs = (images||[]).map(safeUrl).filter(Boolean);
  if(!imgs.length){ el.style.display="none"; el.innerHTML=""; return; }
  el.style.display="";
  const chips = imgs.map(u=>`<div class="mq-item"><img src="${escapeHtml(u)}" alt="" loading="lazy"></div>`).join("");
  el.innerHTML = `<div class="mq-track" style="animation-duration:${Math.max(18, imgs.length*4)}s">${chips}${chips}</div>`;
}

// ============================================================
//  DESTACADOS
// ============================================================
// Foto de portada del proveedor (desde el admin) → su primera foto
function provCover(p){ return safeUrl(p.portada) || safeUrl(p.fotos && p.fotos[0]) || ""; }
function destCardHTML(p){
  const color = brandColor(p.color), logo = safeUrl(p.logo), portada = safeUrl(p.portada), foto = safeUrl(p.fotos && p.fotos[0]);
  const fallback = `<div class="logo-fallback" style="opacity:.92">${catIcon(p.categoria).replace('<svg','<svg width="52" height="52"')}</div>`;
  const media = portada
    ? `<img src="${escapeHtml(portada)}" alt="${escapeHtml(p.nombre)}" loading="lazy">`
    : logo
      ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(p.nombre)}" loading="lazy" style="object-fit:contain;padding:16px;background:#fff">`
      : foto
        ? `<img src="${escapeHtml(foto)}" alt="${escapeHtml(p.nombre)}" loading="lazy">`
        : fallback;
  const badge = p.badge
    ? `<span class="dest-badge ${/%/.test(p.badge)?"":"member"}">${/%/.test(p.badge)?"":ICONS.starFilled}${escapeHtml(p.badge)}</span>`
    : "";
  return `<article class="dest-card" data-id="${escapeHtml(p.id)}">
    <div class="dest-media" style="background:${color}">
      ${media}
      ${badge}
      <button class="fav-btn ${isFav(p.id)?"on":""}" data-fav="${escapeHtml(p.id)}" aria-label="Favorito">${isFav(p.id)?ICONS.heartFilled:ICONS.heart}</button>
    </div>
    <div class="dest-body">
      <div class="nm">${escapeHtml(p.nombre)}</div>
      <div class="gr">${catIcon(p.categoria).replace('<svg','<svg style="color:'+color+'"')}<span>${escapeHtml((p.giro||p.categoria||"").split(",")[0].slice(0,26))}</span></div>
      <button class="btn-see" data-id="${escapeHtml(p.id)}">Ver proveedor</button>
    </div>
  </article>`;
}
function renderDestacados(){
  let list = PROV.filter(p=>p.destacado);
  if(!list.length) list = PROV.slice(0,8);
  const row = document.getElementById("destRow");
  row.innerHTML = list.map(destCardHTML).join("");
  wireCardEvents(row);
}

// ============================================================
//  LISTA (categoría / búsqueda / favoritos / etc.)
// ============================================================
function cardsHTML(list, emptyMsg){
  if(!list.length) return `<div class="empty">${ICONS.search}<div>${escapeHtml(emptyMsg || "No se encontraron proveedores.")}</div></div>`;
  return list.slice().sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")).map(p=>{
    const logo = safeUrl(p.logo), foto = provCover(p);
    return `
      <article class="p-card" data-id="${escapeHtml(p.id)}">
        <div class="p-thumb" style="background:${logo?'#fff':brandColor(p.color)}">${logo?`<img src="${escapeHtml(logo)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain;border-radius:13px;padding:5px">`:(foto?`<img src="${escapeHtml(foto)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:13px">`:escapeHtml(initials(p.nombre)))}</div>
        <div class="p-info">
          <div class="nm">${escapeHtml(p.nombre)}</div>
          <div class="gr">${escapeHtml(p.giro||"")}</div>
          <span class="p-chip">${escapeHtml(p.categoria)}</span>
        </div>
        <button class="fav-btn ${isFav(p.id)?"on":""}" data-fav="${escapeHtml(p.id)}" aria-label="Favorito">${isFav(p.id)?ICONS.heartFilled:ICONS.heart}</button>
      </article>`;}).join("");
}
function openList(title, sub, list, emptyMsg, keepScroll){
  document.getElementById("listTitle").textContent = title;
  document.getElementById("listSub").textContent = sub || plural(list.length,"proveedor");
  const grid = document.getElementById("listGrid");
  grid.innerHTML = cardsHTML(list, emptyMsg);
  wireCardEvents(grid);
  showView("lista", keepScroll);
}

function wireCardEvents(root){
  root.querySelectorAll("[data-fav]").forEach(b=>b.addEventListener("click", e=>{
    e.stopPropagation();
    toggleFav(b.dataset.fav);
    const on = isFav(b.dataset.fav);
    document.querySelectorAll(`[data-fav="${CSS.escape(b.dataset.fav)}"]`).forEach(x=>{ x.classList.toggle("on", on); x.innerHTML = on?ICONS.heartFilled:ICONS.heart; });
    if(curNav==="favoritos" && !on){ render("favoritos"); }
  }));
  root.querySelectorAll("[data-id]").forEach(el=>el.addEventListener("click", e=>{
    if(e.target.closest("[data-fav]")) return;
    if(el.classList.contains("btn-see")) e.stopPropagation(); // evita abrir la ficha dos veces
    openModal(el.dataset.id);
  }));
}

// ============================================================
//  BÚSQUEDA
// ============================================================
function resetHomeSearch(){
  const inp = document.getElementById("searchInput");
  if(inp) inp.value = "";
  const results = document.getElementById("homeResults");
  const sections = document.getElementById("homeSections");
  if(results){ results.style.display="none"; results.innerHTML=""; }
  if(sections){ sections.style.display=""; }
  const clr=document.getElementById("searchClear"); if(clr) clr.classList.add("hidden");
  renderRecent();
}
function wireSearch(){
  const inp = document.getElementById("searchInput");
  const results = document.getElementById("homeResults");
  const sections = document.getElementById("homeSections");
  const clr = document.getElementById("searchClear");
  let t;
  const hs = document.getElementById("headerSearch");
  // Lleva la vista a los resultados (en computadora quedan bajo la portada)
  const showResults = ()=>{ if(inp.value.trim()) setTimeout(()=>{ const r=document.getElementById("homeResults"); if(r.style.display!=="none") r.scrollIntoView({behavior:"smooth", block:"start"}); }, 200); };
  // Guarda la búsqueda en el historial cuando el usuario termina de escribir
  inp.addEventListener("change", ()=>{ addRecent(inp.value); });
  inp.addEventListener("keydown", e=>{ if(e.key==="Enter"){ addRecent(inp.value); inp.blur(); showResults(); } });
  const sf = document.getElementById("searchForm");
  if(sf) sf.addEventListener("submit", e=>{ e.preventDefault(); addRecent(inp.value); inp.blur(); showResults(); });
  clr.addEventListener("click", ()=>{ resetHomeSearch(); if(hs) hs.value=""; inp.focus(); });
  // Buscador del encabezado (computadora): escribe en el buscador principal
  if(hs){
    hs.addEventListener("input", ()=>{
      if(curNav!=="inicio") go("inicio");
      inp.value = hs.value; inp.dispatchEvent(new Event("input"));
    });
    hs.addEventListener("keydown", e=>{ if(e.key==="Enter"){ addRecent(hs.value); showResults(); } });
  }
  inp.addEventListener("input", ()=>{
    clearTimeout(t);
    const raw = inp.value.trim();
    const q = norm(raw);
    if(hs && document.activeElement!==hs) hs.value = inp.value;
    clr.classList.toggle("hidden", !inp.value);
    if(!q){ results.style.display="none"; results.innerHTML=""; sections.style.display=""; renderRecent(); return; }
    renderRecent();
    t = setTimeout(()=>{
      const terms = q.split(/\s+/);
      const res = PROV.filter(p=>{
        const hay = norm([p.nombre,p.giro,p.categoria,p.contacto,p.descripcion,p.ubicacion].join(" "));
        return terms.every(tm=>hay.includes(tm));
      });
      sections.style.display = "none";
      results.style.display = "";
      results.innerHTML =
        `<div class="results-head"><h2>Resultados</h2><span>${res.length} para “${escapeHtml(raw)}”</span></div>
         <div class="list">${cardsHTML(res)}</div>`;
      wireCardEvents(results);
    }, 140);
  });
}

// ============================================================
//  MODAL PROVEEDOR
// ============================================================
function openModal(id){
  const p = PROV.find(x=>String(x.id)===String(id));
  if(!p) return;
  // Encabezado de la ficha: su foto de portada (si tiene) o el color del proveedor
  const head = document.getElementById("pmHead"), color = brandColor(p.color), cover = safeUrl(p.portada);
  head.style.background = cover
    ? `linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.65)), url("${cover.replace(/"/g,"%22")}") center/cover`
    : `linear-gradient(150deg, ${color}, ${shade(color,-25)})`;
  head.style.minHeight = cover ? "180px" : "";
  head.style.justifyContent = cover ? "flex-end" : "";
  document.getElementById("pmCat").textContent = p.categoria || "Proveedor";
  document.getElementById("pmName").textContent = p.nombre;

  const rows=[];
  if(p.contacto) rows.push(row("Contacto", escapeHtml(p.contacto)));
  const tel = p.telContacto || p.telNegocio;
  if(tel){
    const first = (tel.split("/")[0]||"").replace(/[^\d+]/g,"");
    rows.push(row("Teléfono", first ? `<a class="m-tel" href="tel:${escapeHtml(first)}">${escapeHtml(tel)}</a>` : escapeHtml(tel)));
  }
  if(p.giro) rows.push(row("Giro", escapeHtml(p.giro)));
  if(p.ubicacion) rows.push(row("Ubicación", escapeHtml(p.ubicacion)));

  const social=[];
  const ig=safeUrl(p.instagram), fb=safeUrl(p.facebook), web=safeUrl(p.web);
  if(ig)  social.push(`<a href="${escapeHtml(ig)}" target="_blank" rel="noopener">${ICONS.ig} Instagram</a>`);
  if(fb)  social.push(`<a href="${escapeHtml(fb)}" target="_blank" rel="noopener">${ICONS.fb} Facebook</a>`);
  if(web) social.push(`<a href="${escapeHtml(web)}" target="_blank" rel="noopener">${ICONS.web} Sitio web</a>`);

  const photos = (p.fotos||[]).map(safeUrl).filter(Boolean);
  const wa = provWa(p);
  // Varios videos: usa la lista p.videos; si no, cae al campo p.video (compatibilidad)
  const vids = (Array.isArray(p.videos) && p.videos.length ? p.videos : (p.video ? [p.video] : [])).map(safeUrl).filter(Boolean);
  const videoHtml = vids.map(v=>{
    const emb = videoEmbed(v);
    if(!emb) return "";
    return `<div class="m-video">${emb.type==="iframe"
        ? `<iframe src="${escapeHtml(emb.src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
        : `<video src="${escapeHtml(emb.src)}" controls playsinline preload="metadata"></video>`}</div>`;
  }).join("");
  const logo = safeUrl(p.logo);
  const logoHtml = logo ? `<div class="pm-plogo"><img src="${escapeHtml(logo)}" alt="${escapeHtml(p.nombre)}"></div>` : "";
  document.getElementById("pmBody").innerHTML = `
    ${logoHtml}
    ${videoHtml}
    ${photos.length?`<div class="m-photos">${photos.map(f=>`<img src="${escapeHtml(f)}" class="promo-img" data-lb="${escapeHtml(f)}" alt="Foto de ${escapeHtml(p.nombre)}" loading="lazy">`).join("")}</div>`:""}
    ${p.descripcion?`<p class="m-desc">${escapeHtml(p.descripcion)}</p>`:""}
    ${rows.join("")}
    ${social.length?`<div class="m-row"><div class="k">Redes</div><div class="v"><div class="m-social">${social.join("")}</div></div></div>`:""}
    <div class="m-actions">
      ${wa?`<a class="btn-wa" href="${waLink(wa,MENSAJE_PROVEEDOR)}" target="_blank" rel="noopener">${ICONS.wa} WhatsApp</a>`:`<span class="btn-wa" style="background:#cbd5e1">Sin WhatsApp</span>`}
      <button class="btn-fav-lg ${isFav(p.id)?"on":""}" id="pmFav" aria-label="Favorito">${isFav(p.id)?ICONS.heartFilled:ICONS.heart}</button>
      <button class="btn-fav-lg" id="pmShare" aria-label="Compartir">${ICONS.share||ICONS.chevR}</button>
    </div>`;
  document.getElementById("pmFav").onclick = ()=>{
    toggleFav(p.id);
    const on=isFav(p.id);
    const b=document.getElementById("pmFav"); b.classList.toggle("on",on); b.innerHTML=on?ICONS.heartFilled:ICONS.heart;
    // refrescar tarjetas visibles
    document.querySelectorAll(`[data-fav="${CSS.escape(String(p.id))}"]`).forEach(x=>{x.classList.toggle("on",on);x.innerHTML=on?ICONS.heartFilled:ICONS.heart;});
    if(curNav==="favoritos") render("favoritos");
  };
  document.getElementById("pmShare").onclick = ()=>shareProvider(p);
  document.querySelectorAll("#pmBody [data-lb]").forEach(im=>im.addEventListener("click", ()=>openLightbox(im.dataset.lb)));
  document.getElementById("pmBody").scrollTop = 0;
  openOverlay("provModal");
}
// Compartir los datos del proveedor (WhatsApp, correo, etc.) con el menú nativo del teléfono.
async function shareProvider(p){
  const lines = [p.nombre, p.giro, (p.contacto?("Contacto: "+p.contacto):""), (p.telContacto||p.telNegocio)?("Tel: "+(p.telContacto||p.telNegocio)):"", safeUrl(p.web)].filter(Boolean);
  const text = lines.join("\n") + "\n\nVía Catálogo de Proveedores CANIRAC Laguna";
  try{
    if(navigator.share){ await navigator.share({ title:p.nombre, text }); return; }
    await navigator.clipboard.writeText(text);
    toast("Datos copiados. Pégalos donde quieras.");
  }catch(e){ if(e && e.name!=="AbortError") toast("No se pudo compartir","err"); }
}
// Ver imagen en grande
function openLightbox(url){
  let lb = document.getElementById("lightbox");
  if(!lb){
    lb = document.createElement("div"); lb.id="lightbox"; lb.className="lightbox";
    lb.innerHTML = `<button class="lb-close" aria-label="Cerrar">${ICONS.close}</button><img alt="">`;
    document.body.appendChild(lb);
    lb.addEventListener("click", e=>{ if(e.target===lb || e.target.closest(".lb-close")){ lb.classList.remove("open"); syncScrollLock(); } });
  }
  lb.querySelector("img").src = url;
  lb.classList.add("open");
  syncScrollLock();
}
function row(k,v){ return `<div class="m-row"><div class="k">${k}</div><div class="v">${v}</div></div>`; }

// ============================================================
//  MODAL REGISTRO DE PROVEEDORES
// ============================================================
function wireModals(){
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click", ()=>closeOverlay(b.dataset.close)));
  document.getElementById("joinBtn").onclick = ()=>{ resetJoin(); openOverlay("joinModal"); };
  // Tocar fuera de la ventana la cierra (y libera el desplazamiento de la página)
  document.querySelectorAll(".modal-overlay").forEach(o=>o.addEventListener("click", e=>{ if(e.target===o) closeOverlay(o.id); }));
  document.getElementById("jmSend").onclick = submitJoin;
}
function resetJoin(){
  document.getElementById("jmForm").classList.remove("hidden");
  document.getElementById("jmOk").classList.add("hidden");
  ["nombre","telefono","giro","mensaje"].forEach(k=>document.getElementById("j-"+k).value="");
  document.getElementById("jmMsg").className="form-msg";
}
async function submitJoin(){
  const data={ nombre:val("j-nombre"), telefono:val("j-telefono"), giro:val("j-giro"), mensaje:val("j-mensaje") };
  const msg=document.getElementById("jmMsg");
  if(!data.nombre||!data.telefono||!data.giro){ msg.className="form-msg err"; msg.textContent="Completa los campos obligatorios (*)."; return; }
  if(data.telefono.replace(/\D/g,"").length<10){ msg.className="form-msg err"; msg.textContent="Escribe un teléfono de 10 dígitos."; return; }
  const btn=document.getElementById("jmSend"); btn.disabled=true; btn.textContent="Enviando…";
  try{
    await addEquipo(data);
    document.getElementById("jmForm").classList.add("hidden");
    document.getElementById("jmOk").classList.remove("hidden");
  }catch(e){
    msg.className="form-msg err"; msg.textContent="No se pudo enviar. Revisa tu conexión.";
    console.error(e);
  }finally{ btn.disabled=false; btn.textContent="Enviar solicitud"; }
}
function val(id){ return document.getElementById(id).value.trim(); }

document.addEventListener("keydown", e=>{
  if(e.key!=="Escape") return;
  const lb=document.getElementById("lightbox");
  if(lb && lb.classList.contains("open")){ lb.classList.remove("open"); syncScrollLock(); return; }
  const open = OVERLAYS.find(isOpen);
  if(open) closeOverlay(open);
});

// ============================================================
//  DRAWER: redes + info · CONTACTO · PIE DE PÁGINA
// ============================================================
function renderDrawerSocial(){
  document.getElementById("drawerSocial").innerHTML = `
    <a href="${CONTACTO.facebook}" target="_blank" rel="noopener"><span class="rsi fb">${ICONS.fb}</span> Facebook</a>
    <a href="${CONTACTO.instagram}" target="_blank" rel="noopener"><span class="rsi ig">${ICONS.ig}</span> Instagram</a>
    <a href="${CAMARA_WA}" target="_blank" rel="noopener"><span class="rsi wa">${ICONS.wa}</span> WhatsApp</a>`;
}
function renderDrawerInfo(){
  document.getElementById("drawerInfo").innerHTML = `
    <b>CANIRAC Laguna</b>
    <p>Trabajamos para fortalecer la industria restaurantera y apoyar el crecimiento de tu negocio.</p>
    <a href="${CONTACTO.web}" target="_blank" rel="noopener">${ICONS.web} ${CONTACTO.web.replace(/^https?:\/\//,"")}</a>`;
}
function renderFooter(){
  document.getElementById("appFooter").innerHTML = `
    <div class="af-in">
      <div class="af-brand">${brandHTML({ vertical:false })}<p>Trabajamos para fortalecer la industria restaurantera y apoyar el crecimiento de tu negocio.</p></div>
      <div class="af-links">
        <a href="${CAMARA_WA}" target="_blank" rel="noopener">${ICONS.wa} ${CONTACTO.telefono}</a>
        <a href="${CONTACTO.instagram}" target="_blank" rel="noopener">${ICONS.ig} Instagram</a>
        <a href="${CONTACTO.facebook}" target="_blank" rel="noopener">${ICONS.fb} Facebook</a>
      </div>
    </div>
    <div class="af-copy">© ${new Date().getFullYear()} CANIRAC Laguna · Catálogo de Proveedores</div>`;
}
function renderAbout(){
  const d = (SITE && SITE.contacto) || {};
  const el = document.getElementById("aboutTxt");
  if(el && d.descripcion) el.textContent = d.descripcion;
}
function renderContacto(){
  const d = (SITE && SITE.contacto) || {};
  const web = safeUrl(d.web) || CONTACTO.web;
  document.getElementById("contactCard").innerHTML = `
    ${brandHTML({ vertical:true })}
    <p>${escapeHtml(d.descripcion || "Trabajamos para fortalecer la industria restaurantera y apoyar el crecimiento de tu negocio.")}</p>
    <div class="contact-actions">
      <a class="c-btn c-wa" href="${CAMARA_WA}" target="_blank" rel="noopener">${ICONS.wa} WhatsApp: ${CONTACTO.telefono}</a>
      <a class="c-btn c-ig" href="${CONTACTO.instagram}" target="_blank" rel="noopener">${ICONS.ig} Instagram</a>
      <a class="c-btn c-fb" href="${CONTACTO.facebook}" target="_blank" rel="noopener">${ICONS.fb} Facebook</a>
      <a class="c-btn c-web" href="${escapeHtml(web)}" target="_blank" rel="noopener">${ICONS.web} Sitio web</a>
    </div>`;
}

// ---------- util color ----------
function shade(hex, amt){
  const h = String(hex||"").replace("#",""); if(h.length!==6) return hex;
  let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  r=Math.max(0,Math.min(255,r+amt));g=Math.max(0,Math.min(255,g+amt));b=Math.max(0,Math.min(255,b+amt));
  return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

// Exponer el modo actual para diagnóstico desde la consola
window.caniracMode = () => getMode();

const loader = createLoader();
paintStatic();
start();
