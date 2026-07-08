// ============================================================
//  CANIRAC Laguna — App (Directorio de Proveedores)
// ============================================================
import { brandHTML, ICONS, CATEGORY_ICONS, waLink, escapeHtml, toast, CAMARA_WA, videoEmbed } from "./ui.js";
import { CONTACTO, MENSAJE_PROVEEDOR } from "./config.js";
import { CATEGORIAS } from "./seed.js";
import { getProviders, getSite, addEquipo } from "./store.js";

const FAV_KEY = "canirac_favs_v1";
let PROV = [], SITE = null;
let favs = loadFavs();

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
function saveFavs(){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(favs)); }catch(e){} }
function isFav(id){ return favs.includes(String(id)); }
function toggleFav(id){ id=String(id); const i=favs.indexOf(id); if(i>=0)favs.splice(i,1); else favs.push(id); saveFavs(); }
function norm(s){ return (s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function initials(n){ return (n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function catColor(cat){ const c = CATEGORIAS.find(x=>x.nombre===cat); return c?c.color:"#1877E6"; }
function catIcon(cat){ return CATEGORY_ICONS[cat] || CATEGORY_ICONS["Otros"]; }
function provWa(p){ return (p.whatsapp || p.telContacto || p.telNegocio || "").replace(/[^\d]/g,""); }

// ============================================================
//  ARRANQUE
// ============================================================
init();
async function init(){
  // logos y textos estáticos
  document.getElementById("headerBrand").innerHTML = brandHTML({ onDark:true, vertical:true, subtitle:true });
  document.getElementById("drawerBrand").innerHTML = brandHTML({ onDark:true, vertical:true, subtitle:true });
  renderDrawerSocial();
  renderDrawerInfo();
  wireSplash();
  fillIcons();
  wireNav();
  wireSearch();
  wireModals();

  try { PROV = await getProviders(); } catch(e){ PROV = []; }
  PROV = PROV.map(p=>Object.assign({fotos:[],descripcion:"",badge:"",promo:"",destacado:false,categoria:"Otros",color:"#1877E6",video:""},p));
  try { SITE = await getSite(); } catch(e){ SITE = {}; }

  renderCategorias();
  renderDestacados();
  renderContacto();
  applyTheme(SITE);
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
  document.querySelectorAll(".brand .mark").forEach(m=>{ m.innerHTML = `<img src="${url}" alt="CANIRAC" style="width:100%;height:100%;object-fit:contain">`; });
}

// ---------- Portada de bienvenida ----------
function wireSplash(){
  const brand = document.getElementById("splashBrand");
  if(brand) brand.innerHTML = brandHTML({ onDark:true, vertical:true, subtitle:true });
  const soc = document.getElementById("splashSocial");
  if(soc) soc.innerHTML =
    `<a href="${CONTACTO.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.ig}</a>
     <a href="${CAMARA_WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONS.wa}</a>
     <a href="${CONTACTO.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.fb}</a>`;
  const btn = document.getElementById("enterBtn");
  const splash = document.getElementById("splash");
  if(btn && splash) btn.onclick = ()=>{ splash.classList.add("gone"); setTimeout(()=>{ splash.style.display="none"; }, 500); };
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
function countCat(cat){ return PROV.filter(p=>p.categoria===cat).length; }
function catCardHTML(c, showCount){
  return `<button class="cat" data-cat="${escapeHtml(c.nombre)}">
    <span class="tile" style="color:${c.color}">${catIcon(c.nombre)}</span>
    <span class="lbl">${escapeHtml(c.nombre)}</span>
    ${showCount?`<span class="cnt">${countCat(c.nombre)}</span>`:""}
  </button>`;
}
function renderCategorias(){
  const home = document.getElementById("catGridHome");
  const all = document.getElementById("catGridAll");
  home.innerHTML = CATEGORIAS.map(c=>catCardHTML(c,false)).join("");
  all.innerHTML = CATEGORIAS.map(c=>catCardHTML(c,true)).join("");
  [home,all].forEach(g=>g.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{
    const cat=b.dataset.cat;
    openList(cat, `${countCat(cat)} proveedor${countCat(cat)!==1?"es":""}`, PROV.filter(p=>p.categoria===cat));
    setBottom("categorias");
  }));
}

// ============================================================
//  DESTACADOS
// ============================================================
function destCardHTML(p){
  const media = (p.fotos && p.fotos[0])
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
        <div class="p-thumb" style="background:${p.color}">${p.fotos&&p.fotos[0]?`<img src="${escapeHtml(p.fotos[0])}" style="width:100%;height:100%;object-fit:cover;border-radius:13px">`:initials(p.nombre)}</div>
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
}
function wireSearch(){
  const inp = document.getElementById("searchInput");
  const results = document.getElementById("homeResults");
  const sections = document.getElementById("homeSections");
  let t;
  inp.addEventListener("input", ()=>{
    clearTimeout(t);
    const raw = inp.value.trim();
    const q = norm(raw);
    if(!q){ results.style.display="none"; results.innerHTML=""; sections.style.display=""; return; }
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
  const emb = p.video ? videoEmbed(p.video) : null;
  const videoHtml = emb
    ? `<div class="m-video">${emb.type==="iframe"
        ? `<iframe src="${escapeHtml(emb.src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : `<video src="${escapeHtml(emb.src)}" controls playsinline preload="metadata"></video>`}</div>`
    : "";
  document.getElementById("pmBody").innerHTML = `
    ${videoHtml}
    ${photos.length?`<div class="m-photos">${photos.map(f=>`<img src="${escapeHtml(f)}" alt="">`).join("")}</div>`:""}
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
  openOverlay("provModal");
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
