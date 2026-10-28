// ============================================================
//  Herramientas para logos del slider (se ejecutan en el navegador)
//  - Detecta el fondo (transparente, liso o complejo)
//  - Elimina el fondo conectado al borde (respeta el blanco dentro del logo)
//  - Recorta los márgenes vacíos para que el logo ocupe más espacio
// ============================================================

// Medida recomendada para pedir a los proveedores (horizontal, como el recuadro del slider)
export const LOGO_RECOMENDADO = { ancho: 800, alto: 400, minAncho: 600, minAlto: 300 };
const MAX_LADO = 1400;   // para procesar rápido aunque suban una imagen enorme
const MAX_SALIDA = 900;  // tamaño final guardado (nítido en pantallas de alta densidad)

export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

// Pasa una imagen a un lienzo de trabajo (reducida si es muy grande)
export function toCanvas(img) {
  const s = Math.min(1, MAX_LADO / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * s));
  c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * s));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const dist = (d, i, bg) => {
  const r = d[i] - bg.r, g = d[i + 1] - bg.g, b = d[i + 2] - bg.b;
  return Math.sqrt(r * r + g * g + b * b);
};

// Analiza el borde de la imagen para saber qué tipo de fondo tiene
export function analyze(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const border = [];
  const step = Math.max(1, Math.floor((w + h) / 400));
  for (let x = 0; x < w; x += step) { border.push((0 * w + x) * 4, ((h - 1) * w + x) * 4); }
  for (let y = 0; y < h; y += step) { border.push((y * w + 0) * 4, (y * w + (w - 1)) * 4); }
  const transp = border.filter(i => d[i + 3] < 24).length / border.length;
  if (transp >= 0.6) return { tipo: "transparente", bg: null, uniformidad: 1, w, h };
  // color dominante del borde
  const buckets = new Map();
  for (const i of border) {
    if (d[i + 3] < 24) continue;
    const k = (d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4);
    const b = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; buckets.set(k, b);
  }
  let top = null; for (const b of buckets.values()) if (!top || b.n > top.n) top = b;
  const bg = { r: Math.round(top.r / top.n), g: Math.round(top.g / top.n), b: Math.round(top.b / top.n) };
  const uniformidad = border.filter(i => d[i + 3] >= 24 && dist(d, i, bg) < 40).length / border.length;
  // Cada uno de los 4 lados debe ser casi todo del color de fondo (una foto o una
  // captura suele tener algún lado de otro color)
  const lado = (idxs) => idxs.filter(i => d[i + 3] >= 24 && dist(d, i, bg) < 40).length / Math.max(1, idxs.length);
  const arriba = [], abajo = [], izq = [], der = [];
  for (let x = 0; x < w; x += step) { arriba.push(x * 4); abajo.push(((h - 1) * w + x) * 4); }
  for (let y = 0; y < h; y += step) { izq.push((y * w) * 4); der.push((y * w + w - 1) * 4); }
  const peorLado = Math.min(lado(arriba), lado(abajo), lado(izq), lado(der));
  return { tipo: uniformidad >= 0.75 && peorLado >= 0.6 ? "liso" : "complejo", bg, uniformidad, peorLado, w, h };
}

// Elimina el fondo: relleno desde los bordes con tolerancia y bordes suavizados.
// sens: 0–100 (más alto = borra colores más parecidos al fondo)
export function removeBackground(canvas, bg, sens = 30) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const T = 6 + sens * 2.2;           // distancia de color considerada "fondo"
  const F = T * 1.9;                  // zona de transición (borde suave)
  const mask = new Uint8Array(w * h); // 1 = fondo
  const q = new Int32Array(w * h); let qh = 0, qt = 0;
  const push = (p) => { if (!mask[p] && dist(d, p * 4, bg) <= T) { mask[p] = 1; q[qt++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (qh < qt) {
    const p = q[qh++], x = p % w, y = (p - x) / w;
    if (x > 0) push(p - 1); if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w); if (y < h - 1) push(p + w);
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (mask[p]) { d[i + 3] = 0; continue; }
    // Borde: píxeles pegados al fondo se vuelven semitransparentes y se les quita el tinte del fondo
    const x = p % w, y = (p - x) / w;
    const nb = (x > 0 && mask[p - 1]) || (x < w - 1 && mask[p + 1]) || (y > 0 && mask[p - w]) || (y < h - 1 && mask[p + w]);
    if (!nb) continue;
    const dd = dist(d, i, bg);
    if (dd >= F) continue;
    const a = Math.max(0.08, (dd - T) / (F - T));
    d[i] = Math.max(0, Math.min(255, (d[i] - bg.r * (1 - a)) / a));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] - bg.g * (1 - a)) / a));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] - bg.b * (1 - a)) / a));
    d[i + 3] = Math.round(d[i + 3] * a);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Recorta márgenes vacíos. Si el fondo no se quitó, recorta el color de fondo.
export function trim(canvas, bg = null, sens = 30) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const T = 6 + sens * 2.2;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const visible = d[i + 3] > 24 && (!bg || dist(d, i, bg) > T);
    if (visible) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return canvas; // imagen vacía: no recortar
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03); // margen mínimo para que respire
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
  const c = document.createElement("canvas");
  c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
  const ctx = c.getContext("2d");
  if (bg) { ctx.fillStyle = `rgb(${bg.r},${bg.g},${bg.b})`; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(canvas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

// Imagen final (PNG con transparencia), limitada a un tamaño razonable
export function exportPng(canvas, maxLado = MAX_SALIDA) {
  const s = Math.min(1, maxLado / Math.max(canvas.width, canvas.height));
  let out = canvas;
  if (s < 1) {
    out = document.createElement("canvas");
    out.width = Math.round(canvas.width * s); out.height = Math.round(canvas.height * s);
    const ctx = out.getContext("2d"); ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
  }
  return new Promise(res => out.toBlob(b => res({ blob: b, dataUrl: out.toDataURL("image/png"), width: out.width, height: out.height }), "image/png"));
}

// Advertencias de calidad para el administrador
export function qualityNotes({ srcW, srcH, outW, outH, tipo, esJpg }) {
  const notes = [];
  const R = LOGO_RECOMENDADO;
  if (outW < 300 || outH < 110) notes.push({ nivel: "err", txt: `El logo es pequeño (${outW} × ${outH} px después de recortar) y puede verse borroso. Pide a tu proveedor uno de al menos ${R.minAncho} × ${R.minAlto} px.` });
  else if (outW < R.minAncho && outH < R.minAlto) notes.push({ nivel: "warn", txt: `Se verá bien, pero para máxima nitidez pide un logo de ${R.ancho} × ${R.alto} px.` });
  const ratio = outW / outH;
  if (ratio < 0.9) notes.push({ nivel: "warn", txt: "El logo es vertical: en el recuadro horizontal se verá más chico. Si el proveedor tiene una versión horizontal, úsala." });
  if (tipo === "complejo") notes.push({ nivel: "warn", txt: "El fondo tiene varios colores o es una foto: el borrado automático puede no ser perfecto. Lo ideal es pedir el logo en PNG con fondo transparente." });
  if (esJpg && tipo !== "transparente") notes.push({ nivel: "info", txt: "Subiste un JPG. Para la mejor calidad pide al proveedor su logo en PNG con fondo transparente." });
  if (!notes.length) notes.push({ nivel: "ok", txt: `Buena calidad (${srcW} × ${srcH} px). Se verá nítido en celulares y computadoras.` });
  return notes;
}
