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

// ============================================================
//  Borrado de fondo v2 (como remove.bg): trabaja con una "máscara"
//  (0 = se borra, 255 = se queda) para poder retocar y deshacer.
// ============================================================
const near = (d, i, bgs) => {
  let m = 1e9;
  for (const b of bgs) { const r = d[i] - b.r, g = d[i + 1] - b.g, bb = d[i + 2] - b.b, v = r * r + g * g + bb * bb; if (v < m) m = v; }
  return Math.sqrt(m);
};

// Colores dominantes de un conjunto de píxeles (hasta 4) y qué tanto los cubren
export function dominantColors(d, idxs) {
  const buckets = new Map();
  let total = 0;
  for (const i of idxs) {
    if (d[i + 3] < 24) continue;
    total++;
    const k = (d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4);
    const b = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; buckets.set(k, b);
  }
  const list = [];
  for (const b of [...buckets.values()].sort((a, z) => z.n - a.n)) {
    const c = { r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, n: b.n };
    const same = list.find(x => Math.hypot(x.r - c.r, x.g - c.g, x.b - c.b) < 34);
    if (same) { const n = same.n + c.n; same.r = (same.r * same.n + c.r * c.n) / n; same.g = (same.g * same.n + c.g * c.n) / n; same.b = (same.b * same.n + c.b * c.n) / n; same.n = n; }
    else if (list.length < 4) list.push(c);
  }
  const elegidos = list.filter(c => total && c.n / total >= 0.06).map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), n: c.n }));
  const cobertura = total ? elegidos.reduce((s, c) => s + c.n, 0) / total : 0;
  return { bgs: elegidos, cobertura };
}

// Colores del fondo según el borde de la imagen
export function borderColors(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const idx = [], step = Math.max(1, Math.floor((w + h) / 600));
  for (let k = 0; k < 3; k++) {          // 3 píxeles de grueso: tolera bordes con ruido de JPG
    for (let x = 0; x < w; x += step) idx.push((k * w + x) * 4, ((h - 1 - k) * w + x) * 4);
    for (let y = 0; y < h; y += step) idx.push((y * w + k) * 4, (y * w + (w - 1 - k)) * 4);
  }
  return dominantColors(d, idx);
}

// Máscara por color: borra el fondo pegado a los bordes y, si huecos = true,
// también el fondo encerrado (el centro de la «O», «A», «D»…).
export function colorMask(canvas, bgs, sens = 30, { huecos = true } = {}) {
  const { width: w, height: h } = canvas, N = w * h;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const A = new Uint8ClampedArray(N).fill(255);
  if (!bgs || !bgs.length) return A;
  const T = 6 + sens * 2.2, F = T * 1.7;
  const dm = new Float32Array(N);
  for (let p = 0; p < N; p++) dm[p] = d[p * 4 + 3] < 24 ? 0 : near(d, p * 4, bgs);
  const seen = new Uint8Array(N), q = new Int32Array(N);
  // Relleno: avanza solo por píxeles claramente de fondo; los del contorno quedan semitransparentes
  const flood = (seeds) => {
    let qh = 0, qt = 0;
    for (const p of seeds) if (!seen[p] && dm[p] <= F) { seen[p] = 1; q[qt++] = p; }
    while (qh < qt) {
      const p = q[qh++];
      A[p] = dm[p] <= T ? 0 : Math.round((dm[p] - T) / (F - T) * 255);
      if (dm[p] > T) continue;
      const x = p % w;
      if (x > 0 && !seen[p - 1] && dm[p - 1] <= F) { seen[p - 1] = 1; q[qt++] = p - 1; }
      if (x < w - 1 && !seen[p + 1] && dm[p + 1] <= F) { seen[p + 1] = 1; q[qt++] = p + 1; }
      if (p >= w && !seen[p - w] && dm[p - w] <= F) { seen[p - w] = 1; q[qt++] = p - w; }
      if (p < N - w && !seen[p + w] && dm[p + w] <= F) { seen[p + w] = 1; q[qt++] = p + w; }
    }
  };
  const borde = [];
  for (let x = 0; x < w; x++) borde.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) borde.push(y * w, y * w + w - 1);
  flood(borde);
  if (huecos) {
    // Zonas encerradas del mismo color que el fondo (tolerancia más estricta)
    const Th = T * 0.75, minimo = Math.max(12, N * 0.00003);
    const lab = new Uint8Array(N), comp = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (seen[s] || lab[s] || dm[s] > Th) continue;
      let qh = 0, qt = 0; comp[qt++] = s; lab[s] = 1;
      while (qh < qt) {
        const p = comp[qh++], x = p % w;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w];
        for (const n of nb) if (n >= 0 && n < N && !lab[n] && !seen[n] && dm[n] <= Th) { lab[n] = 1; comp[qt++] = n; }
      }
      if (qt >= minimo) flood(comp.subarray(0, qt));
    }
  }
  return A;
}

