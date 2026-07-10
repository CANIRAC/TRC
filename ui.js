// ============================================================
//  Componentes e íconos compartidos (CANIRAC)
// ============================================================
import { CONTACTO } from "./config.js";

// Imagotipo CANIRAC (hereda el color con currentColor)
export const MARK = `
<svg viewBox="0 0 210 210" fill="none" role="img" aria-label="CANIRAC">
  <path d="M150 44 A82 82 0 1 0 150 166" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
  <g fill="currentColor">
    <rect x="88" y="40" width="5.4" height="46" rx="2.7"/>
    <rect x="99" y="40" width="5.4" height="46" rx="2.7"/>
    <rect x="110" y="40" width="5.4" height="46" rx="2.7"/>
    <rect x="121" y="40" width="5.4" height="46" rx="2.7"/>
    <path d="M86 85 L127 85 L116 106 L97 106 Z"/>
    <rect x="104.4" y="104" width="4.2" height="70" rx="2.1"/>
    <path d="M106.5,116 Q90,113 82,126 Q98,129 106.5,116 Z"/>
    <path d="M106.5,116 Q123,113 131,126 Q115,129 106.5,116 Z"/>
    <path d="M106.5,138 Q90,135 82,148 Q98,151 106.5,138 Z"/>
    <path d="M106.5,138 Q123,135 131,148 Q115,151 106.5,138 Z"/>
    <circle cx="106.5" cy="185" r="6.2"/>
  </g>
</svg>`;

// Logotipo principal: usa tu imagen logo.png. Si no existe, muestra el imagotipo SVG.
export function brandHTML({ onDark = false, size = "", vertical = false } = {}) {
  return `<span class="brand ${onDark ? "on-dark" : ""} ${vertical ? "vertical" : ""} ${size}">
    <span class="brand-chip">
      <img class="brand-img" src="logo.png" alt="CANIRAC Laguna"
           onerror="this.style.display='none';var f=this.nextElementSibling;if(f)f.style.display='block';">
      <span class="brand-fallback">${MARK}</span>
    </span>
  </span>`;
}

export const ICONS = {
  ig: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.75-.86-2-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.19-.24-.57-.48-.5-.66-.5l-.56-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.24-.69.24-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.5 15.28L2 22l4.86-1.27A10 10 0 1 0 12 2z"/></svg>`,
  fb: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>`,
  web: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.7 4 6 4 9.5s-1.4 6.8-4 9.5c-2.6-2.7-4-6-4-9.5s1.4-6.8 4-9.5z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 6.6a5 5 0 0 0-8.8-2.2A5 5 0 0 0 3.2 6.6c0 4.6 8.8 10.4 8.8 10.4s8.8-5.8 8.8-10.4z"/></svg>`,
  heartFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8.8-5.8-8.8-11.4A5 5 0 0 1 12 5.4a5 5 0 0 1 8.8 4.2C20.8 15.2 12 21 12 21z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.9 6.6 20l1-6.1L3.2 9.5l6.1-.9z"/></svg>`,
  starFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.9 6.6 20l1-6.1L3.2 9.5l6.1-.9z"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 12 22l-9-9V4h9z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  chevR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`,
  chevL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>`,
  store: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9v11h18V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M9 20v-5h6v5"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
  trending: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2A3.2 3.2 0 0 1 16 11M21 20c0-2.5-1.3-4.3-3.5-5"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>`
};

// Íconos de categorías (estilo línea, como el mockup)
export const CATEGORY_ICONS = {
  "Carnes": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5a5.5 5.5 0 0 1 4.9 8.9c-1 1.4-.7 2.9-1.7 3.9-1.6 1.6-3.9 1.3-5.4 2.8-1 1-1.2 2.4-2.6 2.4a3 3 0 0 1-3-3c0-1.4 1.4-1.6 2.4-2.6 1.5-1.5 1.2-3.8 2.8-5.4 1-1 2.5-.7 3.9-1.7"/><circle cx="8.2" cy="15.8" r="1.5"/></svg>`,
  "Frutas y Verduras": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21C7 21 4 17 4 12.5 4 8 7 5 12 3c5 2 8 5 8 9.5C20 17 17 21 12 21z"/><path d="M12 21V8M12 8c-1.5-1-3-1-4 0M12 11c1.3-1 2.7-1 4 0"/></svg>`,
  "Hielo": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 7l16 10M20 7 4 17M12 5l2.5-2M12 5 9.5 3M12 19l2.5 2M12 19l-2.5 2M4 7l.3-3M4 7 1 6.7M20 17l-.3 3M20 17l3 .3M20 7l.3-3M20 7l3-.3M4 17l-.3 3M4 17l-3-.3"/></svg>`,
  "Bebidas": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4v3.5l1.2 2.2c.5.9.8 1.9.8 2.9V20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-9.4c0-1 .3-2 .8-2.9L10 5.5z"/><path d="M8 12h8"/></svg>`,
  "Limpieza": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8V5a2 2 0 0 1 2-2h1v4"/><path d="M8 8h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/><path d="M13 3h3M15 5h3M16 7h2"/></svg>`,
  "Desechables": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h12l-1.2 14a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z"/><path d="M5 6h14M9 10v7M15 10v7"/></svg>`,
  "Uniformes": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 4 6l2 4 2-1v9h8v-9l2 1 2-4-5-3-3 2z"/></svg>`,
  "Tecnología": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>`,
  "Mobiliario": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M4 11h16a1 1 0 0 1 1 1v4H3v-4a1 1 0 0 1 1-1z"/><path d="M5 16v3M19 16v3"/></svg>`,
  "Empaques": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.5v9L12 21l9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6"/></svg>`,
  "Otros": `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`
};

export function waLink(number, message) {
  const n = (number || "").replace(/[^\d]/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(message || "")}`;
}

export const CAMARA_WA = waLink(CONTACTO.whatsapp, CONTACTO.whatsappMensaje);

export function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function toast(msg, type = "") {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.className = "toast " + type;
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}

// Convierte URL de YouTube a embed; deja pasar mp4/otros
export function videoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { type: "video", src: url };
}
