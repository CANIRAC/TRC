// ============================================================
//  CANIRAC Laguna — App (Directorio de Proveedores)
// ============================================================
import { brandHTML, ICONS, CATEGORY_ICONS, waLink, escapeHtml, toast, CAMARA_WA, videoEmbed } from "./ui.js";
import { CONTACTO, MENSAJE_PROVEEDOR } from "./config.js";
import { CATEGORIAS } from "./seed.js";
import { getProviders, getSite, addEquipo, googleLogin, currentUser, logout, getUserData, saveUserData, enablePush, pushSupported } from "./store.js";

const FAV_KEY = "canirac_favs_v1";
const RECENT_KEY = "canirac_recent_v1";      // búsquedas recientes
const ENTERED_KEY = "canirac_entered_v1";   // recuerda que el visitante ya entró (invitado o Google)
const AUTO_KEY = "canirac_notif_auto_v1";   // pop-up de aviso: una vez por sesión
let PROV = [], SITE = null;
let entered = false, dataReady = false, autoNotifShown = false;
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
}

// ---------- Utilidades ----------
function loadFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY))||[]; }catch(e){ return []; } }
function saveFavsLocal(){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(favs)); }catch(e){} }
function saveFavs(){ saveFavsLocal(); if(currentUser()) saveUserData({ favs, searches: recent }); }
function isFav(id){ return favs.includes(String(id)); }
function toggleFav(id){ id=String(id); const i=favs.indexOf(id); if(i>=0)favs.splice(i,1); else favs.push(id); saveFavs(); }

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

