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

// Devuelve el bloque de logotipo (imagotipo + palabra CANIRAC + subtítulo)
export function brandHTML({ onDark = false, size = "", subtitle = true, vertical = false } = {}) {
  const sub = subtitle
    ? `<small>Cámara Nacional de la Industria de Restaurantes y Alimentos Condimentados${vertical ? " · Laguna" : ""}</small>`
    : "";
  return `<span class="brand ${onDark ? "on-dark" : ""} ${vertical ? "vertical" : ""} ${size}">
    <span class="mark">${MARK}</span>
    <span class="word"><b>CANIRAC</b>${sub}</span>
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
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`
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