// ---------- IA (U²-Net-p, licencia Apache 2.0, 4.6 MB, corre en el navegador) ----------
const ORT_DIR = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
const MODELO = new URL("./modelos/u2netp.onnx", import.meta.url).href;
let _ia = null;
export function aiLoad() {
  if (!_ia) _ia = (async () => {
    const ort = await import(ORT_DIR + "ort.wasm.min.mjs");
    ort.env.wasm.wasmPaths = ORT_DIR;
    const sess = await ort.InferenceSession.create(MODELO, { executionProviders: ["wasm"] });
    return { ort, sess };
  })().catch(e => { _ia = null; throw e; });
  return _ia;
}
// Devuelve la probabilidad de "objeto principal" (0–255) por píxel, al tamaño del lienzo
export async function aiMask(canvas) {
  const { ort, sess } = await aiLoad();
  const S = 320, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, S, S);
  x.drawImage(canvas, 0, 0, S, S);
  const d = x.getImageData(0, 0, S, S).data, f = new Float32Array(3 * S * S);
  const m = [0.485, 0.456, 0.406], s = [0.229, 0.224, 0.225];
  let mx = 1; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i], d[i + 1], d[i + 2]);
  for (let p = 0; p < S * S; p++) for (let k = 0; k < 3; k++) f[k * S * S + p] = (d[p * 4 + k] / mx - m[k]) / s[k];
  const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor("float32", f, [1, 3, S, S]) });
  const o = out[sess.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity; for (const v of o) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const mk = document.createElement("canvas"); mk.width = mk.height = S;
  const id = mk.getContext("2d").createImageData(S, S);
  for (let p = 0; p < S * S; p++) { id.data[p * 4 + 3] = Math.round((o[p] - lo) / (hi - lo || 1) * 255); }
  mk.getContext("2d").putImageData(id, 0, 0);
  const big = document.createElement("canvas"); big.width = canvas.width; big.height = canvas.height;
  const bx = big.getContext("2d"); bx.imageSmoothingQuality = "high"; bx.drawImage(mk, 0, 0, big.width, big.height);
  const bd = bx.getImageData(0, 0, big.width, big.height).data, M = new Uint8ClampedArray(big.width * big.height);
  for (let p = 0; p < M.length; p++) M[p] = bd[p * 4 + 3];
  return M;
}
// Combina la IA con el color: la IA dice qué es fondo; si ese fondo es de pocos
// colores, el corte se hace por color (bordes nítidos). Si es una foto, se usa la IA.
export function aiAlpha(canvas, M, sens = 30, { huecos = true } = {}) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const idx = [], step = Math.max(1, Math.floor(Math.sqrt(w * h / 40000)));
  for (let p = 0; p < w * h; p += step) if (M[p] < 25) idx.push(p * 4);
  const dc = dominantColors(d, idx);
  if (idx.length > 50 && dc.cobertura >= 0.8) return { alpha: colorMask(canvas, dc.bgs, sens, { huecos }), bgs: dc.bgs, porColor: true };
  const lo = 30 + sens * 1.2, hi = lo + 110, A = new Uint8ClampedArray(w * h);
  for (let p = 0; p < A.length; p++) A[p] = Math.max(0, Math.min(255, (M[p] - lo) / (hi - lo) * 255));
  return { alpha: A, bgs: null, porColor: false };
}

// Varita: borra el color que se tocó (zona conectada o en toda la imagen)
export function wand(canvas, A, px, py, sens = 30, { global = false } = {}) {
  const { width: w, height: h } = canvas, N = w * h;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const i0 = (py * w + px) * 4, c0 = [{ r: d[i0], g: d[i0 + 1], b: d[i0 + 2] }];
  const T = 6 + sens * 2.2, F = T * 1.7;
  const dist0 = p => near(d, p * 4, c0);
  const set = (p, dd) => { const v = dd <= T ? 0 : Math.round((dd - T) / (F - T) * 255); if (v < A[p]) A[p] = v; };
  if (global) { for (let p = 0; p < N; p++) { const dd = dist0(p); if (dd <= F) set(p, dd); } return c0[0]; }
  const seen = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
  const s = py * w + px; seen[s] = 1; q[qt++] = s;
  while (qh < qt) {
    const p = q[qh++], dd = dist0(p); set(p, dd);
    if (dd > T) continue;
    const x = p % w;
    for (const n of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) if (n >= 0 && n < N && !seen[n] && dist0(n) <= F) { seen[n] = 1; q[qt++] = n; }
  }
  return c0[0];
}

// Pincel suave: borrar (erase = true) o restaurar
export function brush(A, w, h, cx, cy, r, erase) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dd = Math.hypot(x - cx, y - cy); if (dd > r) continue;
    const f = dd < r * 0.65 ? 1 : 1 - (dd - r * 0.65) / (r * 0.35), p = y * w + x;
    if (erase) A[p] = Math.round(A[p] * (1 - f)); else A[p] = Math.max(A[p], Math.round(255 * f));
  }
}

// Aplica la máscara a la imagen. En los bordes semitransparentes quita el
// "halo" del color de fondo (para que no quede un contorno blanco o de color).
export function compose(base, A, bgs = null) {
  const { width: w, height: h } = base;
  const src = base.getContext("2d").getImageData(0, 0, w, h);
  const d = src.data;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4, a = A[p] / 255;
    if (a >= 1) continue;
    if (bgs && a > 0.02) {
      let best = bgs[0], bm = 1e9;
      for (const b of bgs) { const v = (d[i] - b.r) ** 2 + (d[i + 1] - b.g) ** 2 + (d[i + 2] - b.b) ** 2; if (v < bm) { bm = v; best = b; } }
      d[i] = (d[i] - best.r * (1 - a)) / a; d[i + 1] = (d[i + 1] - best.g * (1 - a)) / a; d[i + 2] = (d[i + 2] - best.b * (1 - a)) / a;
    }
    d[i + 3] = Math.round(d[i + 3] * a);
  }
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").putImageData(src, 0, 0);
  return c;
}

// ¿Lo que quedó visible es casi todo blanco? (se perdería sobre el recuadro blanco)
export function whiteShare(c) {
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let n = 0, claro = 0;
  for (let i = 0; i < d.length; i += 16) { if (d[i + 3] > 128) { n++; if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) claro++; } }
  return n > 0 ? claro / n : 0;
}
export function mostlyWhite(c) { return whiteShare(c) > 0.8; }
// Porcentaje de la imagen que se borró
export function removedShare(A) { let n = 0; for (let p = 0; p < A.length; p++) if (A[p] < 128) n++; return n / A.length; }

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