// ---------- Sesión del visitante (favoritos e historial por cuenta) ----------
async function syncUser(){
  const u = currentUser();
  updateSessionUI(u);
  if(!u) return;
  try{
    const data = await getUserData();
    if(data){
      if(Array.isArray(data.favs)) favs = Array.from(new Set([...favs.map(String), ...data.favs.map(String)]));
      if(Array.isArray(data.searches)) recent = Array.from(new Set([...recent, ...data.searches])).slice(0,8);
      saveFavsLocal(); saveRecentLocal();
      saveUserData({ favs, searches: recent }); // que ambos dispositivos converjan
      renderRecent();
      document.querySelectorAll("[data-fav]").forEach(b=>{ const on=isFav(b.dataset.fav); b.classList.toggle("on",on); b.innerHTML=on?ICONS.heartFilled:ICONS.heart; });
    }
  }catch(e){ console.warn("[CANIRAC] syncUser:", e); }
}
function updateSessionUI(u){
  const el = document.getElementById("drawerSession");
  if(!el) return;
  if(u){
    const name = escapeHtml(((u.displayName||u.email||"Usuario").split(" ")[0])||"Usuario");
    el.innerHTML =
      `<div class="ds-user"><span class="ds-av">${ICONS.user}</span>
         <div class="ds-meta"><b>Hola, ${name}</b><small>${escapeHtml(u.email||"")}</small></div></div>
       <button class="ds-btn" id="sessLogout">Cerrar sesión</button>`;
    const lo=document.getElementById("sessLogout");
    if(lo) lo.onclick=async()=>{ try{ await logout(); }catch(e){} try{ localStorage.removeItem(ENTERED_KEY); }catch(e){} location.reload(); };
  } else {
    el.innerHTML =
      `<div class="ds-guest">Estás como invitado</div>
       <button class="ds-btn primary" id="sessLogin">Iniciar sesión con Google</button>`;
    const li=document.getElementById("sessLogin");
    if(li) li.onclick=async()=>{
      try{
        const user=await googleLogin();
        try{ localStorage.setItem(ENTERED_KEY,"1"); }catch(e){}
        await syncUser();
        const n=(user&&(user.displayName||"").split(" ")[0])||"";
        if(n) toast("¡Hola, "+n+"!");
        closeDrawer();
      }catch(e){ console.warn(e); toast("No se pudo iniciar sesión con Google","err"); }
    };
  }
}
function norm(s){ return (s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function initials(n){ return (n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function catColor(cat){ const c = CATEGORIAS.find(x=>x.nombre===cat); return c?c.color:"#1877E6"; }
function catIcon(cat){ return CATEGORY_ICONS[cat] || CATEGORY_ICONS["Otros"]; }
function provWa(p){ return (p.whatsapp || p.telContacto || p.telNegocio || "").replace(/[^\d]/g,""); }

// ============================================================
//  ARRANQUE
// ============================================================
init();
// Failsafe: aunque algo falle o la red tarde, nunca dejar la barra de carga atorada.
setTimeout(()=>hideLoading(), 12000);
async function init(){
  try{
    // logos y textos estáticos
    document.getElementById("headerBrand").innerHTML = brandHTML({ onDark:true, vertical:true, subtitle:true });
    document.getElementById("drawerBrand").innerHTML = brandHTML({ onDark:true, vertical:true, subtitle:true });
    renderDrawerSocial();
    renderDrawerInfo();
    wireSplash();
    wireBell();
    fillIcons();
    wireNav();
    wireSearch();
    wireModals();

    try { PROV = await getProviders(); } catch(e){ PROV = []; }
    PROV = (PROV||[]).map(p=>Object.assign({fotos:[],descripcion:"",badge:"",promo:"",destacado:false,categoria:"Otros",color:"#1877E6",video:"",videos:[],logo:""},p));
    try { SITE = await getSite(); } catch(e){ SITE = {}; }

    safe(renderMarquee, SITE && SITE.slider);
    safe(renderCategorias);
    safe(renderDestacados);
    safe(renderContacto);
    safe(renderNotifs);
    safe(renderRecent);
    safe(applyTheme, SITE);
    syncUser();               // carga sesión y datos del usuario (si inició sesión)
    dataReady = true;
    maybeAutoNotif();
  } catch(e){
    console.error("[CANIRAC] Error al iniciar el catálogo:", e);
  } finally {
    hideLoading();
  }
}
// Ejecuta una función de render sin que un error tumbe el resto del catálogo.
function safe(fn, ...args){ try{ return fn(...args); }catch(e){ console.error("[CANIRAC] Error en "+((fn&&fn.name)||"render")+":", e); } }
function hideLoading(){
  const el = document.getElementById("appLoading");
  if(el){ el.classList.add("gone"); setTimeout(()=>{ el.style.display="none"; }, 400); }
}

// ---------- Apariencia (color y logo configurables desde admin) ----------
function applyTheme(site){
  const t = (site && site.tema) || {};
  if(t.primary) setPrimary(t.primary);
  if(t.logo) setLogo(t.logo);
}
function setPrimary(c){
  const r = document.documentElement.style;
  r.setProperty("--primary", c);
  r.setProperty("--primary-d", shade(c,-30));
  r.setProperty("--primary-l", shade(c,30));
  r.setProperty("--grad", `linear-gradient(160deg, ${shade(c,16)} 0%, ${shade(c,-20)} 100%)`);
  const meta = document.querySelector('meta[name="theme-color"]'); if(meta) meta.content = c;
}
function setLogo(url){
  document.querySelectorAll(".brand-img").forEach(img=>{ img.src = url; img.style.display="block"; const f=img.nextElementSibling; if(f) f.style.display="none"; });
}

// ---------- Portada de bienvenida / Acceso (Google o invitado) ----------
function hideSplash(){
  const splash = document.getElementById("splash");
  if(splash){ splash.classList.add("gone"); setTimeout(()=>{ splash.style.display="none"; }, 500); }
  entered = true;
  maybeAutoNotif();
}
function wireSplash(){
  const brand = document.getElementById("splashBrand");
  if(brand) brand.innerHTML = brandHTML({ onDark:true, vertical:true, subtitle:true });
  const soc = document.getElementById("splashSocial");
  if(soc) soc.innerHTML =
    `<a href="${CONTACTO.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.ig}</a>
     <a href="${CAMARA_WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONS.wa}</a>
     <a href="${CONTACTO.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.fb}</a>`;

  // Si el visitante ya entró antes (invitado o con Google), no volver a preguntar.
  let yaEntro = false;
  try{ yaEntro = localStorage.getItem(ENTERED_KEY)==="1"; }catch(e){}
  if(yaEntro){ hideSplash(); return; }

  const guest = document.getElementById("guestBtn");
  if(guest) guest.onclick = ()=>{ try{ localStorage.setItem(ENTERED_KEY,"1"); }catch(e){} hideSplash(); };

  const gbtn = document.getElementById("googleBtn");
  const note = document.getElementById("authNote");
  if(gbtn) gbtn.onclick = async ()=>{
    if(note) note.textContent = "";
    const original = gbtn.innerHTML;
    gbtn.disabled = true; gbtn.innerHTML = "Conectando…";
    try{
      const user = await googleLogin();
      try{ localStorage.setItem(ENTERED_KEY,"1"); }catch(e){}
      await syncUser();
      const nombre = (user && (user.displayName||"").split(" ")[0]) || "";
      if(nombre) toast("¡Hola, "+nombre+"! 👋");
      hideSplash();
    }catch(e){
      console.warn("[CANIRAC] Google login:", e);
      if(note) note.textContent = "No se pudo iniciar con Google. Puedes entrar como invitado.";
      gbtn.disabled = false; gbtn.innerHTML = original;
    }
  };
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
  const close = document.getElementById("notifClose");
  if(close) close.addEventListener("click", ()=>closeOverlay("notifModal"));
  const ov = document.getElementById("notifModal");
  if(ov) ov.addEventListener("click", e=>{ if(e.target===ov){ ov.classList.remove("open"); document.body.style.overflow=""; } });
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
    setTimeout(()=>openNotifs(false), 500); // no marca como visto: el punto rojo permanece
  }
}
function fmtNotifDate(ts){ try{ return new Date(ts).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}); }catch(e){ return ""; } }

// ---------- Activar avisos push en este celular ----------
const PUSH_ON = "canirac_push_on_v1";
function pushRowHtml(){
  if(!pushSupported()) return "";
  let on=false; try{ on = (localStorage.getItem(PUSH_ON)==="1") && (Notification.permission==="granted"); }catch(e){}
  if(on) return `<div class="push-row on">✅ Avisos activados en este celular</div>`;
  return `<div class="push-row">
    <div class="push-txt"><b>Recibe los avisos en tu celular</b><small>Aunque no tengas la app abierta.</small></div>
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
      toast("¡Listo! Avisos activados en este celular");
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
    body.innerHTML = pushRow + list.map(n=>`
      <div class="notif-item${n.provId?" clickable":""}"${n.provId?` data-prov="${escapeHtml(String(n.provId))}"`:""}>
        ${n.imagen?`<img class="notif-img" src="${escapeHtml(n.imagen)}" alt="">`:""}
        <div class="notif-txt">
          <div class="notif-title">${escapeHtml(n.titulo||"")}</div>
          <div class="notif-msg">${escapeHtml(n.mensaje||"")}</div>
          ${n.enlace?`<a class="notif-link" href="${escapeHtml(n.enlace)}" target="_blank" rel="noopener">Ver más ›</a>`:""}
          ${n.provId?`<a class="notif-link nolink">Ver proveedor ›</a>`:""}
          <div class="notif-date">${n.createdAt?fmtNotifDate(n.createdAt):""}</div>
        </div>
      </div>`).join("");
    body.querySelectorAll(".notif-item.clickable").forEach(el=>el.addEventListener("click", e=>{
      if(e.target.closest("a.notif-link[href]")) return; // enlace externo: dejar navegar
      const id = el.getAttribute("data-prov");
      if(id){ closeOverlay("notifModal"); openModal(id); }
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
//  NAVEGACIÓN ENTRE VISTAS
// ============================================================
const views = ["inicio","categorias","lista","contacto"];
function showView(v){
  views.forEach(x=>document.getElementById("view-"+x).classList.toggle("hidden", x!==v));
  window.scrollTo({top:0,behavior:"instant"});
}
function setBottom(active){
  document.querySelectorAll(".bnav").forEach(b=>b.classList.toggle("active", b.dataset.nav===active));
}
function closeDrawer(){ document.getElementById("drawer").classList.remove("open"); document.getElementById("overlay").classList.remove("open"); }

function go(nav){
  closeDrawer();
  switch(nav){
    case "inicio": resetHomeSearch(); showView("inicio"); setBottom("inicio"); break;
    case "categorias": showView("categorias"); setBottom("categorias"); break;
    case "contacto": showView("contacto"); setBottom("contacto"); break;
    case "todos":
      openList("Todos los proveedores", "", PROV); setBottom(""); break;
    case "favoritos":
      openList("Favoritos", "Tus proveedores guardados", PROV.filter(p=>isFav(p.id))); setBottom("favoritos"); break;
    case "destacados":
      openList("Proveedores destacados", "", PROV.filter(p=>p.destacado)); setBottom(""); break;
    case "promociones":
      openList("Promociones", "Proveedores con ofertas", PROV.filter(p=>p.promo || /%/.test(p.badge))); setBottom(""); break;
    default: showView("inicio"); setBottom("inicio");
  }
}
function wireNav(){
  document.querySelectorAll("[data-nav]").forEach(el=>el.addEventListener("click", ()=>go(el.dataset.nav)));
  document.getElementById("menuBtn").addEventListener("click", ()=>{
    document.getElementById("drawer").classList.add("open");
    document.getElementById("overlay").classList.add("open");
  });
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("overlay").addEventListener("click", closeDrawer);
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
  if (Array.isArray(cat.ids)) { const set = cat.ids.map(String); return PROV.filter(p=>set.includes(String(p.id))); }
  return PROV.filter(p=>p.categoria===cat.nombre);
}
function catVisual(cat){
  if (cat.imagen) return `<img class="cat-img" src="${escapeHtml(cat.imagen)}" alt="">`;
  if (cat.emoji) return `<span class="cat-emoji">${escapeHtml(cat.emoji)}</span>`;
  return CATEGORY_ICONS[cat.nombre] || CATEGORY_ICONS["Otros"];
}
function catCardHTML(cat, idx, showCount){
  const n = showCount ? catProviders(cat).length : 0;
  return `<button class="cat" data-ci="${idx}">
    <span class="tile ${cat.imagen?'has-img':''}" style="color:${cat.color||'#1877E6'}">${catVisual(cat)}</span>
    <span class="lbl">${escapeHtml(cat.nombre)}</span>
    ${showCount?`<span class="cnt">${n}</span>`:""}
  </button>`;
}
function renderCategorias(){
  const cats = getAllCats();
  const home = document.getElementById("catGridHome");
  const all = document.getElementById("catGridAll");
  home.innerHTML = cats.map((c,i)=>catCardHTML(c,i,false)).join("");
  all.innerHTML = cats.map((c,i)=>catCardHTML(c,i,true)).join("");
  [home,all].forEach(g=>g.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{
    const cat = cats[+b.dataset.ci]; if(!cat) return;
    const list = catProviders(cat);
    openList(cat.nombre, `${list.length} proveedor${list.length!==1?"es":""}`, list);
    setBottom("categorias");
  }));
}
// Slider de logos (marquee) en el inicio
function renderMarquee(images){
  const el = document.getElementById("logoMarquee");
  if(!el) return;
  const imgs = (images||[]).filter(Boolean);
  if(!imgs.length){ el.style.display="none"; el.innerHTML=""; return; }
  el.style.display="";
  const chips = imgs.map(u=>`<div class="mq-item"><img src="${escapeHtml(u)}" alt="" loading="lazy"></div>`).join("");
  el.innerHTML = `<div class="mq-track" style="animation-duration:${Math.max(18, imgs.length*4)}s">${chips}${chips}</div>`;
}

// ============================================================
//  DESTACADOS
// ============================================================
function destCardHTML(p){
  const media = p.logo
    ? `<img src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.nombre)}" style="object-fit:contain;padding:16px;background:#fff">`
    : (p.fotos && p.fotos[0])
      ? `<img src="${escapeHtml(p.fotos[0])}" alt="${escapeHtml(p.nombre)}">`
      : `<div class="logo-fallback" style="opacity:.92">${catIcon(p.categoria).replace('<svg','<svg width="52" height="52"')}</div>`;
  const badge = p.badge
    ? `<span class="dest-badge ${/%/.test(p.badge)?"":"member"}">${/%/.test(p.badge)?"":ICONS.starFilled}${escapeHtml(p.badge)}</span>`
    : "";
  return `<article class="dest-card" data-id="${p.id}">
    <div class="dest-media" style="background:${p.color}">
      ${media}
      ${badge}
      <button class="fav-btn ${isFav(p.id)?"on":""}" data-fav="${p.id}" aria-label="Favorito">${isFav(p.id)?ICONS.heartFilled:ICONS.heart}</button>
    </div>
    <div class="dest-body">
      <div class="nm">${escapeHtml(p.nombre)}</div>
      <div class="gr">${catIcon(p.categoria).replace('<svg','<svg style="color:'+p.color+'"')}<span>${escapeHtml((p.giro||p.categoria).split(",")[0].slice(0,26))}</span></div>
      <button class="btn-see" data-id="${p.id}">Ver proveedor</button>
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
function cardsHTML(list){
  if(!list.length) return `<div class="empty">${ICONS.search}<div>No se encontraron proveedores.</div></div>`;
  return list.slice().sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")).map(p=>`
      <article class="p-card" data-id="${p.id}">
        <div class="p-thumb" style="background:${p.logo?'#fff':p.color}">${p.logo?`<img src="${escapeHtml(p.logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:13px;padding:5px">`:(p.fotos&&p.fotos[0]?`<img src="${escapeHtml(p.fotos[0])}" style="width:100%;height:100%;object-fit:cover;border-radius:13px">`:initials(p.nombre))}</div>
        <div class="p-info">
          <div class="nm">${escapeHtml(p.nombre)}</div>
          <div class="gr">${escapeHtml(p.giro||"")}</div>
          <span class="p-chip">${escapeHtml(p.categoria)}</span>
        </div>
        <button class="fav-btn ${isFav(p.id)?"on":""}" data-fav="${p.id}" aria-label="Favorito">${isFav(p.id)?ICONS.heartFilled:ICONS.heart}</button>
      </article>`).join("");
}
function openList(title, sub, list){
  document.getElementById("listTitle").textContent = title;
  document.getElementById("listSub").textContent = sub || `${list.length} proveedor${list.length!==1?"es":""}`;
  const grid = document.getElementById("listGrid");
  grid.innerHTML = cardsHTML(list);
  wireCardEvents(grid);
  showView("lista");
}
document.getElementById("listBack").addEventListener("click", ()=>go("inicio"));

function wireCardEvents(root){
  root.querySelectorAll("[data-fav]").forEach(b=>b.addEventListener("click", e=>{
    e.stopPropagation();
    toggleFav(b.dataset.fav);
    const on = isFav(b.dataset.fav);
    b.classList.toggle("on", on);
    b.innerHTML = on?ICONS.heartFilled:ICONS.heart;
  }));
  root.querySelectorAll("[data-id]").forEach(el=>el.addEventListener("click", e=>{
    if(e.target.closest("[data-fav]")) return;
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
  renderRecent();
}
function wireSearch(){
  const inp = document.getElementById("searchInput");
  const results = document.getElementById("homeResults");
  const sections = document.getElementById("homeSections");
  let t;
  // Guarda la búsqueda en el historial cuando el usuario termina de escribir
  inp.addEventListener("change", ()=>{ addRecent(inp.value); });
  inp.addEventListener("input", ()=>{
    clearTimeout(t);
    const raw = inp.value.trim();
    const q = norm(raw);
    if(!q){ results.style.display="none"; results.innerHTML=""; sections.style.display=""; renderRecent(); return; }
    renderRecent();
    t = setTimeout(()=>{
      const terms = q.split(/\s+/);
      const res = PROV.filter(p=>{
        const hay = norm([p.nombre,p.giro,p.categoria,p.contacto,p.descripcion].join(" "));
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
  document.getElementById("pmHead").style.background = `linear-gradient(150deg, ${p.color}, ${shade(p.color,-25)})`;
  document.getElementById("pmCat").textContent = p.categoria || "Proveedor";
  document.getElementById("pmName").textContent = p.nombre;

  const rows=[];
  if(p.contacto) rows.push(row("Contacto", escapeHtml(p.contacto)));
  const tel = p.telContacto || p.telNegocio;
  if(tel) rows.push(row("Teléfono", escapeHtml(tel)));
  if(p.giro) rows.push(row("Giro", escapeHtml(p.giro)));

  const social=[];
  if(p.instagram) social.push(`<a href="${escapeHtml(p.instagram)}" target="_blank" rel="noopener">${ICONS.ig} Instagram</a>`);
  if(p.facebook)  social.push(`<a href="${escapeHtml(p.facebook)}" target="_blank" rel="noopener">${ICONS.fb} Facebook</a>`);
  if(p.web)       social.push(`<a href="${escapeHtml(p.web)}" target="_blank" rel="noopener">${ICONS.web} Sitio web</a>`);

  const photos = (p.fotos||[]).filter(Boolean);
  const wa = provWa(p);
  // Varios videos: usa la lista p.videos; si no, cae al campo p.video (compatibilidad)
  const vids = (Array.isArray(p.videos) && p.videos.length ? p.videos : (p.video ? [p.video] : [])).filter(Boolean);
  const videoHtml = vids.map(v=>{
    const emb = videoEmbed(v);
    if(!emb) return "";
    return `<div class="m-video">${emb.type==="iframe"
        ? `<iframe src="${escapeHtml(emb.src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : `<video src="${escapeHtml(emb.src)}" controls playsinline preload="metadata"></video>`}</div>`;
  }).join("");
  const logoHtml = p.logo ? `<div class="pm-plogo"><img src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.nombre)}"></div>` : "";
  document.getElementById("pmBody").innerHTML = `
    ${logoHtml}
    ${videoHtml}
    ${photos.length?`<div class="m-photos">${photos.map(f=>`<img src="${escapeHtml(f)}" class="promo-img" data-lb="${escapeHtml(f)}" alt="Promoción">`).join("")}</div>`:""}
    ${p.descripcion?`<p class="m-desc">${escapeHtml(p.descripcion)}</p>`:""}
    ${rows.join("")}
    ${social.length?`<div class="m-row"><div class="k">Redes</div><div class="v"><div class="m-social">${social.join("")}</div></div></div>`:""}
    <div class="m-actions">
      ${wa?`<a class="btn-wa" href="${waLink(wa,MENSAJE_PROVEEDOR)}" target="_blank" rel="noopener">${ICONS.wa} WhatsApp</a>`:`<span class="btn-wa" style="background:#cbd5e1">Sin WhatsApp</span>`}
      <button class="btn-fav-lg ${isFav(p.id)?"on":""}" id="pmFav">${isFav(p.id)?ICONS.heartFilled:ICONS.heart}</button>
    </div>`;
  document.getElementById("pmFav").onclick = ()=>{
    toggleFav(p.id);
    const b=document.getElementById("pmFav"); const on=isFav(p.id);
    b.classList.toggle("on",on); b.innerHTML=on?ICONS.heartFilled:ICONS.heart;
    // refrescar tarjetas visibles
    document.querySelectorAll(`[data-fav="${p.id}"]`).forEach(x=>{x.classList.toggle("on",on);x.innerHTML=on?ICONS.heartFilled:ICONS.heart;});
  };
  document.querySelectorAll("#pmBody [data-lb]").forEach(im=>im.addEventListener("click", ()=>openLightbox(im.dataset.lb)));
  openOverlay("provModal");
}
// Ver imagen en grande
function openLightbox(url){
  let lb = document.getElementById("lightbox");
  if(!lb){
    lb = document.createElement("div"); lb.id="lightbox"; lb.className="lightbox";
    lb.innerHTML = `<button class="lb-close" aria-label="Cerrar">${ICONS.close}</button><img alt="">`;
    document.body.appendChild(lb);
    lb.addEventListener("click", e=>{ if(e.target===lb || e.target.closest(".lb-close")) lb.classList.remove("open"); });
  }
  lb.querySelector("img").src = url;
  lb.classList.add("open");
}
function row(k,v){ return `<div class="m-row"><div class="k">${k}</div><div class="v">${v}</div></div>`; }

// ============================================================
//  MODAL REGISTRO (equipo)
// ============================================================
function wireModals(){
  document.getElementById("pmClose").onclick = ()=>closeOverlay("provModal");
  document.getElementById("jmClose").onclick = ()=>closeOverlay("joinModal");
  document.getElementById("joinBtn").onclick = ()=>{ resetJoin(); openOverlay("joinModal"); };
  document.querySelectorAll(".modal-overlay").forEach(o=>o.addEventListener("click", e=>{ if(e.target===o) o.classList.remove("open"); }));
  document.getElementById("jmSend").onclick = submitJoin;
  document.getElementById("jmDone").onclick = ()=>closeOverlay("joinModal");
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

function openOverlay(id){ document.getElementById(id).classList.add("open"); document.body.style.overflow="hidden"; }
function closeOverlay(id){ document.getElementById(id).classList.remove("open"); document.body.style.overflow=""; }
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ document.querySelectorAll(".modal-overlay.open").forEach(o=>o.classList.remove("open")); document.body.style.overflow=""; closeDrawer(); }});

// ============================================================
//  DRAWER: redes + info · CONTACTO
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
function renderContacto(){
  const d = (SITE && SITE.contacto) || {};
  document.getElementById("contactCard").innerHTML = `
    ${brandHTML({ vertical:true, subtitle:true })}
    <p>${escapeHtml(d.descripcion || "Trabajamos para fortalecer la industria restaurantera y apoyar el crecimiento de tu negocio.")}</p>
    <div class="contact-actions">
      <a class="c-btn c-wa" href="${CAMARA_WA}" target="_blank" rel="noopener">${ICONS.wa} WhatsApp: ${CONTACTO.telefono}</a>
      <a class="c-btn c-ig" href="${CONTACTO.instagram}" target="_blank" rel="noopener">${ICONS.ig} Instagram</a>
      <a class="c-btn c-fb" href="${CONTACTO.facebook}" target="_blank" rel="noopener">${ICONS.fb} Facebook</a>
      <a class="c-btn c-web" href="${d.web || CONTACTO.web}" target="_blank" rel="noopener">${ICONS.web} Sitio web</a>
    </div>`;
}

// ---------- util color ----------
function shade(hex, amt){
  const h = hex.replace("#",""); if(h.length!==6) return hex;
  let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  r=Math.max(0,Math.min(255,r+amt));g=Math.max(0,Math.min(255,g+amt));b=Math.max(0,Math.min(255,b+amt));
  return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
}
